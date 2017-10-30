import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/keywords-view.html!text"

import "scripts/doc-text-processor.js"

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
        this.index = -1;
        this.wordLength = 200;
        this._getKeywords();
        
        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            if(_this.data != FilterCenter.getFilteredDataByView(_this)){
                _this.data = FilterCenter.getFilteredDataByView(_this);
                _this._getKeywords();
                _this.reRender();
            }
        })  
    }

    _getKeywords() {
        var _this = this;
        this.dataID = [];

        var segmentedDocs = _.map(this.data, function(doc) {
            return doc[DataCenter.fields._SEGMENTATION]
        })
        var docTextProcessor = new DocTextProcessor();
        docTextProcessor.setDocs(segmentedDocs);

        for(var i=0; i<this.data.length; i++){
            this.dataID.push(this.data[i]._index);
        }

        this.words = docTextProcessor.getTopKeywordsByTFIDF(_this, this.dataID, this.wordLength, true);

        this.words = _.filter(this.words, function(word) {
            return word.count >= 5;
        });

        for (var i = 0; i < this.words.length; i++) {
            this.words[i]._index = i;
            this.words[i]._weight = "<div class=\"bar\"><div style=\"width:" + parseInt(this.words[i].count /this.data.length * 100) + "%;\"></div> </div> "
        }
    }

    render() {
        var _this = this;
        var table = $(this.getContainer()).find("#keywords-table");

        this.dataTable = table.DataTable({
            data: this.words,
            info: false,
            lengthchange: false,
            paging: false,
            bSortClasses: false,
            order: [[ 4, "desc" ]],
            aoColumns: [
                {data: "_index", visible: false},
                {data: "word", title: "term"},
                {data: "_weight", title: "weight", sWidth: "100px"},
                {data: "weight", visible: false},
                {data: "count", title: "docs"}
            ]
        })

        $(this.getContainer()).on("mouseenter", "tr", function() {
            $(this).addClass("hover")
        })
        $(this.getContainer()).on("mouseout", "tr", function() {
            $(this).removeClass("hover")
        })   
        $(this.getContainer()).on("dblclick", "tr", function() {
            if($(this).hasClass("active")){
                $(this).removeClass("active");
                FilterCenter.removeFilter(_this);
            }
            else{
                var name = $(this).children('td:nth-child(1)').html();
                var filteredData = [];
                _this.words.forEach(function(s){
                    if(s.word == name){
                        for(var i=0; i<s.docs.length; i++){
                            filteredData.push(_this.data[s.docs[i]])
                        }
                    }
                })
                FilterCenter.addFilter(_this, filteredData);
                $(this).addClass("active");
            }
            _this.dataTable.$('tr:eq(' + _this.index + ')').removeClass("active");
            _this.index = _this.dataTable.row(this).data()._index;
        }) 

        $(this.getContainer()).on("click", ".filter-btn", function() {
            if($(this).hasClass("active")){
                _this.dataTable.search("").draw();
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                FilterCenter.removeFilter(_this);
            }
            else {
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                $(this).addClass("active");
                var ids = _this.dataTable.rows({"filter":"applied"})[0];
                var filteredData = [];
                for (var i = 0; i < ids.length; i++) {
                    var docs = _this.words[ids[i]]["docs"]
                    for(var j=0; j<docs.length; j++){
                        filteredData.push(_this.data[docs[j]]);
                    }
                }
                console.log(ids, _this.words, filteredData);
                FilterCenter.addFilter(_this, filteredData);
            }   
        }) 
    }

    reRender(){
        this.dataTable.clear();
        this.dataTable.rows.add(this.words);
        this.dataTable.draw();
    }
}
export { KeyWordsView };

