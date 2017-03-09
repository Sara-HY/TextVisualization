import {Utils} from "../Utils.js";
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {BaseView} from './BaseView.js';
// import {SessionHelper} from "../SessionHelper.js"
import viewTemplate from "../../templates/views/document-galaxy-view.html!text"

import "d3-tip"
import "d3-tip-css!css"
import "scripts/doc-text-processor.js"

class DocumentGalaxyView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "document-galaxy-view", viewTitle, viewTemplate, layout);
        this._init();
    }

    _init() {
        var _this = this;        
        window.DocumentGalaxyView = this;
        this.spinner.spin(this.getContainer());

        this.data = DataCenter.data;
        this.filteredSet = new Set(this.data)
        this.selectedSet = new Set();

        _this._initView();         

        this.disMatrix = null;
        this.currTopicModels = null;

        var worker = new Worker("scripts/worker-tsne.js");  
        this.tsneWorker = worker;
        this.disMatrix = this._getDocDistanceMatrixByTFIDF();
        this.disMethod = "TFIDF";
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

        // PubSub.subscribe("DataCenter.TopicModel.Update", function() {
        //     var disMatrix = _this._getDocDistanceMatrixByTopic();
        //     _this.disMatrix = disMatrix;
            
        //     _this.currTopicModels = DataCenter.topicModels;
        //     worker.postMessage({"cmd":"update", "distance": disMatrix});    
        // })

        PubSub.subscribe("DocumentGalaxyView.Layout.End", async function(msg, data) {
            _this.render();
            _this.renderWords();
        });

        PubSub.subscribe("GroupCenter.Groups.Update", function() {
            _this.tip.hide();
            _this.render();
            _this.renderWords();
        })

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
            var selectedData = FilterCenter.getFilterByView(_this);
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

    }

    _initView() {
        var { width, height } = this.getViewSize();
        this.graphSize = Math.min(width, height) * 0.8;
        var x = (width - this.graphSize) / 2,
            y = (height - this.graphSize) / 2;
        this.svg = d3.select(this.getContainer()).append("svg")
            .attr("width", width)
            .attr("height", height);         
        this.wordGroup = this.svg.append("g")
            .attr("transform", "translate(" + x + "," + y + ")")
            .attr("offset-x", x)
            .attr("offset-y", y)              
        this.dotGroup = this.svg.append("g")
            .attr("transform", "translate(" + x + "," + y + ")")
            .attr("offset-x", x)
            .attr("offset-y", y)
           
        this.tip = d3.tip().attr('class', 'd3-tip graph-tip');
        this.svg.call(this.tip); 

        var drag = this._initDragPolygon();        
        this.svg.call(drag);
    }

    _initControllerGUI() {
        var _this = this;
        var datGUI = DatGUI.gui;
        var folder = this.datGUI.addFolder(this.viewTitle);
        var options =  {
            // "distance_type": "Topic Model"
            "Show Keywords": false,
            "Color Coding": "Topic",
            "Distance Type": "TF-IDF"
        }
        this.showKeywordsController = folder.add(options, "Show Keywords");

        this.showKeywordsController.onChange(function(data) {
            _this.renderWords();
        });

        this.colorCodingController = folder.add(options, 'Color Coding', [ "Topic", "HCluster", "Group" ] );

        this.colorCodingController.onChange(function(data) {
            _this.reRender();
        });        
        
        this.DatGUIController = folder.add(options, 'Distance Type', [ "TF-IDF", "Topic Model" ] );

        this.DatGUIController.onChange(function(data) {
            if (data == "TF-IDF")
                _this.changeDistanceWeight("tfidf");
            if (data == "Topic Model")
                _this.changeDistanceWeight("topic");
        });        
    }

    changeDistanceWeight(type) {
        if (type == "tfidf") {
            this.disMatrix = this._getDocDistanceMatrixByTFIDF();
            this.disMethod = "TFIdF";
        }
        else if (type == "topic") {
            this.disMatrix = this._getDocDistanceMatrixByTopic();
            this.disMethod = "topic";
        }
        this.tsneWorker.postMessage({"cmd":"update", "distance": this.disMatrix});
        // this.tsneWorker.postMessage({"cmd":"init", "distance": this.disMatrix});
    }

    render () {
        var _this = this;
        var docs = DataCenter.data;

        var minX = _.minBy(this.dotPositions, function(d) {return d[0]})[0];
        var maxX = _.maxBy(this.dotPositions, function(d) {return d[0]})[0];
        var minY = _.minBy(this.dotPositions, function(d) {return d[1]})[1];
        var maxY = _.maxBy(this.dotPositions, function(d) {return d[1]})[1];

        var width = this.graphSize, height = this.graphSize;

        this.dotPositions = _.map(this.dotPositions, function(d) {
            return [Utils.scaling(d[0], minX, maxX, 0, width), 
                    Utils.scaling(d[1], minY, maxY, 0, height)];
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
                    var dir = Utils.getTipDirection(x, y, 300, 200, width, height);
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
        var colorCodingType = this.colorCodingController.getValue();
        this.dots.each(function(d, index) {
            d3.select(this)
                .attr("fill", function() {
                    var groups = GroupCenter.groups;
                    for (var g of groups) {
                        if (g.type != colorCodingType) continue;
                        if (g.data.indexOf(index) >= 0) {
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
                .classed("not-selected", function() {
                    if (_this.selectedSet.size == 0) return false;
                    return !_this.selectedSet.has(_this.data[index]);
                })
        })
    }


    _initDragPolygon() {
        var _this = this;
        var docs = DataCenter.data;
        this.dragCoords = [];
        //reference from http://bl.ocks.org/bycoffe/5871227
        var line = d3.svg.line(),
        drag = d3.behavior.drag()
            .on("dragstart", function() {
                _this.dragCoords = [];  // Empty the coords array.
                // If a selection line already exists, remove it, and then add a new selection line.
                _this.svg.select(".polygon-selection").remove();
                _this.svg.append("path").attr({"class": "polygon-selection"});
            })
            .on("drag", function() {
                _this.dragCoords.push(d3.mouse(this));  // Store the mouse's current position
                // Change the path of the selection line to represent the area where the mouse has been dragged.
                _this.svg.select(".polygon-selection").attr({ d: line(_this.dragCoords) });

                // Figure out which dots are inside the drawn path and highlight them.
                _this.selectedDocIDs = [];
                //由于svgGroup做了居中处理，与svg的坐标系不一致，所以要纠正偏移
                var offsetX = Number(_this.dotGroup.attr("offset-x")), offsetY = Number(_this.dotGroup.attr("offset-y"));
                _this.svg.selectAll(".doc-group").each(function(d, i) {
                    var point = [ +(d3.select(this).attr("cx")) + offsetX,  +(d3.select(this).attr("cy")) +  offsetY];
                    if (Utils.isPointInPolygon(point, _this.dragCoords)) 
                        _this.selectedDocIDs.push(i);
                });
                unhighlightAll();
                highlight(_this.selectedDocIDs);
            })
            .on("dragend", function() {
                // If the user clicks without having drawn a path, remove any paths that were drawn previously.
                if (_this.dragCoords.length === 0) {
                    _this.svg.selectAll(".polygon-selection").remove();
                    unselectAll();
                    return;
                }
                // Draw a path between the first point and the last point, to close the path.
                _this.svg.append("path").attr({
                    class: "terminator",
                    d: line([_this.dragCoords[0], _this.dragCoords[_this.dragCoords.length-1]])
                });
                _this.svg.selectAll(".polygon-selection").remove();
                unhighlightAll();
                select(_this.selectedDocIDs);
            });

            // function unselectAll() {
            //     PubSub.publish("Interaction.Select.Doc", { operation: "clear", view: _this });
            // }

            // function select(docIDs) {
            //     //取反，之前被选择的则取消选择。
            //     var data = [];
            //     for (var d of docIDs) {
            //         data.push(d);
            //     }
            //     PubSub.publish("Interaction.Select.Doc", { operation: "add", data: data, view: _this })
            // }
            
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

            function unhighlightAll() {
                _this.svg.selectAll(".doc-group").classed("drag-highlight", false);
            }

            function highlight(dotsData) {
                _this.svg.selectAll(".doc-group").filter(function(d, i) {
                    return dotsData.indexOf(i) >= 0;
                })
                .classed("drag-highlight", true);
            }
        return drag;
    }


    renderWords() {
        var _this = this;
        var docs = DataCenter.data;
        var groups = GroupCenter.groups;
        var topWords = [];

        for (var group of groups) {
            if (group.data.length == 0) continue;
            var center = [0, 0];
            for (var docID of group.data) {
                center[0] += _this.dotPositions[docID][0];
                center[1] += _this.dotPositions[docID][1];
            }
            center[0] /= group.data.length;
            center[1] /= group.data.length;
            //extract top 3 words
            var words = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(group.data, 3, true)
            words = _.map(words, "word");
            topWords.push({ "words": words, "center": center, "groupID": group.id, "color": group.color});
        }

        this.wordGroup.selectAll(".cluster-text").remove();
        var wordEles = this.wordGroup.selectAll(".cluster-text")
            .data(topWords)
            .enter()
            .append("text")
            .attr("class", "cluster-text")
            .text(function(d) {
                return _.join(d.words, ", ");
            })
            .attr("x", function(d) {return d.center[0]})
            .attr("y", function(d) {return d.center[1]})
            .attr("fill", function(d, index) {
                return d.color;
            })

        this.wordGroup.selectAll(".cluster-text")
            .style("display", function(d) {
                return _this.showKeywordsController.getValue() ? "block" : "none";
            })
    }


    _getDocDistanceMatrixByTFIDF() {
        var segmentedDocs = _.map(DataCenter.data, function(doc) {
            return doc[DataCenter.fields._SEGMENTATION]
        })
        var processor = new DocTextProcessor();
        processor.setDocs(segmentedDocs);
        var matrix = processor.getCosineSimilarity();
        for (var i = 0; i < matrix.length; i++) {
            for (var j = 0; j < i; j++) {
                if (i != j) {
                    // matrix[i][j] = matrix[j][i] = 1 - Math.sqrt(Math.sqrt(matrix[i][j]));
                    matrix[i][j] = matrix[j][i] = 1 - Math.sqrt(matrix[i][j]);
                }
            }
        }
        return matrix;
    }

    _getDocDistanceMatrixByTopic() {
        var matrix = [];
        var docs = this.data;
        var model = DataCenter.topicModel;
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