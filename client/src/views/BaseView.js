import {Utils} from "../Utils.js"
import {Config} from "../Config.js"
import {DataCenter} from "../DataCenter.js"
// import {DatGUI} from "../DatGUI.js"

class BaseView {

    constructor(viewID, viewClass, viewTitle, viewTemplate, layout) {
        this.viewID = viewID;
        this.viewClass = viewClass;
        this.viewTitle = viewTitle;
        this.viewTemplate = $(Utils.wrapTemplate(viewTemplate));

        this.spinner = new Spinner();

        this.layout = JSON.parse(layout);

        // this.datGUI = DatGUI.gui;
        this._initViewFramework();
        // this._initControllerGUI();

    }

    getViewSize() {
        return {
            width: $(this.getContainer()).width(),
            height: $(this.getContainer()).height()
        }
    }

    getContainer() {
        if ($("#" + this.viewID).length == 0)
            return null;
        return $("#" + this.viewID + " .dragbox-content")[0];
    }

    getContainerID() {
        if ($("#" + this.viewID).length == 0)
            return null;
        return this.viewID + "-dragbox-content";
    }

    _initViewFramework () {
        var html = $(this.viewTemplate).find("#view-template").html();
        var tpl = swig.compile(html); 
        $("#views-wrapper").append(tpl({
            viewID: this.viewID,
            viewClass: this.viewClass,
            viewTitle: this.viewTitle,
        }));
        $("#" + this.viewID).css(this.layout);
        this._enableDraggable();
    }

    _enableDraggable() {
        var dragBoxEle = $("#" + this.viewID + " .dragbox");
        dragBoxEle.find(".header")
            .dblclick(function(){
                dragBoxEle.find('.dragbox-content').toggle("normal");
                dragBoxEle.toggleClass("dragbox-collapse");
            });
        dragBoxEle.draggable({ 
                handle: ".header",
                start: function() {
                    $(this).css("z-index", DataCenter.currentViewZIndex++);
                }
            })
            .resizable({
                start: function() {
                    $(this).css("z-index", DataCenter.currentViewZIndex++);
                }
            });          
    }    

}


export { BaseView };