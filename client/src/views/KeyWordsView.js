import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/keywords-view.html!text"

import "jquery-dataTables"
import "jquery-dataTables-css!css"

class KeyWordsView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "keywords-view", viewTitle, viewTemplate, layout);
        window.DataListView = this;
        this._init();
        this.render();
    }

    _init() {
        var _this = this;

        this.data = DataCenter.data;
        this.dataID = [];

        for(var i=0; i<this.data.length; i++){
            this.dataID.push(this.data[i]._index);
        }
        this.words = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(this.dataID, 20, false);
        for (var i = 0; i < this.words.length; i++) {
            this.words[i].docs = parseInt(_this.data.length * this.words[i].weight);
        }
        this.filterWords = this.words;
        console.log(this.words);

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            console.log("FilterCenter.Changed");
            _this.data = FilterCenter.getFilteredDataByView(_this);
            _this.dataID = [];
            for(var i=0; i<_this.data.length; i++){
                _this.dataID.push(_this.data[i]._index);
            }
            _this.filterWords = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(_this.dataID, 20, false);
            for (var i = 0; i < _this.filterWords.length; i++) {
                _this.filterWords[i].docs = parseInt(_this.data.length * _this.filterWords[i].weight);
            }
            console.log(_this.filterWords);
            _this.reRender();
        })  
    }


    render () {    
        var _this = this;
        var table = $(this.getContainer()).find("#keywords-table");

        this.dataTable = table.DataTable({
            data: this.words,
            searching: false,
            info: false,
            lengthchange: false,
            paging: false,
            columns: [
                {data: "word", title: "term"},
                {data: "weight", title: "weight"},
                {data: "docs", title: "docs"}
            ]
        })

        $(this.getContainer()).on("mouseenter", "tr", function() {
            $(this).addClass("hover")
        })
        $(this.getContainer()).on("mouseout", "tr", function() {
            $(this).removeClass("hover")
        })   
        $(this.getContainer()).on("click", "tr", function() {
            if ($(this).hasClass("active"))
                $(this).removeClass("active");
            else
                $(this).addClass("active");
        })   
    }

    reRender(){
        this.dataTable.clear();
        this.dataTable.rows.add(this.filterWords);
        this.dataTable.draw();
    }

}
export { KeyWordsView };

