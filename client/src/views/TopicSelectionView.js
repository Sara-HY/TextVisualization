import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Group} from "../Group.js"
import {Utils} from "../Utils.js"
import {Config} from "../Config.js";
import {SessionHelper} from "../SessionHelper.js"
import viewTemplate from "../../templates/views/topic-selection-view.html!text"
import "jquery-md5"
import "scripts/sankey.js"
import "scripts/rand-index-sort.js"

class TopicSelectionView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "topic-selection-view", viewTitle, viewTemplate, layout);
        window.TopicSelectionView = this;
        this._init();
    }

    _sortTopicModels(models) {
        if (models.length == 0) return;
        var model = models[0];
        var idList = [];
        var clusters = [];
        for (var topic of model.topics) {
            idList = _.union(idList, topic.belongs);
        }
        for (model of models) {
            var cluster = [];
            clusters.push(cluster);
            for (var topic of model.topics) {
                cluster.push(topic.belongs);
            }
        }
        var riSort = new RandIndexSort();
        riSort.setData(idList, clusters);
        var order = riSort.getOrder();
        console.log("topic model order", order);

        var backupModels = [];
        for (var model of models)
            backupModels.push(model);
        for (var i = 0; i < order.length; i++) {
            models[i] = backupModels[order[i]];
        }
    }

    _init() {
        var _this = this;
        this.columnWidth = 77;
        this.columnPadding = 20;
        this.rowHeight = 7;
        this.rowWidth = 15;

        this.gradientGradientDefs = {};
        this.topicModelsStack = [];  //保存每一次运行的所有TopicModels
        this.currTopicModels = null;  //当前的topic models

        PubSub.subscribe("DataCenter.TopicModel.Update", function() {
            _this.currTopicModels = DataCenter.topicModels;
            _this._sortTopicModels(DataCenter.topicModels);
            _this.topicModelsStack.push(DataCenter.topicModels);
            _this._addRunTab(DataCenter.data.length);
            if (_this.alternativeClusterGroups == null)
                _this._initView();
        })

        PubSub.subscribe("GroupCenter.Groups.Update", function() {
            _this.tip.hide();
            _this._renderSelectedScheme();
            _this._renderAlternativeSchemes();
        })

        PubSub.subscribe("DocumentGalaxyView.CreateGroup", function(msg, docIDs) {
            SessionHelper.addGroup(docIDs)
        })    

        //Interaction of highlight        
        PubSub.subscribe("Interaction.Highlight.Doc", function(msg, data) {
            // if (data.view == _this) return;
            var op = data.operation;
            var docIDs = data.data;
            if (op == "add") {
                for (var id of docIDs)
                    _this.svg.selectAll(".doc[doc-id='" + id + "']").classed("highlight", true);
            }
            if (op == "remove") {
                for (var id of docIDs) 
                    _this.svg.selectAll(".doc[doc-id='" + id + "']").classed("highlight", false);                
            }
            if (op == "clear") 
                _this.svg.selectAll(".doc").classed("highlight", false);                
                   
        })

        //Interaction of select       
        PubSub.subscribe("Interaction.Select.Doc", function(msg, data) {
            // console.log(msg, data);
            var op = data.operation;
            var docIDs = data.data;
            if (op == "add") {
                for (var id of docIDs) {
                    _this.svg.selectAll(".doc[doc-id='" + id + "']").classed("selected", true);
                }
            }
            if (op == "remove") {
                for (var id of docIDs) 
                    _this.svg.selectAll(".doc[doc-id='" + id + "']").classed("selected", false);
            }
            if (op == "clear") {
                _this.svg.selectAll(".doc").classed("selected", false);
            }
        })            

        PubSub.subscribe("DataCenter.SessionConfig.Update", function() {
            _this._renderSessionSlot();
        })
        
    }

    _initView() {
        var _this = this;
        var { width, height } = this.getViewSize();
        this.width = width - 20;
        this.height = height - 20;
        this.svg = d3.select(this.getContainer())
                    .select("div.svg-container")
                    .append("svg")
                    .attr("width", width - 20)
                    .attr("height", height - 20)
                    .attr("transform", "translate(10,10)")
                    .style("position", "absolute")
                    .style("z-index", 100)        

        this.ribbonGroup = this.svg.append("g").attr("id", "ribbon-wrapper");
        this.slotG = this.svg.append("g")
            .attr("transform", "translate(10, 10)");
        this.selectedSchemeG = this.svg.append("g")
            .attr("transform", "translate(10, 10)");     
        this.alternativeSchemeG = this.svg.append("g")
            .attr("transform", "translate(10,180)");


        this.schemeGroups = this.alternativeSchemeG
            .selectAll("g.scheme")
            .data(this.currTopicModels);
        this.schemeGroups
            .enter()
            .append("g")
            .attr("class", "scheme")
            .attr("transform", function(d, index) {
                var x = (_this.columnWidth + _this.columnPadding) * index + 10;
                var y = 0;
                d3.select(this).attr("tx", x).attr("ty", y);
                return "translate(" + x + "," + y + ")"
            })

        this._initInteraction();
        this._renderAlternativeSchemes();
    }

    _initControllerGUI() {
        // var _this = this;
        // var datGUI = DatGUI.gui;
        // var folder = this.datGUI.addFolder(this.viewTitle);
        // var options =  {
        //     sessionNumber: "7"
        // }
        // this.DatGUIController = folder.add(options, "sessionNumber");

        // this.DatGUIController.onChange(function() {
            
        // });

        // $(_this.getContainer()).find("#create-group-btn").click(function() {
        //     var selected = [];
        //     _this.svg.selectAll(".doc-group.selected").each(function() {
        //         var id = +d3.select(this).attr("doc-id");
        //         selected.push(id);
        //     })
        //     _this.svg.selectAll(".doc-group.selected").classed("selected", false);
        //     PubSub.publish("DocumentGalaxyView.CreateGroup", selected);
        // })
    }

    _initInteraction() {
        var _this = this;
        this._initTipInteraction();
        this._initDragInteraction();

        $(this.getContainer()).find("#rerun-btn").click(function() {
            _this._reRunTopicModel();
        })

        $(this.getContainer()).on("click", ".run-tab", function() {
            var runID = +$(this).attr("run-id")
            _this.currTopicModels = _this.topicModelsStack[runID];
            _this._renderAlternativeSchemes();
            _this.svg.selectAll(".parallel-line").remove();       
        })        
    }

    _initDragInteraction() {
        var _this = this;
        this.dragListener = d3.behavior.drag()
            .on("dragstart", function(d) {
                d3.select(this)
                    .attr("ori-x", d3.select(this).attr("tx"))
                    .attr("ori-y", d3.select(this).attr("ty"));
            })
            .on("drag", function(d) {
                var element = this;
                var x = +d3.select(this).attr("tx") + d3.event.dx;
                var y = +d3.select(this).attr("ty") + d3.event.dy;
                d3.select(this).attr("tx", x).attr("ty", y)
                    .attr("transform", "translate(" + x + "," + y + ")");
                var deleteBtn = $(_this.getContainer()).find("#delete-btn");
                if (_this._isInBox(element, deleteBtn[0]))
                    deleteBtn.addClass("droppable")
                else
                    deleteBtn.removeClass("droppable")

                _this.svg.selectAll("g.selected-cluster")
                    .each(function() {
                        d3.select(this).classed("droppable", function() {
                            return _this._isInBox(element, this);
                        })
                    })
            }).on("dragend", function(d) {
                updateGroup(this);
                var ele = d3.select(this);
                var x = ele.attr("ori-x"), y = ele.attr("ori-y");
                ele.attr("tx", x).attr("ty", y)
                    .attr("transform", function() {
                        return (x != null && y != null) ?
                            "translate(" + x + "," + y + ")" : null
                    })
                    .attr("ori-x", null).attr("ori-y", null)
                    .transition().duration(200);
                $(_this.getContainer()).find("#delete-btn").removeClass("droppable");
                _this.svg.selectAll("g.selected-cluster")    
                    .classed("droppable", false)

                
            });

        //drag之后更新group信息
        function updateGroup(element) {
            var docID = d3.select(element).attr("doc-id") == null ? 
                -1 : +d3.select(element).attr("doc-id");
            var groupID = d3.select(element).attr("group-id") == null ?
                -1 : +d3.select(element).attr("group-id")
            var sourceGroup = groupID >= 0 ? SessionHelper.getGroupByID(groupID) : null;
            // console.log("update group", docID, groupID)
            
            // console.log("drag group", groupID, sourceGroup, docID)
            //删除
            var deleteBtn = $(_this.getContainer()).find("#delete-btn")[0];
            if (sourceGroup != null && _this._isInBox(element, deleteBtn)) {
                if (docID >= 0) {   //删除文档
                    if (!SessionHelper.isSession(sourceGroup.id)) {  //只允许删除非Session中的文档
                        sourceGroup.removeData([docID]);
                        PubSub.publish("GroupCenter.Groups.Update");
                    }
                } else {
                    // console.log("remove buffer")
                    if (SessionHelper.isSession(sourceGroup.id)) {
                        // sourceGroup.updateData([]);
                        SessionHelper.removeSession(sourceGroup.id);
                        PubSub.publish("GroupCenter.Groups.Update");
                    } else {
                        SessionHelper.removeBuffer(sourceGroup.id);
                        PubSub.publish("GroupCenter.Groups.Update")  
                    }
                }
                return;
            }

            //移动文档
            var groupContainers = _this.svg.selectAll("g.selected-cluster")[0];
            if (SessionHelper.isSession(groupID))   //Session中的文档不允许编辑
                return;
            if (docID < 0)
                return;
            for (var i = 0; i < groupContainers.length; i++) {
                var container = groupContainers[i];
                var targetGroup = d3.select(container).datum();
                if (SessionHelper.isSession(targetGroup.id))  //Session中的文档不允许编辑
                    continue;
                if (_this._isInBox(element, container)) {
                    if (groupID != targetGroup.id) {
                        if (sourceGroup != null)   
                            sourceGroup.removeData([docID]);
                        targetGroup.addData([docID]);
                        PubSub.publish("GroupCenter.Groups.Update");
                        return;
                    }
                }
            }
        }
    }

    _initTipInteraction() {
        var _this = this;
        this.tip = d3.tip().attr('class', 'd3-tip topic-selection-tip');
        this.svg.call(this.tip); 
    }

    _showDocTip(docID) {
        var docs = DataCenter.data;
        var tpl = swig.compile($(this.viewTemplate).find("#alternative-tip-template").html());
        var text = tpl({"doc": docs[docID]});
        text = "[" + docID + "] " + text;
        this.tip.html(text).direction("e").offset([0, 10]).show();
    }

    _renderAlternativeSchemes() {
        var _this = this;
        var docs = DataCenter.data;
        var topicPositions = this._layoutTopicModelsBySankey();
        this.schemeElements = [];
        this.alternativeSchemeG
            .selectAll("g.scheme")
            .data(this.currTopicModels)        
        this.schemeGroups.each(function(scheme, index) {
            var positions = _.map(topicPositions[index], "y");
            var sortedTopics = scheme.topics;
            _this.schemeElements[index] = d3.select(this).selectAll("g.cluster")
                .data(sortedTopics)
                
            _this.schemeElements[index]
                .enter()
                .append("g")
                .attr("class", "cluster")
                .attr("id", function(d, i) {
                    return "cluster-" + index + "-" + i;
                })
            _this.schemeElements[index].exit().remove();
            _this.schemeElements[index]
                .transition().duration(500)
                .attr("transform", function(d, i) {
                    var x = 0;
                    var y = positions[i];
                    d3.select(this).attr("tx", x).attr("ty", y);
                    return "translate(" + x + "," + y + ")";
                })
                
            _this.schemeElements[index].each(function(topic, topicIndex) {
                var docEles = d3.select(this).selectAll("rect.doc")
                    .data(topic.belongs, function(docID) { return docID; })
                docEles.enter()
                    .append("rect")
                    .attr("id", function(d) { return "alternative-doc-" + index + "-" + d; })
                    .attr("class", "doc alternative-doc")
                    .attr("doc-id", function(d) { return d; })
                    .attr("scheme-id", index)
                    .attr("width", _this.rowWidth)
                    .attr("height", _this.rowHeight)  
                    .on('mouseover', function(docID) {
                        _this._showDocTip(docID);
                        _this.svg.selectAll(".parallel-line[doc-id='" + docID + "']")
                            .classed("highlight", true);
                        PubSub.publish("Interaction.Highlight.Doc", {
                            operation: "add", 
                            view: _this,
                            data: [docID]
                        });
                    })
                    .on('mouseout', function(docID) {
                        _this.tip.hide()
                        _this.svg.selectAll(".parallel-line[doc-id='" + docID + "']")
                            .classed("highlight", false);
                        PubSub.publish("Interaction.Highlight.Doc", {
                            operation: "remove", 
                            view: _this,
                            data: [docID]
                        });
                        PubSub.publish("Interaction.Highlight.Doc", {
                            operation: "clear", 
                            view: _this
                        });                        
                    })
                    .on("click", function(docID) {
                        var select = !d3.select(this).classed("selected");
                        PubSub.publish("Interaction.Select.Doc", {
                            operation: select ? "add" : "remove",
                            data: [docID],
                            view: _this
                        })
                    })
                    .call(_this.dragListener)
                docEles.exit().remove()
                docEles
                    .attr("x", _this.rowWidth / 2)
                    .attr("y", function(d, i) {
                        return i * _this.rowHeight;
                    })
                    .attr("fill", function(d, i) {
                        if (SessionHelper.sessionDocs[d] == 0)
                            return "transparent";
                        var groups = GroupCenter.getGroupsByDocID(d);
                        var colors = _.map(groups, "color");
                        if (colors.length == 1) {
                            return colors[0];
                        } else {
                            return _this._createGradientDefs(colors);    
                        }
                    })
                d3.select(this).selectAll(".cluster-handle").remove();
                d3.select(this).append("rect").datum(topic).attr("class", "cluster-handle")
                
                d3.select(this).select(".cluster-handle")
                    .attr("x", function(d) {
                        return _this.rowWidth / 2 - (Math.min(_this.rowWidth * (d.quality - 0.5) * 1.5, _this.rowWidth / 2))
                    })
                    .attr("width", function(d) {
                        return Math.min(_this.rowWidth * (d.quality - 0.5) * 1.5, _this.rowWidth / 2);
                    })
                    .attr("height", _this.rowHeight * topic.belongs.length)
                    .attr("fill", "black")
                    .attr("stroke", "black")
                    .attr("opacity", function(d) {
                        return (d.quality - 0.4) * 2;
                    })
                    .on("click", function() {
                        PubSub.publish("Interaction.Select.Doc", {
                            operation: "add",
                            data: topic.belongs,
                            view: _this
                        })
                    })
                    .on("dblclick", function() {
                        SessionHelper.addGroup(topic.belongs)
                        PubSub.publish("Interaction.Select.Doc", {
                            operation: "remove",
                            data: topic.belongs,
                            view: _this
                        })                        
                    })
                    .on('mouseover', function(topic) {
                        var belongs = topic.belongs;
                        for (var docID of topic.belongs) {
                            _this.svg.selectAll(".parallel-line[doc-id='" + docID + "']")
                                .classed("highlight", true);
                        }
                        PubSub.publish("Interaction.Highlight.Doc", {
                            operation: "add",
                            view: _this,
                            data: topic.belongs
                        });           
                    })
                    .on('mouseout', function(topic) {
                        for (var docID of topic.belongs) {
                            _this.svg.selectAll(".parallel-line[doc-id='" + docID + "']")
                                .classed("highlight", false);
                        }
                        PubSub.publish("Interaction.Highlight.Doc", {
                            operation: "remove",
                            view: _this,
                            data: topic.belongs
                        });          
                        PubSub.publish("Interaction.Highlight.Doc", {
                            operation: "clear",
                            view: _this
                        });  
                    })
                
                d3.select(this).selectAll(".topic-keyword").remove();
                // console.log(topic.words);
                // var word = topic.words.keywords[0].word;
                var words = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(topic.belongs, 1, true);
                var word = words[0].word;
                d3.select(this)
                    .append("text")
                    .attr("class", "topic-keyword")
                    .attr("transform", "translate(0, -2)")
                    .text(word)
                
            })
        })

        _.delay(function() { 
            _this.svg.selectAll(".parallel-line").remove();
            var currDocIDs = [];
            if (_this.currTopicModels.length > 0) {
                currDocIDs = _.map(_this.currTopicModels[0].docs, "id");
            }
            _this._drawRibbons(currDocIDs);
        }, 1000)
    }

    _renderSessionSlot() {
        var _this = this;
        var slotEles = this.slotG
            .selectAll("g.session-slot")
            .data(SessionHelper.sessionSlots)
        slotEles.enter()
            .append("g")
            .attr("class", "session-slot")
            .attr("transform", function(d, i) {
                var x =  i * (_this.rowWidth + _this.columnPadding);
                return "translate(" + x + ",0)";
            });
        slotEles.each(function(slotData) {
            d3.select(this).append("rect")
                .attr("rx", 3).attr("ry", 3)
                .attr("width", _this.rowWidth + 10)
                .attr("height", 60)
            for (var i = 0; i < slotData.paperNumber; i++) {
                d3.select(this).append("rect")
                    .attr("class", "doc-slot")
                    .attr("x", 5)
                    .attr("y", 5 + _this.rowHeight * i)
                    .attr("width", _this.rowWidth)
                    .attr("height", _this.rowHeight)
            }
        
        })
    }

    _renderSelectedScheme() {
        var _this = this;
        var groups = GroupCenter.groups;
        var docs = DataCenter.data;

        var sessionEles = this.selectedSchemeG
            .selectAll("g.session-cluster")
            .data(groups, function(d) { return d.id; })

        sessionEles.enter()
            .append("g")
            .attr("class", "selected-cluster session-cluster")
            .attr("group-id", function(d) { return d.id })
            .call(_this.dragListener)
        sessionEles.exit().remove();
        sessionEles.attr("transform", function(d, i) {
                var x = i * (_this.rowWidth + _this.columnPadding);
                var y = 0;
                d3.select(this).attr("tx", x).attr("ty", y);
                return "translate(" + x + "," + y + ")";
            })
        sessionEles.each(function(group) { renderDocs(this, group); })

        var bufferEles = this.selectedSchemeG
            .selectAll("g.buffer-cluster")
            .data(SessionHelper.buffers, function(d) { return d.id; })
        bufferEles.enter()
            .append("g")
            .attr("class", "selected-cluster buffer-cluster")
            .attr("group-id", function(d) { return d.id })
            .call(_this.dragListener)
        bufferEles.exit().remove();            

        bufferEles.attr("transform", function(d, i) {
                var x = (_this.width - 100) - i * (_this.rowWidth + _this.columnPadding);
                var y = 0;
                d3.select(this).attr("tx", x).attr("ty", y);
                return "translate(" + x + "," + y + ")";
            })

        bufferEles.each(function(group) {
            renderDocs(this, group);
        })


        function renderDocs(element, group) {
            var docEles = d3.select(element).selectAll("rect.selected-doc")
                .data(group.data, function(docID) { return docID; })
            if (d3.select(element).selectAll(".selected-cluster-handle")[0].length == 0) {
                d3.select(element).append("rect")
                    .attr("class", "selected-cluster-handle")
                    .attr("x", 0).attr("y", 0)
                    .attr("rx", 3).attr("ry", 3)
                    .attr("width", _this.rowWidth + 10)
                    .attr("height", 60)                
            }
            d3.select(element).select(".selected-cluster-handle")
                .attr("stroke", function() {
                    if (!SessionHelper.isSession(group.id)) {
                        return group.color;
                    }
                })
                .on("click", function() {
                    PubSub.publish("Interaction.Select.Session", {group: group})
                })
                .on("dblclick", function() {
                    if (SessionHelper.isSession(group.id)) {
                        SessionHelper.moveSessionToBuffer(group.id);
                    } else {
                        SessionHelper.moveBufferToSession(group.id);
                    }
                })
                .on("mouseover", function() {
                    PubSub.publish("Interaction.Highlight.Doc", {
                        operation: "add",
                        view: _this,
                        data: group.data
                    });                                
                })
                .on("mouseout", function() {
                    PubSub.publish("Interaction.Highlight.Doc", {
                        operation: "remove", 
                        view: _this,
                        data: group.data
                    });    
                    PubSub.publish("Interaction.Highlight.Doc", {
                        operation: "clear", 
                        view: _this,
                        data: group.data
                    });  
                })
            

            var topWords = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(group.data, 2, true);
            d3.select(element).selectAll("text.keyword").remove();
            var keywordEles = d3.select(element).selectAll("text.keyword")
                .data(topWords)
            keywordEles.enter().append("text")
                .attr("class", "keyword")
                .attr("x", 10)
                .attr("y", function(d, i) { return i * 10 + 70;})
                .attr("transform", "rotate(45 10 70)")
                .text(function(word) { return word.word; })
            keywordEles.exit().remove();

            docEles.enter()
                .append("rect")
                .attr("class", "doc selected-doc")
                .attr("doc-id", function(d) {return d;})
                .attr("group-id", group.id)
                .on("mousedown", function(d) {
                    d3.event.stopPropagation();
                })
            docEles.exit().remove()
            docEles.attr("x", 5)
                .attr("y", function(d, i) {
                    return _this.rowHeight * i + 5;
                })
                .attr("width", _this.rowWidth)
                .attr("height", _this.rowHeight)
                .attr("stroke", function() { return group.color; })
                .classed("warning", function(docID) {
                    return SessionHelper.sessionDocs[docID] > 1;
                })
                .classed("repeated", function(docID) {
                    return SessionHelper.sessionDocs[docID] > 0;
                })                
                .on('mouseover', function(docID) {
                    _this._showDocTip(docID);
                    PubSub.publish("Interaction.Highlight.Doc", {
                        operation: "add",
                        view: _this,
                        data: [docID]
                    });                        
                })
                .on('mouseout', function(docID) { 
                    _this.tip.hide(); 
                    PubSub.publish("Interaction.Highlight.Doc", {
                        operation: "remove", 
                        view: _this,
                        data: [docID]
                    });    
                    PubSub.publish("Interaction.Highlight.Doc", {
                        operation: "clear", 
                        view: _this
                    });                      
                })
                .call(_this.dragListener)
        }
    }

    _createGradientDefs(colors) {
        var _this = this;
        var id = "gradient-" + _.join(colors, "-").replace(/#/g, "");
        if (_this.gradientGradientDefs[id] != true) {
            var tpl = _.template($(_this.viewTemplate).find("#gradient-defs").html())
            var html = tpl({id: id, colors: colors});
            _this.svg.select(".defs-wrapper")
                .append("defs")
                .html(html);
        }
        return "url(#" + id + ")";
    }


    _drawRibbons(docIDs) {
        var _this = this;
        for (var docID of docIDs) {
            var data = [];
            for (var i = 0; i < this.currTopicModels.length - 1; i++) {
                var rectLeft = this.svg
                            .select("#alternative-doc-" + i + "-" + docID)[0][0];
                var rectRight = this.svg
                            .select("#alternative-doc-" + (i+1) + "-" + docID)[0][0];
                var boundLeft = rectLeft.getBoundingClientRect();
                var boundRight = rectRight.getBoundingClientRect();
                var boundWrapper = _this.svg[0][0].getBoundingClientRect();
                data.push({
                    boundLeft: boundLeft, 
                    boundRight: boundRight,
                    boundWrapper: boundWrapper
                })
            }

            var lines = _this.ribbonGroup.selectAll("line[doc-id='" + docID + "']")
                .data(data)
            lines.enter()
                .append("line")
                .attr("class", "parallel-line")
                .attr("doc-id", docID)

            lines.transition().duration(200)
                .attr("x1", function(d) {
                    return d.boundLeft.left - d.boundWrapper.left + d.boundLeft.width
                })
                .attr("y1", function(d) {
                    return d.boundLeft.top - d.boundWrapper.top + d.boundLeft.height / 2
                })
                .attr("x2", function(d) {
                    // return d.boundRight.left - d.boundWrapper.left - _this.rowWidth / 2
                    return d.boundRight.left - d.boundWrapper.left
                })
                .attr("y2", function(d) {
                    return d.boundRight.top - d.boundWrapper.top + d.boundRight.height / 2
                })   
        }
    } 

    _layoutTopicModels() {
        var models = _.map(this.currTopicModels, "topics");
        var isSelected = [];
        var sortedModels = [];
        for (var i = 0; i < models.length; i++) {
            isSelected[i] = [];
            sortedModels[i] = [];
            for (var j = 0; j < models[i].length; j++)
                isSelected[i][j] = false;
        }
        for (var iter = 0; iter < models[0].length; iter++) {
            var maxSame = -1;
            var maxModel = -1, maxTopic = -1;
            for (var i = 0; i < models.length; i++) {
                for (var j = 0; j < models[i].length; j++) {
                    var topic = models[i][j];
                    var sameCount = 0;
                    for (var p = 0; p < models.length; p++) {
                        if (p == i) continue;
                        var maxSameInModel = 0;
                        for (var q = 0; q < models[p].length; q++) {
                            if (isSelected[p][q] == true) continue;
                            var count = _.intersection(topic.belongs, models[p][q].belongs).length;
                            maxSameInModel = Math.max(count, maxSameInModel);
                        }
                        sameCount += maxSameInModel;
                    }
                    if (sameCount > maxSame) {
                        maxSame = sameCount;
                        maxModel = i;
                        maxTopic = j;
                    }
                }
            }
            var topic = models[maxModel][maxTopic];
            for (var p = 0; p < models.length; p++) {
                var maxSameInModel = -1;
                var maxSameTopic = -1;
                for (var q = 0; q < models[p].length; q++) {
                    if (isSelected[p][q] == true) continue;
                    var count = _.intersection(topic.belongs, models[p][q].belongs).length;
                    if (count > maxSameInModel || 
                        ((count == maxSameInModel) && topic.words.keywords[0].word == models[p][q].words.keywords[0].word ) ) {
                        maxSameInModel = count;
                        maxSameTopic = q;
                    }
                }
                sortedModels[p].push(models[p][maxSameTopic]);
                isSelected[p][maxSameTopic] = true;
            }
        }
        return sortedModels;
    }

    _layoutTopicModelsBySankey() {
        var models = _.map(this.currTopicModels, "topics");
        var nodesByLayer = [];
        for (var modelID = 0; modelID < models.length; modelID++) {
            var model = models[modelID];
            nodesByLayer[modelID] = [];
            var layer = nodesByLayer[modelID];
            for (var topicID = 0; topicID < model.length; topicID++) {
                var topic = model[topicID];
                // console.log("model.topic", model, topic)
                layer[topicID] = {
                    dy: topic.belongs.length * this.rowHeight,
                    lefts: [],
                    rights: [],
                    data: topic.belongs
                }
            }
        }
        for (var i = 0; i < models.length; i++) {
            var nodes = nodesByLayer[i];
            var nodesLeft = [], nodesRight = [];
            if (i > 0)
                nodesLeft = nodesByLayer[i - 1];
            if (i < models.length - 1)
                nodesRight = nodesByLayer[i + 1];
            for (var node of nodes) {
                for (var id of node.data) {
                    for (var leftNode of nodesLeft) {
                        if (leftNode.data.indexOf(id) >= 0) {
                            node.lefts.push(leftNode);
                            break;
                        }
                    }
                    for (var rightNode of nodesRight) {
                        if (rightNode.data.indexOf(id) >= 0) {
                            node.rights.push(rightNode);
                            break;
                        }
                    }
                }
            }
        }

        var { width, height } = this.getViewSize();
        var sankey = new Sankey();
        sankey.nodePadding(this.rowHeight * 5)
            .height(height * 0.7)
            .nodesByLayer(nodesByLayer)
            .layout(30);
        return nodesByLayer;
    }

    _isInBox(element, container) {
        var ePos = element.getBoundingClientRect();
        var cPos = container.getBoundingClientRect();
        return (ePos.left >= cPos.left && 
                        ePos.top >= cPos.top &&
                        ePos.left <= cPos.left + cPos.width &&
                        ePos.top <= cPos.top + cPos.height )
    }    

    async _fakeReRunTopicModel(k, runMd5) {
        var _this = this;
        this.spinner.spin(this.getContainer());
        var models = [];
        for (var run = 0; run < Config.modelNumber; run++) {
            var topicModelK = k;
            var runID = run + "_" + runMd5;
            var model = await DataCenter.getTopicModel(topicModelK, runID);
            models.push(model);
        }
        this._sortTopicModels(models);
        this.currTopicModels = models;
        this.topicModelsStack.push(models);
        this.spinner.stop();
        this._renderAlternativeSchemes();
        this.svg.selectAll(".parallel-line").remove();        
        this._addRunTab(leftDocIDs.length);        
    }

    async _reRunTopicModel() {
        var _this = this;
        this.spinner.spin(this.getContainer());
        var docs = DataCenter.data;
        var leftDocIDs = [];
        var models = [];
        for (var i = 0; i < docs.length; i++) {
            if (SessionHelper.sessionDocs[i] > 0)
                continue;
             leftDocIDs.push(i);
        }
        for (var run = 0; run < Config.modelNumber; run++) {
            var topicModelK = Math.ceil(leftDocIDs.length / 5);
            // var runID = new Date().getTime() + Utils.randomString(8);
            var runID = run + "_" + $.md5(leftDocIDs.join("_"));
            var model = await DataCenter.getTopicModel(topicModelK, runID, leftDocIDs);
            models.push(model);
        }
        this._sortTopicModels(models);
        this.currTopicModels = models;
        this.topicModelsStack.push(models);
        this.spinner.stop();
        this._renderAlternativeSchemes();
        this.svg.selectAll(".parallel-line").remove();        
        this._addRunTab(leftDocIDs.length);
    }

    _addRunTab(available) {
        var wrapper = $(this.getContainer()).find(".run-stack");
        var tpl = swig.compile($(this.viewTemplate).find("#run-tab-template").html());
        var text = tpl({
            runID: this.topicModelsStack.length,
            available: available, 
            total: DataCenter.data.length});
        wrapper.append(text);
    }

}

export { TopicSelectionView };