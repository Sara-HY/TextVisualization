import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/topic-matrix-view.html!text"

import "d3-tip"
import "d3-tip-css!css"

class TopicMatrixView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "topic-matrix-view", viewTitle, viewTemplate, layout);
        window.TopicMatrixView = this;
        this._init();
    }

    _init() {
        var _this = this;
        this.topicModel = null;
        this.topic = null;
        this.matrix = null;

        this.colorSchemeSize = 20;
        this.colorScheme = d3.scale.linear()
            .domain([0, this.colorSchemeSize-1])
            .range(["#f6faaa", "#9E0142"])
            .interpolate(d3.interpolateHcl);  

        this._initView();

        PubSub.subscribe("DataCenter.TopicModel.Update", function() {
            _this.topicModel = DataCenter.topicModel;
        })

        PubSub.subscribe("Interaction.Focus.Topic", function(msg, data) {
            var groupID = data.data;
            var topic = _this.topicModel.getTopicByGroupID(groupID);
            _this.topic = topic;
            console.log("focus", groupID, _this.topic);
            _this._processData();
            _this.render();
        });

        $(this.getContainer()).on("click", "#reorder-btn", function() {
            var text = $(this).text();
            if (text == "Reorder") {
                _this._reorder();
                _this.render();
                $(this).text("Revert");
            } else if (text == "Revert") {
                _this._processData();
                _this.render();
                $(this).text("Reorder");
            }
        })
        
    }

    _initView() {  
        this.tip = d3.tip().attr('class', 'd3-tip');
        this.svg = d3.select(this.getContainer()).append("svg");
        this.svg.call(this.tip);
        this.svg.call(this._initDrag());

        this.documentsGroupOffset = [10, 80];

        this.svgGroup = this.svg.append("g");
        this.matrixGroup = this.svgGroup.append("g")
            .attr("transform", "translate(50, 80)");
        this.keywordsGroup = this.svgGroup.append("g")
            .attr("transform", "translate(50, 80)");
        this.documentsGroup = this.svgGroup.append("g")
            .attr("transform", "translate(10, 80)");
    }

    _processData() {
        var docs = DataCenter.data;
        var keywords = _.take(this.topic.words.keywords, 25);
        var documents = this.topic.belongs;
        var matrix = {
            data: [],
            rows: [],  //documents
            columns: []   //words
        };
        this.matrix = matrix;
        for (var doc of documents)
            matrix.rows.push(doc);
        for (var word of keywords)
            matrix.columns.push(word);
        for (var i = 0; i < documents.length; i++)
            matrix.data[i] = [];        
        for (var i = 0; i < documents.length; i++) {
            for (var j = 0; j < keywords.length; j++) {
                var doc = docs[documents[i]];
                var docSeg = doc[DataCenter.fields._SEGMENTATION];
                var word = keywords[j].word;
                var re = new RegExp(word, "g");
                var match = docSeg.match(re);
                matrix.data[i][j] = match ? match.length : 0;
            }
        }
    }

    render() {
        var _this = this;
        var barHeight = 40;
        var gridSize = 12;

        this.matrixGroup.html("")
        this.keywordsGroup.html("")
        this.documentsGroup.html("")
        

        $(this.getContainer()).find("#reorder-btn").text("Reorder");

        var matrixData = this.matrix.data;
        var matrixKeywords = this.matrix.columns;
        var matrixDocuments = this.matrix.rows;

        // console.log("matrixData", matrixData)
        // console.log("matrixKeywords", matrixKeywords)
        // console.log("matrixDocuments", matrixDocuments)
        // 
        var maxCount = 0;
        for (var i = 0; i < matrixData.length; i++)
            maxCount = Math.max(_.max(matrixData[i]), maxCount);

        for (var i = 0; i < matrixData.length; i++) {
            for (var j = 0; j < matrixData[0].length; j++) {
                var scaledCount = Math.round(Utils.scaling(matrixData[i][j], 0, maxCount, 0, this.colorSchemeSize, 'sqrt'));
                // console.log(scaledCount, matrixData[i][j], maxCount);
                this.matrixGroup.append("rect")
                    .attr("x", j * (gridSize+1) )
                    .attr("y", i * (gridSize+1))
                    .attr("width", gridSize)
                    .attr("height", gridSize)
                    .attr("count", matrixData[i][j])
                    .attr("fill", this.colorScheme(scaledCount))
                    .attr("id", "matrix-rect-" + matrixDocuments[i] + "-" + matrixKeywords[j].word)
                    .attr("word", matrixKeywords[j].word)
                    .attr("doc-id", matrixDocuments[i])
                    .on('mouseover', function(event) {
                        //设置tip
                        var tip = _this.tip;
                        var docID = +$(this).attr("doc-id");
                        var word = $(this).attr("word");
                        var count = +$(this).attr("count");
                        // console.log("docID", docID, word);
                        var text = "[" + word + "]" + DataCenter.data[docID]["title"] + "<br>Count:" + count;
                        tip.html(text).direction("s");
                        tip.show();
                    })
                    .on('mouseout', function() {
                        // PubSub.publish("Interaction.Highlight.Doc", { operation: "remove", view: _this, data: [index] });
                        // PubSub.publish("Interaction.Highlight.Doc", { operation: "clear", view: _this });
                        _this.tip.hide();
                    })
            }
        }

        for (var i = 0; i < matrixKeywords.length; i++) {
            var value = matrixKeywords[i].degree;
            var h = Utils.scaling(value, 0, 0.05, 0, barHeight)
            this.keywordsGroup.append("rect")
                .datum(matrixKeywords[i])
                .attr("class", "bar keyword-bar")
                .attr("x", i * (gridSize+1))
                .attr("y", -h - 3)
                .attr("width", gridSize)
                .attr("height", h)
                .attr("id", "matrix-keyword-bar-" + matrixKeywords[i].word);

            var x = i * (gridSize+1) + 8, y = -h;
            this.keywordsGroup.append("text")
                .datum(matrixKeywords[i])
                .attr("class", "small anti-aliasing")
                .text(function(d) {
                    return d.word
                })
                .attr("transform", "rotate(-90 " + (i*(gridSize+1)+7) + "," + (-h-3) + ") translate(" + x + ", " + y + ")")
                .attr("id", "matrix-keyword-text-" + matrixKeywords[i].word); 
        }
        for (var i = 0; i < matrixDocuments.length; i++) {
            var docID = matrixDocuments[i];
            var value = _this.topicModel.docs[docID].distribution[this.topic.id];
            var h = Utils.scaling(value, 0, 1, 0, barHeight)
            this.documentsGroup.append("rect")
                .datum(matrixDocuments[i])
                .attr("class", "bar document-bar")
                .attr("x", barHeight - h - 3)
                .attr("y", i * (gridSize + 1))
                .attr("width", h)
                .attr("height", gridSize)
                .attr("id", "matrix-document-bar-" + matrixDocuments[i])
                .attr("doc-id", matrixDocuments[i]);
        }

        // update the size of wrapper svg
        setTimeout(function() {
            var bounds = _this.svgGroup[0][0].getBoundingClientRect();
            _this.svg.style("width", bounds.width + 50);
            _this.svg.style("height", bounds.height + 50);            
        }, 200)
    }

    _initDrag() {
        var _this = this;
        var docs = DataCenter.data;
        var dragStart = [], dragEnd = [];
        var drag = d3.behavior.drag()
            .on("dragstart", function() {
                _this.documentsGroup.selectAll(".document-bar").classed("drag-selected", false);
                dragStart = d3.mouse(this);  // Empty the coords array.
                _this.svg.select(".polygon-selection").remove();
                _this.svg.append("rect")
                    .attr("class", "polygon-selection")
                    .attr("x", dragStart[0])
                    .attr("y", dragStart[1])
                    .attr("width", 0)
                    .attr("height", 0);
            })
            .on("drag", function() {
                var pos = d3.mouse(this);
                var x1 = Math.min(dragStart[0], pos[0]), x2 = Math.max(dragStart[0], pos[0]),
                    y1 = Math.min(dragStart[1], pos[1]), y2 = Math.max(dragStart[1], pos[1]);
                _this.svg.select(".polygon-selection")
                    .attr("x", x1)
                    .attr("y", y1)
                    .attr("width", x2 - x1)
                    .attr("height", y2 - y1)
                _this.documentsGroup.selectAll(".document-bar")
                    .each(function(d) {
                        if (isElementYInRange(this, y1, y2))
                            d3.select(this).classed("drag-selected", true);
                        else
                            d3.select(this).classed("drag-selected", false);
                    })
            })
            .on("dragend", function() {
                var sel = _this.documentsGroup.selectAll(".document-bar.drag-selected");
                var docIDs = [];
                sel.each(function() {
                    docIDs.push(+d3.select(this).attr("doc-id"))
                });
                var selectedData = [];
                for (var id of docIDs) {
                    selectedData.push(DataCenter.data[id]);
                }
                if (selectedData.length > 0)
                    FilterCenter.addFilter(_this, selectedData);
                else
                    FilterCenter.removeFilter(_this);
            });

        function isElementYInRange(element, y1, y2) {
            var y = +d3.select(element).attr("y") + _this.documentsGroupOffset[1];
            var h = +d3.select(element).attr("height");
            if (y < y1 || y > y2)
                return false;
            if (y + h / 2 > y2)
                return false;
            if (y + h / 2 > y1)
                return true;
            return true;
        }
        return drag;
    }    

    _reorder() {
        var matrix = this.matrix;
        var rowCount = matrix.rows.length;
        var columnCount = matrix.columns.length;
        var matrixData = matrix.data;
        var rows = matrix.rows;
        var columns = matrix.columns;

        while (true){
            var isColumnOrdered = reorderColumns();
            var isRowOrdered = reorderRows();
            console.log(isColumnOrdered, isRowOrdered)
            if (isColumnOrdered && isRowOrdered) {
                break;
            }
        }

        function reorderColumns() {
            var isOrdered = true;
            var sums = [];
            for (var i = 0; i < columnCount; i++) {
                sums.push(0);
                for (var j = 0; j < rowCount; j++) {
                    sums[i] = sums[i] + Math.pow(2, rowCount-j) * matrixData[j][i];
                }
            }
            for (var i = 0; i < columnCount; i++) {
                for (var j = i + 1; j < columnCount; j++) {
                    if (sums[i] < sums[j]) {
                        exchangeColumns(i, j);
                        isOrdered = false;
                        [sums[i], sums[j]] = [sums[j], sums[i]];
                    }
                }
            }
            return isOrdered;
        }
        function reorderRows() {
            var isOrdered = true;
            var sums = [];
            for (var i = 0; i < rowCount; i++) {
                sums.push(0);
                for (var j = 0; j < columnCount; j++) {
                    sums[i] = sums[i] + Math.pow(2, columnCount-j) * matrixData[i][j];
                }
            }
            for (var i = 0; i < columnCount; i++) {
                for (var j = i + 1; j < rowCount; j++) {
                    if (sums[i] < sums[j]) {
                        isOrdered = false;
                        exchangeRows(i, j);
                        [sums[i], sums[j]] = [sums[j], sums[i]];
                    }
                }
            }
            return isOrdered;
        }
        function exchangeRows(p, q) {
            var temp = matrixData[p];
            matrixData[p] = matrixData[q];
            matrixData[q] = temp;

            [rows[p], rows[q]] = [rows[q], rows[p]]
        }

        function exchangeColumns(p, q) {
            for (var i = 0; i < rowCount; i++) {
                [matrixData[i][p], matrixData[i][q]] = [matrixData[i][q], matrixData[i][p]]
            }
            [columns[p], columns[q]] = [columns[q], columns[p]];
        }

    }


}

export { TopicMatrixView };