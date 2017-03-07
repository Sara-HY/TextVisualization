import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {GroupCenter} from "../GroupCenter.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/group-list-view.html!text"

import "scrollTo"
import "scripts/doc-text-processor.js"

class GroupListView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "group-list-view", viewTitle, viewTemplate, layout);
        this._init();
        window.groupListView = this;
        this.render();
    }

    _init() {
        var _this = this;

        this.selectedGroupID = -1;

        this.filterGroup = GroupCenter.createGroup("Current Selection", "Filter", null);
        var all = _.map(DataCenter.data, "_index");
        this.filterGroup.updateData(all);

        PubSub.subscribe("GroupCenter.Groups.Update", function() {
            _this.render();
        })

        PubSub.subscribe("FilterCenter.Changed", function(msg, data) {
            var filteredData = FilterCenter.getFilteredDataByView(_this);
            _this.filterGroup.updateData(_.map(filteredData, "_index"));
            _this.render();
        })

        $(this.getContainer()).on("click", ".confirm-btn", function() {
            var groupID = +$(this).attr("group-id");
            var group = GroupCenter.getGroupByID(groupID);
            _this._createGroup(group.data);
            PubSub.publish("GroupCenter.Groups.Update");
        })

        $(this.getContainer()).on("click", ".delete-btn", function() {
            var groupID = +$(this).attr("group-id");
            var group = GroupCenter.getGroupByID(groupID);
            GroupCenter.removeGroups([group]);
            PubSub.publish("GroupCenter.Groups.Update");
        }) 

        $(this.getContainer()).on("click", ".edit-btn", function() {
            var modal = $(_this.getContainer()).find("#group-edit-modal").modal();
            var groupID = +$(this).attr("group-id");
            var groups = _.filter(GroupCenter.groups, function(g) {
                return g.type == "Filter" || g.type == "Group";
            });
            modal.find("#group-a").find("option").remove();
            modal.find("#group-b").find("option").remove();
            for (var group of groups) {
                var option = "<option group-id='" + group.id + "'>" 
                    + group.name + "(" + group.data.length + ")"
                    + "</option>"
                modal.find("#group-a").append(option);
                modal.find("#group-b").append(option);
            }
            var selectedOption = modal.find("#group-a").find("option[group-id=" + groupID + "]");
            if (selectedOption.length > 0)
                modal.find("#group-a").val($(selectedOption[0]).text());
            
        })   

        //编辑Group
        $(this.getContainer()).on("click", "#group-edit-modal #group-edit-ok-btn", function() {
            console.log("click");
            var modal = $(_this.getContainer()).find("#group-edit-modal").modal();
            var groupAID = +modal.find("#group-a").find("option:selected").attr("group-id");
            var groupBID = +modal.find("#group-b").find("option:selected").attr("group-id");
            var operation = modal.find("#opeartion").val();
            var groupA = GroupCenter.getGroupByID(groupAID);
            var groupB = GroupCenter.getGroupByID(groupBID);
            var data = [];
            if (operation == "∪")
                data = _.union(groupA.data, groupB.data)
            if (operation == "∩")
                data = _.intersection(groupA.data, groupB.data)
            if (operation == "-")
                data = _.difference(groupA.data, groupB.data)
            _this._createGroup(data);
            PubSub.publish("GroupCenter.Groups.Update");
            modal.modal("hide");

        })       


        //选中Group
        $(this.getContainer()).on("click", ".group-wrapper", function() {
            var groupID = +$(this).attr("group-id");
            var groupType = $(this).attr("group-type");
            if (groupType == "Filter")
                return;

            if ($(this).hasClass("active")) {
                _this.selectedGroupID = -1;
                $(_this.getContainer()).find(".group-wrapper").removeClass("active");
                FilterCenter.removeFilter(_this);
            } else {
                $(_this.getContainer()).find(".group-wrapper").removeClass("active");
                $(this).addClass("active");
                _this.selectedGroupID = groupID;
                var group = GroupCenter.getGroupByID(groupID);
                var selectedData = [];
                for (var id of group.data)
                    selectedData.push(DataCenter.data[id]);
                FilterCenter.addFilter(_this, selectedData);
            }
        })    
    }

    _createGroup(data) {
        var group = GroupCenter.createGroup(null, "Group");
        group.updateData(data);
    }

    render () {    
        var _this = this;
        var docs = DataCenter.data;

        var groups = _.filter(GroupCenter.groups, function(g) {
            return g.type == "Filter" || g.type == "Group";
        });

        $(this.getContainer()).find("#group-list").html("");
        var tpl = swig.compile($(_this.viewTemplate).find("#group-template").html());

        for (var group of groups) {
            var groupDocs = [];
            for (var docID of group.data) {
                groupDocs.push(docs[docID]);
            }
            var vectors = [];
            var topWords = DataCenter.docTextProcessor.getTopKeywordsByTFIDF(group.data, 7, true);

            var html = tpl({group: group, topWords: topWords, docs: groupDocs});
            $(_this.getContainer()).find("#group-list").append(html);
        }

        $(_this.getContainer()).find(".group-wrapper[group-id=" + this.selectedGroupID + "]")
            .addClass("active");

        // drag
        // $(_this.getContainer()).find(".group-doc").draggable({
        //     axis: "y",
        //     revert: true,
        //     revertDuration: 100 
        // });
        // $(_this.getContainer()).find(".group-docs").droppable({
        //     activeClass: "ui-state-default",
        //     hoverClass: "ui-state-hover",
        //     accept: ":not(.ui-sortable-helper)",
        //     drop: function( event, ui ) {
        //         window.drag = ui.draggable;
        //         if ($(ui.draggable).attr("group-id") == $(this).attr("group-id"))
        //             return;
        //         var oldGroupID = +$(ui.draggable).attr("group-id");
        //         var newGroupID = +$(this).attr("group-id");
        //         var docID = +$(ui.draggable).attr("doc-id");

        //         var oldGroup = GroupCenter.getGroupByID(oldGroupID);
        //         var newGroup = GroupCenter.getGroupByID(newGroupID);
        //         oldGroup.removeData([docID]);
        //         newGroup.addData([docID]);
        //         PubSub.publish("GroupCenter.Groups.Update");

        //         $(ui.draggable).attr("group-id", $(this).attr("group-id"));
        //         $(this).append(ui.draggable);
        //     }
        // })
    }


}

export { GroupListView };