import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/paper-list-view.html!text"

import jqueryShorten from "libs/jquery.shorten/jquery.shorten.js"

class PaperListView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "paper-list-view", viewTitle, viewTemplate, layout);
        this._init();
        this.render();
        window.paperListView = this;
    }

    _init() {
        var _this = this;
        //Interaction of highlight        
        PubSub.subscribe("Interaction.Highlight.Doc", function(msg, data) {
            var op = data.operation;
            var view = data.view;
            var docIDs = data.data;
            if (view == _this) return;
            if (op == "add") {
                var id = docIDs[0];
                var element = $(_this.getContainer()).find(".doc-id[doc-id=" + id + "]");
                $(_this.getContainer()).scrollTo($(element));
                // $(element).parent().find(".morelink").click();
            }
            if (op == "remove") {
                var id = docIDs[0];
                var element = $(_this.getContainer()).find(".doc-id[doc-id=" + id + "]");
                // $(element).parent().find(".less").click();
            }  
        })            
    }

    render () {    
        var _this = this;
        var docs = DataCenter.data;
        
        var mainTimeField = DataCenter.fields._MAINTIME;
        var mainTextField = DataCenter.fields._MAINTEXT;

        var table = $(this.getContainer()).find("#data-table");
        table = table.DataTable( {
            data: docs,
            pageLength: 400,
            columns: [
                // {data: mainTimeField, title: mainTimeField},
                {title: mainTextField, render(data, type, row) {
                    var tpl = swig.compile($(_this.viewTemplate).find("#paper-template").html());
                    var html = tpl({data: row})
                    return(html)
                }}
            ]
        });

        $(this.getContainer()).find(".detail-info").shorten( {showChars: 600});
        // table.on("page", function() {
        //     setTimeout(function() {
        //         $(_this.getContainer()).find(".abstract").shorten( {showChars: 300});
        //     }, 100)
        // })

        $(this.getContainer()).on("mouseover", "tr", function() {
            $(this).addClass("hover")
            var docID = +$(this).find(".doc-id").attr("doc-id")
            PubSub.publish("Interaction.Highlight.Doc", {
                view: _this,
                operation: "add",
                data: [docID]
            })
        })
        $(this.getContainer()).on("mouseleave", "tr", function() {
            $(this).removeClass("hover")
            var docID = +$(this).find(".doc-id").attr("doc-id")
            PubSub.publish("Interaction.Highlight.Doc", {
                view: _this,
                operation: "remove",
                data: [docID]
            })
            PubSub.publish("Interaction.Highlight.Doc", {
                view: _this,
                operation: "clear"
            })      
        })   
        $(this.getContainer()).on("click", "tr", function() {
            if ($(this).hasClass("active"))
                $(this).removeClass("active");
            else
                $(this).addClass("active");
        })  

        setTimeout(function() {
            $(_this.getContainer()).find("#data-table_length").remove();
            $(_this.getContainer()).find("#data-table_paginate").remove();
            $(_this.getContainer()).find("#data-table thead").remove();
        }, 200)        
    }
}

export { PaperListView };