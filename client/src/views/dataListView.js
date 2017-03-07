import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/data-list-view.html!text"

import "jquery-dataTables"
import "jquery-dataTables-css!css"

class DataListView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "data-list-view", viewTitle, viewTemplate, layout);
        window.DataListView = this;
        this._init();
        this.render();
    }

    _init() {
        var _this = this;

        this.data = DataCenter.data;
        this.filteredData = this.data;

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            _this.filteredData = FilterCenter.getFilteredDataByView(_this);
            _this.reRender();
        })       

        $(this.getContainer()).on("click", "#filter-btn", function() {
            var ids = _this.dataTable.rows({"filter":"applied"})[0];
            var selectedData = [];
            for (var i = 0; i < ids.length; i++) {
                selectedData.push(DataCenter.data[ids[i]]);
            }
            FilterCenter.addFilter(_this, selectedData);           
        })

        $(this.getContainer()).on("click", "#clear-btn", function() {
            _this.dataTable.search("").draw();
            FilterCenter.removeFilter(_this);
        })
    }

    render () {    
        var _this = this;
        var table = $(this.getContainer()).find("#data-table");

        var mainTimeField = DataCenter.fields._MAINTIME;
        var mainTextField = DataCenter.fields._MAINTEXT;

        this.dataTable = table.DataTable({
            data: this.data,
            pageLength: 100,
            columns: [
                // {data: mainTimeField, title: mainTimeField},
                {data: mainTextField, title: mainTextField}
            ]
        });

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

    reRender() {
        this.dataTable.clear();
        this.dataTable.rows.add(this.filteredData);
        this.dataTable.draw();
    }
}



export { DataListView };