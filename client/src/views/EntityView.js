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
        this._processData();
        this.render();

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
             // console.log("FilterCenter.Changed");
            _this.data = FilterCenter.getFilteredDataByView(_this);
            _this._processData();
            // console.log(_this.filterEntity);
            _this.reRender();
        })  
    }

    _processData(){
        var _this = this;
        this.wordLength = 50;

        var entityMap = {};
        this.entity = [];
        for(var doc of this.data) {
            var ners = doc["_ner"];
            for(var entityType in ners) {
                for(var name of ners[entityType]){
                    if(!(name in entityMap)){
                        entityMap[name] = {
                            "name": name,
                            "docs": 1
                        }
                        this.entity.push(entityMap[name]);
                    }
                    else{
                        entityMap[name]["docs"]++;
                    }
                }
            }
        }
        this.entity.sort(function(a, b){
            return b["docs"] - a["docs"];
        })

        for(var i = 0; i < this.entity.length; i++) {
            this.entity[i]._weight = "<div class=\"bar\"><div style=\"width:" + parseInt(this.entity[i].docs / this.entity.length * 100) + "%;\"></div> </div> "
        }
        this.filterEntity = this.entity;
        // console.log(this.filterEntity);
    }

    render () {
        var _this = this;
        var table = $(this.getContainer()).find("#entity-table");

        this.dataTable = table.DataTable({
            data: this.entity,
            info: false,
            lengthchange: false,
            paging: false,
            order: [[ 2, "desc" ]],
            aoColumns: [
                {data: "name", title: "entity"},
                {data: "_weight", title: "weight", sWidth: "100px"},
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
        this.dataTable.rows.add(this.filterEntity);
        this.dataTable.draw();
    }

}
export { EntityView };

