import {Utils} from "../Utils.js";
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {BaseView} from './BaseView.js';
// import {SessionHelper} from "../SessionHelper.js"
import viewTemplate from "../../templates/views/document-galaxy-view.html!text"

import "d3-tip"
import "d3-tip-css!css"
import "jquery-ui"
import "jRange"
import "jRange-css!css"
import "scrollTo"
import "scripts/doc-text-processor.js"

class DocumentGalaxyView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "document-galaxy-view", viewTitle, viewTemplate, layout);
        this._init();
    }

    async _init() {
        var _this = this;        
        window.DocumentGalaxyView = this;
        this.spinner.spin(this.getContainer());

        this.data = DataCenter.data;
        this.filteredSet = new Set(this.data)
        this.selectedSet = new Set();

        _this._initView();  

        this.translateX = 0;
        this.translateY = 0;
        this.scale = 1;
        this.disMatrix = null;
        this.topicNum = 5;
        this.keywordNum = 3;
        this.colorType = "normal";

        var worker = new Worker("scripts/worker-tsne.js");  
        this.tsneWorker = worker;
        //default distance is topic
        this.disMatrix = await this._getDocDistanceMatrixByTopic();
        this.disMethod = "topic";
        //default distance is tfidf
        // this.disMatrix = this._getDocDistanceMatrixByTFIDF();
        // this.disMethod = "TFIDF";

        worker.postMessage({"cmd":"init", "distance": this.disMatrix});
        worker.onmessage = async function(event) {
            var data = event.data;
            if (data.message == "running") {
                _this.dotPositions = data.positions;
                _this.render();
            }
            if (data.message == "end") {
                _this.spinner.stop();
                PubSub.publish("DocumentGalaxyView.Layout.End", {
                    "method": _this.disMethod,
                    "positions": _this.dotPositions
                });
            }
        }

        PubSub.subscribe("DocumentGalaxyView.Layout.End", async function(msg, data) {
            _this.render();
            _this.renderWords();
        });

        PubSub.subscribe("GroupCenter.Groups.Update", function() {
            _this.tip.hide();
            _this.render();
            _this.renderWords();
        })

        // PubSub.subscribe("DataCenter.TopicModel.Update", function() {
        //     var disMatrix = _this._getDocDistanceMatrixByTopic();
        //     _this.disMatrix = disMatrix;
            
        //     _this.currTopicModels = DataCenter.topicModels;
        //     worker.postMessage({"cmd":"update", "distance": _this.disMatrix});
        // })

        //Interaction of highlight        
        PubSub.subscribe("Interaction.Highlight.Doc", function(msg, data) {
            var op = data.operation;
            var docIDs = data.data;
            if (op == "add") {
                for (var id of docIDs)
                    _this.svg.select(".doc-group[doc-id='" + id + "']").classed("highlight", true);
            }
            if (op == "remove") {
                for (var id of docIDs) 
                    _this.svg.select(".doc-group[doc-id='" + id + "']").classed("highlight", false);              
            }
            if (op == "clear") {
                _this.svg.selectAll(".doc-group").classed("highlight", false);         
            }            
        })

        //Interaction of select       
        PubSub.subscribe("Interaction.Select.Doc", function(msg, data) {
            // console.log(msg, data)
            var op = data.operation;
            var docIDs = data.data;
            if (op == "add") {
                for (var id of docIDs)
                    _this.svg.select(".doc-group[doc-id='" + id + "']").classed("selected", true);
            }
            if (op == "remove") {
                for (var id of docIDs) 
                    _this.svg.select(".doc-group[doc-id='" + id + "']").classed("selected", false);
            }
            if (op == "clear") {
                _this.svg.selectAll(".doc-group").classed("selected", false);
            }
        })      

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            var filteredData = FilterCenter.getFilteredDataByView(_this);
            var selectedData = filteredData;
        
            if(filteredData.length != _this.data.length)
                $(_this.getContainer()).find("#data-num").html(filteredData.length + " Out of " + _this.data.length);
            else
                $(_this.getContainer()).find("#data-num").html("0 Out of " + _this.data.length);
            _this.filteredSet = new Set(filteredData);
            _this.selectedSet = new Set(selectedData);
            _this.reRender();
        })

        // $(_this.getContainer()).find("#create-group-btn").click(function() {
        //     var selected = [];
        //     _this.svg.selectAll(".doc-group.selected").each(function() {
        //         var id = +d3.select(this).attr("doc-id");
        //         selected.push(id);
        //     })
        //     PubSub.publish("Interaction.Select.Doc", {
        //         operation: "clear",
        //         view: _this
        //     })
        //     // _this.svg.selectAll(".doc-group.selected").classed("selected", false);
        //     PubSub.publish("DocumentGalaxyView.CreateGroup", selected);
        // })
        $(_this.getContainer()).find("#topic-slider").jRange({
            from: 0,
            to: 10,
            step: 1,
            scale: [0,5,10],
            format: '%s',
            theme: 'theme-blue',
            width: 500,
            showLabels: true,
            showScale: true
        });

        $(_this.getContainer()).find("#keywords-slider").jRange({
            from: 0,
            to: 10,
            step: 1,
            scale: [0,5,10],
            format: '%s',
            theme: 'theme-blue',
            width: 500,
            value: _this.keywordNum,
            showLabels: true,
            showScale: true
        });

        $(_this.getContainer()).find("#config-btn").click(function(){
            $(_this.getContainer()).find("#topic-slider").jRange('setValue',  _this.topicNum.toString());
            $(_this.getContainer()).find("#keywords-slider").jRange('setValue', _this.keywordNum.toString());
            $(_this.getContainer()).find("#topic-keywords-modal").modal();
        })

        $(_this.getContainer()).find("#brush-btn").click(function(){
            console.log("brush");
            _this.svg.on(".zoom", null);
            _this.svg.attr("cursor", "crosshair").call(_this.brush);
        })

        $(_this.getContainer()).find("#drag-btn").click(function(){
            console.log("drag");
            _this.svg.on(".brush", null);
            $(_this.getContainer()).find(".brush").css("pointer-events", "none");
            _this.svg.attr("cursor", "pointer").call(_this.drag).on('dblclick.zoom', null);
        })

        $(_this.getContainer()).find("#topic-btn").click(function(){
            if(_this.colorType != "topic"){
                _this.colorType = "topic"
                _this.reRender();
            }
            PubSub.publish("ColorTypeChanged", "topic");
        })

        $(_this.getContainer()).find("#normal-btn").click(function(){
            if(_this.colorType != "normal"){
                _this.colorType = "normal"
                _this.reRender();
            }
            PubSub.publish("ColorTypeChanged", "normal");
        })

        $(_this.getContainer()).on("click", "#topic-keywords-modal #config-ok-btn", async function(){
            var topicNum = $(_this.getContainer()).find("#topic-slider").val(),
                keywordNum = $(_this.getContainer()).find("#keywords-slider").val();

            $(_this.getContainer()).find("#topic-keywords-modal").modal("hide");

            if(topicNum != _this.topicNum){
                _this.topicNum = topicNum;
                _this.keywordNum = keywordNum;
                _this.spinner.spin(_this.getContainer());
                _this.wordGroup.selectAll(".cluster-text")
                    .style("display", "none");

                _this.disMatrix= await _this._getDocDistanceMatrixByTopic();
                
                _this.tsneWorker.postMessage({"cmd":"update", "distance": _this.disMatrix});
                worker.onmessage = async function(event) {
                    var data = event.data;
                    if (data.message == "running") {
                        _this.dotPositions = data.positions;
                        _this.render();
                    }
                    if (data.message == "end") {
                        _this.spinner.stop();
                        PubSub.publish("DocumentGalaxyView.Layout.End", {
                            "method": _this.disMethod,
                            "positions": _this.dotPositions
                        });
                    }
                }
            }
            else if(keywordNum != _this.keywordNum){
                _this.keywordNum = keywordNum;
                _this.renderWords();
            }
        })
    }

    _initView() {
        var _this = this;
        var { width, height } = this.getViewSize();
        var margin = {top: 30, right: 30, bottom: 30, left: 30};

        $(this.getContainer()).find("#data-num").html("0 Out of " + this.data.length);

        this.graphWidth = width - margin.left - margin.right;
        this.graphHeight = height - margin.top - margin.bottom;

        // this.graphSize = Math.min(width, height) * 0.8;
        // var x = (width - this.graphSize) / 2,
        //     y = (height - this.graphSize) / 2;
        this.svg = d3.select("#galaxy-svg").append("svg")
            .attr("width", width)
            .attr("height", height)

        this.wordGroup = this.svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("offset-x", margin.left)
            .attr("offset-y", margin.top)              
        this.dotGroup = this.svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("offset-x", margin.left)
            .attr("offset-y", margin.top)
           
        this.tip = d3.tip().attr('class', 'd3-tip').offset([-10, 0]);
        this.svg.call(this.tip); 

        // var drag = this._initDragPolygon();        
        // this.svg.call(drag);

        // rect brush
        this.brush = this._initBrush()

        this.drag = d3.behavior.zoom()
            .on("zoom", function(){ 
                _this.svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + _this.scale + ")")
            })

        this.svg.append("g")
            .attr("class", "brush")
            .call(this.brush)

        $(_this.getContainer()).on("click", "#zoom-in", function(){
            console.log("zoom-in");
            _this.scale = ((_this.scale + 0.1) > 3) ? 3 : (_this.scale + 0.1);
            _this.translateY = (height - (height * _this.scale))/ 2,
            _this.translateX = (width - (width * _this.scale))/ 2; 
            _this.svg.attr("transform", "translate(" + [_this.translateX, _this.translateY] + ")scale(" + _this.scale + ")"); 
            d3.select(".brush").select(".extent").attr("transform", "translate(" + [_this.translateX, _this.translateY] + ")");
        })

        $(_this.getContainer()).on("click", "#zoom-out", function(){
            console.log("zoom-out");
            _this.scale = ((_this.scale - 0.1) < 0.5) ? 0.5 : (_this.scale - 0.1);
            _this.translateY = (height - (height * _this.scale))/ 2,
            _this.translateX = (width - (width * _this.scale))/ 2; 
            _this.svg.attr("transform", "translate(" + [_this.translateX, _this.translateY] + ")scale(" + _this.scale + ")"); 
            d3.select(".brush").select(".extent").attr("transform", "translate(" + [_this.translateX, _this.translateY] + ")");
        })
    }

    // _initControllerGUI() {
    //     var _this = this;
    //     var datGUI = DatGUI.gui;
    //     var folder = this.datGUI.addFolder(this.viewTitle);
    //     var options =  {
    //         // "distance_type": "Topic Model"
    //         "Show Keywords": true,
    //         "Color Coding": "Topic",
    //         "Distance Type": "Topic Model"
    //     }
    //     this.showKeywordsController = folder.add(options, "Show Keywords");

    //     this.showKeywordsController.onChange(function(data) {
    //         _this.renderWords();
    //     });

    //     this.colorCodingController = folder.add(options, 'Color Coding', [ "Topic", "HCluster", "Group" ] );

    //     this.colorCodingController.onChange(function(data) {
    //         _this.reRender();
    //     });        
        
    //     this.DatGUIController = folder.add(options, 'Distance Type', ["Topic Model", "TF-IDF"] );

    //     this.DatGUIController.onChange(function(data) {
    //         if (data == "TF-IDF")
    //             _this.changeDistanceWeight("tfidf");
    //         if (data == "Topic Model")
    //             _this.changeDistanceWeight("topic");
    //     });        
    // }

    // changeDistanceWeight(type) {
    //     if (type == "tfidf") {
    //         this.disMatrix = this._getDocDistanceMatrixByTFIDF();
    //         this.disMethod = "TFIDF";
    //     }
    //     else if (type == "topic") {
    //         this.disMatrix = this._getDocDistanceMatrixByTopic();
    //         this.disMethod = "topic";
    //     }
    //     this.tsneWorker.postMessage({"cmd":"update", "distance": this.disMatrix});
    //     // this.tsneWorker.postMessage({"cmd":"init", "distance": this.disMatrix});
    // }

    render () {
        var _this = this;
        var docs = DataCenter.data;

        var minX = _.minBy(this.dotPositions, function(d) {return d[0]})[0];
        var maxX = _.maxBy(this.dotPositions, function(d) {return d[0]})[0];
        var minY = _.minBy(this.dotPositions, function(d) {return d[1]})[1];
        var maxY = _.maxBy(this.dotPositions, function(d) {return d[1]})[1];
        // var { width, height } = this.graphSize;

        this.dotPositions = _.map(this.dotPositions, function(d) {
            // return [Utils.scaling(d[0], minX, maxX, 0, width), 
            //         Utils.scaling(d[1], minY, maxY, 0, height)];
            return [Utils.scaling(d[0], minX, maxX, 0, _this.graphWidth), 
                    Utils.scaling(d[1], minY, maxY, 0, _this.graphHeight)];
        })

        if (this.dotGroup.selectAll("g.doc-group").size() == 0) { 
            this.dots = this.dotGroup.selectAll("g.doc-group")
                .data(this.dotPositions)
                .enter()
                .append("g")
                .attr("class", "doc-group")
                .on("mousedown", function() {
                    d3.event.stopPropagation();
                })
                // .on("click", function() {
                //     if (d3.event.defaultPrevented) return; // click suppressed
                //     var select = !d3.select(this).classed("selected");
                //     PubSub.publish("Interaction.Select.Doc", {
                //         operation: select ? "add" : "remove",
                //         view: _this,
                //         data: [+d3.select(this).attr("doc-id")]
                //     })
                // })
        }

        this.dots.data(this.dotPositions);
        this.dots
            .attr("transform", function(d) { return "translate(" + d[0] + "," + d[1] + ")" })
            .attr("doc-id", function(d, i) { return i; })
            .attr("cx", function(d) { return d[0]; })
            .attr("cy", function(d) { return d[1]; })
            
        this.dots.each(function(d, index) {
            d3.select(this)
                .html("")
                .append("circle")
                .attr("class", "doc-dot")
                .attr("r", 4)
                .on('mouseover', function() {
                    PubSub.publish("Interaction.Highlight.Doc", { operation: "add", view: _this, data: [index] });
                    if (d3.event.buttons > 0) return;

                    //设置tip
                    var x = d[0], y = d[1];
                    var tip = _this.tip;
                    var text = "[" + index + "] " + docs[index]["title"];
                    var dir = Utils.getTipDirection(x, y, 300, 200, _this.graphWidth, _this.graphHeight);
                    tip.html(text).direction("n")
                    var tipEle = d3.select(".graph-tip")
                    tipEle.classed("top", false).classed("bottom", false);
                    if (dir == 'n') tipEle.classed("top", true);
                    if (dir == 's') tipEle.classed("bottom", true);
                    tip.show();
                })
                .on('mouseout', function() {
                    PubSub.publish("Interaction.Highlight.Doc", { operation: "remove", view: _this, data: [index] });
                    PubSub.publish("Interaction.Highlight.Doc", { operation: "clear", view: _this });
                    _this.tip.hide();
                })
        })
        this.reRender();        
    }

    reRender() {
        var _this = this;
        this.dots.each(function(d, index) {
            d3.select(this)
                .attr("fill", function() {
                    if(_this.colorType == "normal")
                        return "rgba(0, 0, 0, 0.3)"
                    var groups = GroupCenter.groups;
                    for (var g of groups) {
                        if(g.type != "Topic") continue;
                        var list = g.data;
                        if (list.indexOf(index) >= 0) {
                            var color = g.color;
                            return color;
                        } 
                    }
                    return "transparent";
                })                    
                .attr("stroke", "rgba(0, 0, 0, 0.3)")
                .classed("filtered-out", function() {
                    return !_this.filteredSet.has(_this.data[index]);
                })
                .classed("selected", function(){
                    if(_this.selectedSet.size != _this.data.length && _this.selectedSet.size != 0)
                        return _this.filteredSet.has(_this.data[index])
                    else 
                        return false;
                })
                // .classed("not-selected", function() {
                //     if (_this.selectedSet.size == 0) return false;
                //     return !_this.selectedSet.has(_this.data[index]);
                // })
        })
        
        this.wordGroup.selectAll(".cluster-text")
            .attr("fill", function(d){
                if(_this.colorType == "normal")
                    return "#050505";
                return d.color;
            })
    }

    _initBrush() {
        var _this = this;
        var docs = DataCenter.data;
        var { width, height } = this.getViewSize();

        var brush = d3.svg.brush()
                .x(d3.scale.identity().domain([0, width]))
                .y(d3.scale.identity().domain([0, height]))
                .on("brush", function() {
                    _this.selectedDocIDs = [];

                    var extent = d3.event.target.extent()
                    var offsetX = Number(_this.dotGroup.attr("offset-x")), offsetY = Number(_this.dotGroup.attr("offset-y"));
                    _this.svg.selectAll(".doc-group").each(function(d, i){
                        if(((extent[0][0]-offsetX+_this.translateX)) <= d[0] && d[0] < ((extent[1][0]-offsetX+_this.translateX))
                            && ((extent[0][1]-offsetY+_this.translateY))  <= d[1] && d[1] < ((extent[1][1]-offsetY+_this.translateY))){
                            _this.selectedDocIDs.push(i);
                        }                        
                    })
                    uncolorAll();
                    color(_this.selectedDocIDs);
                })
                .on("brushend", function(){
                    $(_this.getContainer()).find("#data-num").html(_this.selectedDocIDs.length + " Out of " + _this.data.length);
                    if(_this.selectedDocIDs.length)
                        select(_this.selectedDocIDs);
                    else
                        unselectAll();
                });

            function unselectAll() {
                FilterCenter.removeFilter(_this);
            }

            function select(docIDs) {
                var selectedData = [];
                for (var id of docIDs) {
                    if (_this.filteredSet.has(docs[id]))
                        selectedData.push(docs[id]);
                }
                FilterCenter.addFilter(_this, selectedData);
            }

            function color(dotsData) {
                _this.svg.selectAll(".doc-group").filter(function(d, i){
                    return dotsData.indexOf(i) >= 0;
                })
                .classed("selected", true);
            }

            function uncolorAll() {
                _this.svg.selectAll(".doc-group").classed("selected", false);
            }

        return brush;
    }

    // _initDragPolygon() {
    //     var _this = this;
    //     var docs = DataCenter.data;
    //     this.dragCoords = [];
    //     //reference from http://bl.ocks.org/bycoffe/5871227
    //     var line = d3.svg.line(),
    //     drag = d3.behavior.drag()
    //         .on("dragstart", function() {
    //             _this.dragCoords = [];  // Empty the coords array.
    //             // If a selection line already exists, remove it, and then add a new selection line.
    //             _this.svg.select(".polygon-selection").remove();
    //             _this.svg.append("path").attr({"class": "polygon-selection"});
    //         })
    //         .on("drag", function() {
    //             _this.dragCoords.push(d3.mouse(this));  // Store the mouse's current position
    //             // Change the path of the selection line to represent the area where the mouse has been dragged.
    //             _this.svg.select(".polygon-selection").attr({ d: line(_this.dragCoords) });

    //             // Figure out which dots are inside the drawn path and highlight them.
    //             _this.selectedDocIDs = [];
    //             //由于svgGroup做了居中处理，与svg的坐标系不一致，所以要纠正偏移
    //             var offsetX = Number(_this.dotGroup.attr("offset-x")), offsetY = Number(_this.dotGroup.attr("offset-y"));
    //             _this.svg.selectAll(".doc-group").each(function(d, i) {
    //                 var point = [ +(d3.select(this).attr("cx")) + offsetX,  +(d3.select(this).attr("cy")) +  offsetY];
    //                 if (Utils.isPointInPolygon(point, _this.dragCoords)){
    //                     console.log(i);
    //                     _this.selectedDocIDs.push(i);
    //                 }
    //             });
    //             console.log(_this.selectedDocIDs);
    //             unhighlightAll();
    //             highlight(_this.selectedDocIDs);
    //         })
    //         .on("dragend", function() {
    //             // If the user clicks without having drawn a path, remove any paths that were drawn previously.
    //             if (_this.dragCoords.length === 0) {
    //                 _this.svg.selectAll(".polygon-selection").remove();
    //                 unselectAll();
    //                 return;
    //             }
    //             // Draw a path between the first point and the last point, to close the path.
    //             _this.svg.append("path").attr({
    //                 class: "terminator",
    //                 d: line([_this.dragCoords[0], _this.dragCoords[_this.dragCoords.length-1]])
    //             });
    //             _this.svg.selectAll(".polygon-selection").remove();
    //             unhighlightAll();
    //             select(_this.selectedDocIDs);
    //         });

    //         // function unselectAll() {
    //         //     PubSub.publish("Interaction.Select.Doc", { operation: "clear", view: _this });
    //         // }

    //         // function select(docIDs) {
    //         //     //取反，之前被选择的则取消选择。
    //         //     var data = [];
    //         //     for (var d of docIDs) {
    //         //         data.push(d);
    //         //     }
    //         //     PubSub.publish("Interaction.Select.Doc", { operation: "add", data: data, view: _this })
    //         // }
            
    //         function unselectAll() {
    //             FilterCenter.removeFilter(_this);
    //         }

    //         function select(docIDs) {
    //             var selectedData = [];
    //             for (var id of docIDs) {
    //                 if (_this.filteredSet.has(docs[id]))
    //                     selectedData.push(docs[id]);
    //             }
    //             FilterCenter.addFilter(_this, selectedData);
    //         }

    //         function unhighlightAll() {
    //             _this.svg.selectAll(".doc-group").classed("drag-highlight", false);
    //         }

    //         function highlight(dotsData) {
    //             _this.svg.selectAll(".doc-group").filter(function(d, i) {
    //                 return dotsData.indexOf(i) >= 0;
    //             })
    //             .classed("drag-highlight", true);
    //         }
    //     return drag;
    // }


    renderWords() {
        var _this = this;
        var docs = DataCenter.data;
        var topWords = [];
        var groups = [];
        if(_this.disMethod == "topic"){
            groups = _.filter(GroupCenter.groups, function(group) {
                return group.type == "Topic";
            });
        }else{
            groups = _.filter(GroupCenter.groups, function(group) {
                return group.type != "Topic";
            });
        }

        for (var group of groups) {
            if (group.data.length == 0) continue;
            var center = [0, 0];
            for (var docID of group.data) {
                center[0] += _this.dotPositions[docID][0];
                center[1] += _this.dotPositions[docID][1];
            }
            center[0] /= group.data.length;
            center[1] /= group.data.length;
            //extract top words
            var words = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(_this, group.data, _this.keywordNum, true);
            words = _.map(words, "word");
            // console.log(words);
            topWords.push({ "words": words, "center": center, "groupID": group.id, "color": group.color});
        }

        this.wordGroup.selectAll(".cluster-text").remove();
        
        var wordEles = this.wordGroup.selectAll(".cluster-text")
            .data(topWords)
            .enter()
            .append("text")
            .attr("class", "cluster-text")
            .text(function(d) {
                return _.join(d.words, " ");
            })
            .attr("x", function(d) {
                return (d.center[0] - (45 * _this.keywordNum) / 2) < 0 ? 0: (d.center[0] - (45 * _this.keywordNum) / 2);
            })
            .attr("y", function(d) {return d.center[1];}
            );
            // .attr("fill", function(d, index) {
            //     return d.color;
            // })

        // this.wordGroup.selectAll(".cluster-text")
        //     .style("display", function(d) {
        //         return _this.showKeywordsController.getValue() ? "block" : "none";
        //     })
        this.wordGroup.selectAll(".cluster-text")
            .style("display", "block");
    }

    async _getDocDistanceMatrixByTopic() {
        var matrix = [];
        var docs = this.data;
        var _this = this;
        var model;

        // get topic-model
        // if(DataCenter.topicModel){
        //     model = DataCenter.topicModel;
        // }
        // else{
        model = await DataCenter.getTopicModel(_this.topicNum, 0, null, null);;
        DataCenter.topicModel = model;
        model.pullToGroups();
        PubSub.publish("DataCenter.TopicModel.Update");
        
        // get distanceMatrix
        for (var i = 0; i < docs.length; i++) {
            matrix[i] = [];
            for (var j = 0; j < docs.length; j++)
                matrix[i][j] = 0;
        }
        // KL散度距离
        for (var i = 0; i < docs.length; i++) {
            for (var j = i + 1; j < docs.length; j++) {
                var dij = 0, dji = 0;
                var probs1 = model.docs[i].distribution;
                var probs2 = model.docs[j].distribution;
                for (var p = 0; p < probs1.length; p++) {
                    dij += probs1[p] * Math.log(probs1[p] / probs2[p]);
                    dji += probs2[p] * Math.log(probs2[p] / probs1[p]);
                }
                matrix[i][j] = matrix[j][i] = (dij + dji) / 2;
            }
        }
        return matrix;
    }

    // _getDocDistanceMatrixByTFIDF() {
    //     var segmentedDocs = _.map(DataCenter.data, function(doc) {
    //         return doc[DataCenter.fields._SEGMENTATION]
    //     })
    //     var processor = new DocTextProcessor();
    //     processor.setDocs(segmentedDocs);
    //     var matrix = processor.getCosineSimilarity();
    //     for (var i = 0; i < matrix.length; i++) {
    //         for (var j = 0; j < i; j++) {
    //             if (i != j) {
    //                 // matrix[i][j] = matrix[j][i] = 1 - Math.sqrt(Math.sqrt(matrix[i][j]));
    //                 matrix[i][j] = matrix[j][i] = 1 - Math.sqrt(matrix[i][j]);
    //             }
    //         }
    //     }
    //     return matrix;
    // }

}

//绘制PieChart的代码
// var pieData = [];
// for (var i = 0; i < DataCenter.topicModel.docs[index].distribution.length; i++) {
//     pieData.push({
//         prop: DataCenter.topicModel.docs[index].distribution[i],
//         color: DataCenter.topicModel.getGroupByTopicID(i).color
//     })
// }
// var pieConfig = {
//     innerRadius: 7,
//     outerRadius: 10,
//     data: pieData,
//     proportion: function(data) {
//         return data["prop"];
//     },
//     attrs: {
//         fill: function(d, i) {
//             return d.color;
//         }
//     }
// }
// Utils.createPie(this, pieConfig);
// 

export { DocumentGalaxyView };