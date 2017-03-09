import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {Utils} from "../Utils.js"
// import {SessionHelper} from "../SessionHelper.js"
import viewTemplate from "../../templates/views/word-monitor-view.html!text"

import "d3-tip"
import "d3-tip-css!css"

class WordMonitorView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "word-monitor-view", viewTitle, viewTemplate, layout);
        this._init();
        // this.render();
    }

    _init() {
        var _this = this;
        this._initView();
        this.wordsData = {};
        this.words = [];
        this.wordLineHeight = 25;
        this.currGroup = null;
        this.tip = d3.tip().attr('class', 'd3-tip word-monitor-tip');

        this.availableWords = {};
        var docs = DataCenter.data;
        for (var doc of docs) {
            var segmentation =  doc[DataCenter.fields._SEGMENTATION];
            var words = segmentation.split(" ");
            this.availableWords = _.union(this.availableWords, words);
        }
        this.availableWords = _.without(this.availableWords, "");
        this.availableWords = _.sortBy(this.availableWords);
        // console.log(this.availableWords);
        $(this.getContainer()).find("#word-input").autocomplete({
            minLength: 2,
            position: { my : "bottom", at: "top" },
            source: function(req, response) {
                // console.log("term", req.term);
                response($.grep(_this.availableWords, function(item){
                    return item.startsWith(req.term);
                }) );
            }

        });
        $(this.getContainer()).find("#add-btn").click(function() {
            var word = $(_this.getContainer()).find("#word-input").val();
            $(_this.getContainer()).find("#word-input").val("")
            _this.renderNewWord(word);
        })

        PubSub.subscribe("KeywordMonitor.Add", function(msg, data) {
            _this.renderNewWord(data.word);
        })
        PubSub.subscribe("GroupCenter.Groups.Update", function() {     
            _this.tip.hide();
            for (var word of _this.words) {
                _this.updateWord(word);
            }
        })
        PubSub.subscribe("Interaction.Highlight.Doc", function(msg, data) {
            var op = data.operation;
            var docIDs = data.data;
            if (op == "add") {
                for (var id of docIDs)
                    d3.select(_this.getContainer()).selectAll(".node[doc-id='" + id + "']").classed("highlight", true);
            }
            if (op == "remove") {
                for (var id of docIDs) 
                    d3.select(_this.getContainer()).selectAll(".node[doc-id='" + id + "']").classed("highlight", false);              
            }
            if (op == "clear") {
                d3.select(_this.getContainer()).selectAll(".node").classed("highlight", false);              
            }
        })

        //Interaction of select       
        PubSub.subscribe("Interaction.Select.Doc", function(msg, data) {
            // console.log(msg, data)
            var op = data.operation;
            var docIDs = data.data;
            if (op == "add") {
                for (var id of docIDs)
                    d3.select(_this.getContainer()).selectAll(".node[doc-id='" + id + "']").classed("selected", true);
            }
            if (op == "remove") {
                for (var id of docIDs) 
                    d3.select(_this.getContainer()).selectAll(".node[doc-id='" + id + "']").classed("selected", false);
            }
            if (op == "clear") {
                d3.select(_this.getContainer()).selectAll(".node").classed("selected", false);
            }
        })   

    
        PubSub.subscribe("Interaction.Select.Session", async function(msg, data) {
            _this.currGroup = data.group;
        });
    }

    _initView() {
        var _this = this;
        $(this.getContainer()).append("<div id='close-btn'><i class='fa fa-times'></i></div>")

        $(this.getContainer()).on("click", "#close-btn", function() {
            var word = $(this).attr("word");
            // console.log("close", word);
            _this.removeWord(word);
        })

        $(this.getContainer()).on("mouseenter", "#close-btn", function() {
            $(this).show();
        })
        $(this.getContainer()).on("mouseleave", "#close-btn", function() {
            $(this).hide();
        })        
    }

    render () {    
        var _this = this;
        var docs = DataCenter.data;
        var groups = GroupCenter.groups;
    }

    removeWord(word) {
        this.words = _.without(this.words, word);
        d3.select(this.getContainer()).select("#word-wrapper-" + word).remove();
    }

    renderNewWord(word) {
        var _this = this;
        var { width, height } = this.getViewSize();  
        if (this.words.indexOf(word) >= 0)
            return;

        var appears = this._getWordAppears(word);
        if (appears.length == 0) {
            alert("Couldn't find word!");
            return;
        }
        this.words.push(word);

        this.svg = d3.select(this.getContainer()).append("svg")
                    .attr("width", width)
                    .attr("height", _this.wordLineHeight + "px")
                    .attr("id", "word-wrapper-" + word) 
        this.svg.call(_this.tip)
        this.svg.append("text").text(word)
            .attr("x", 85)
            .attr("y", 14)
            .attr("text-anchor", "end")    
        console.log("appears", appears)

        //fake
        if (word == "spatial") {
            for (var appear of appears) {
                if (appear.docID == 22) appear.count += 3;
            }

        }

        this._renderWord(this.svg, word, appears);                       
    }

    updateWord(word) {
        var appears = this._getWordAppears(word);
        
        var svg = d3.select(this.getContainer()).select("#word-wrapper-" + word);
        svg.selectAll("g.node").remove();
        this._renderWord(svg, word, appears);
    }

    _renderWord(svg, word, appears) {
        var _this = this;
        var maxCount = appears[0].count;
        var nodes = svg.selectAll("g.node")
                        .data(appears)
                        .enter()
                        .append("g")
                        .attr("class", "node")
                        .attr("doc-id", function(d, i) {
                            return d.docID
                        })
                        .attr("word", word)
                        .attr("transform", function(d, i) {
                            return "translate(" + (120 + i * 20) + ", 10)";
                        })
                        
                        .on('mouseover', function(d, index) {
                            //设置tip
                            var tip = _this.tip;
                            var docID = d.docID; 
                            var text = "[" + docID + "] " + DataCenter.data[docID]["title"];
                            text += "<br>" + "times:" + d.count;
                            tip.html(text)
                            tip.show();
                            PubSub.publish("Interaction.Highlight.Doc", {
                                operation: "add",
                                data: [docID],
                                view: _this
                            })
                        })
                        .on('mouseout', function(d, index) {
                            _this.tip.hide();
                            var docID = d.docID; 
                            PubSub.publish("Interaction.Highlight.Doc", {
                                operation: "remove",
                                data: [docID],
                                view: _this
                            })
                            PubSub.publish("Interaction.Highlight.Doc", {
                                operation: "clear",
                                view: _this
                            })                            
                        })
                        .on("click", function(d, index) {
                            var docID = d.docID; 
                            var select = !d3.select(this).classed("selected");
                            PubSub.publish("Interaction.Select.Doc", {
                                operation: select ? "add" : "remove",
                                data: [docID],
                                view: _this
                            })
                        })
                        .on("dblclick", function(d, index) {
                            var docID = d.docID; 
                            _this.tip.hide();
                            if (_this.currGroup != null && !SessionHelper.isSession(_this.currGroup) ) {
                                _this.currGroup.addData([docID]);
                                PubSub.publish("GroupCenter.Groups.Update");
                            }
                        })
        
        nodes.each(function(data, index) {
            var pieConfig = {
                r: Utils.scaling(data.count, 0, maxCount, 3, (_this.wordLineHeight - 10) / 2),
                data: data.groups,
                attrs: {
                    fill: function(d, i) {
                        return d.color;
                    },
                    stroke: function(d, i) {
                        return d.color;
                    }
                }
            }
            Utils.createPie(this, pieConfig);
        })

        svg.on("mouseover", function() {
            window.mouseobj = this;
            var top = $(this).position().top;
            // console.log("top", top)
            $(_this.getContainer()).find("#close-btn")
                .attr("word", word)
                .css("top", top + "px")
                .show()
        })
        svg.on("mouseout", function() {
            $(_this.getContainer()).find("#close-btn").hide();
        })        
    }


    _getWordAppears(word) {
        var appears = [];
        if (word in this.wordsData) {
            appears = this.wordsData[word];
        } else {
            var docs = DataCenter.data;
            var segmentedDocs = _.map(DataCenter.data, function(doc) {
                return doc[DataCenter.fields._SEGMENTATION]
            })
            var regStr = "\\b" + word + "\\b"
            var reg = new RegExp(regStr, "gi")
            for (var docID = 0; docID < docs.length; docID++) {
                var seg = segmentedDocs[docID];
                var matches = seg.match(reg);
                var count = matches ? matches.length : 0;
                if (count > 0) {
                    appears.push({docID: docID, count: count, groups:[]});
                }
            }
            appears = _.sortBy(appears, function(o) {
                return -o.count;
            });            
            this.wordsData[word] = appears;
        }
        for (var docInfo of appears) {
            var docID = docInfo.docID;
            docInfo.groups = SessionHelper.getGroupsByDocID(docID);
        }
        return appears;
    }

}

export { WordMonitorView };