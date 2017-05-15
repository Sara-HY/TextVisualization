import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/entity-view.html!text"

import "jquery-dataTables"
import "jquery-dataTables-css!css"

class EntityView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "entity-view", viewTitle, viewTemplate, layout);
        window.DataListView = this;
        this._init(); 
    }

    _init() {
        var _this = this;

        this.data = DataCenter.data;
        this.index = -1;
        this._processData();
        this.render();

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            if(_this.data != FilterCenter.getFilteredDataByView(_this)){
                _this.data = FilterCenter.getFilteredDataByView(_this);
                _this._processData();
                _this.reRender();
            }
        }) 
    }

    _processData(){
        var _this = this;
        // this.wordLength = 50;
        var docs = this.data;
        this.entityMap = {};
        this.entity = [];
        for(var doc of docs) {
            var ners = doc["_ner"];
            for(var entityType in ners) {
                for(var name of ners[entityType]){
                    if(!(name in this.entityMap)){
                        this.entityMap[name] = {
                            "name": name,
                            "count": 1,
                            "docs":[]
                        }
                        this.entityMap[name]["docs"].push(doc);
                        this.entity.push(this.entityMap[name]);
                    }
                    else{
                        this.entityMap[name]["count"]++;
                        this.entityMap[name]["docs"].push(doc);
                    }
                }
            }
        }
        this.entity.sort(function(a, b){
            return b["count"] - a["count"];
        })

        for(var i = 0; i < this.entity.length; i++) {
            this.entity[i]._index = i;
            this.entity[i]._weight = "<div class=\"bar\"><div style=\"width:" + parseInt(this.entity[i].count / this.entity.length * 100) + "%;\"></div> </div> "
        }
        this.filterEntity = this.entity;
    }

    render() {
        var _this = this;
        var table = $(this.getContainer()).find("#entity-table");

        this.dataTable = table.DataTable({
            data: this.entity,
            info: false,
            lengthchange: false,
            paging: false,
            bSortClasses: false,
            order: [[ 3, "desc" ]],
            aoColumns: [
                {data: "_index", visible: false},
                {data: "name", title: "entity"},
                {data: "_weight", title: "weight", sWidth: "100px"},
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
                FilterCenter.addFilter(_this, _this.entityMap[name]["docs"]);
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
                var selectedData = [];
                for (var i = 0; i < ids.length; i++) {
                    selectedData = selectedData.concat(_this.entity[ids[i]]["docs"]);
                }
                FilterCenter.addFilter(_this, selectedData);
            }        
        })   
    }

    reRender(){
        this.dataTable.clear();
        this.dataTable.rows.add(this.filterEntity);
        this.dataTable.draw();
    }

}
export { EntityView };

