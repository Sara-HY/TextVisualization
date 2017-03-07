import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {FilterCenter} from "../FilterCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/topic-list-view.html!text"


class TopicListView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "topic-list-view", viewTitle, viewTemplate, layout);
        window.TopicListView = this;
        this._init();
        this._initInteraction();
    }

    _init() {
        var _this = this;
        this.labels = new Array(DataCenter.data.length);
        for (var i = 0; i < this.labels.length; i++)
            this.labels[i] = [];
        PubSub.subscribe("DataCenter.TopicModel.Update", function() {
            _this.topicModel = DataCenter.topicModel;
            // _this.renderTopic();
        })

        PubSub.subscribe("GroupCenter.Groups.Update", function() {
            _this.renderGroup();
        })        
    }

    _initInteraction() {
        var _this = this;
        $(this.getContainer()).on("click", ".topic-wrapper", function() {
            var groupID = +$(this).attr("group-id");
            var topicID = +$(this).attr("topic-id");
            console.log("groupID", groupID, "topicID", topicID);
            var groups = [ GroupCenter.getGroupByID(groupID) ]
            PubSub.publish("Interaction.Focus.Topic", {data: groupID});
        })
        $(this.getContainer()).on("click", ".topic-keywords .word", function() {
            PubSub.publish("KeywordMonitor.Add", {word: $(this).text()});
        })        
        $(this.getContainer()).on("click", ".filter-btn", function() {
            var groupID = +$(this).attr("group-id");
            if ($(this).hasClass("active")) {  //取消filter
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                FilterCenter.removeFilter(_this);
            } else {
                $(_this.getContainer()).find(".filter-btn").removeClass("active");
                $(this).addClass("active");
                var topic = _this.topicModel.getTopicByGroupID(groupID);
                var selectedData = [];
                for (var id of topic.belongs) {
                    selectedData.push(DataCenter.data[id]);
                }
                FilterCenter.addFilter(_this, selectedData);                
            }
        })
    }

    renderGroup() {    
        var _this = this;
        var docs = DataCenter.data;
        var tpl = _.template($(_this.viewTemplate).find("#topic-template").html())
        var groups = _.filter(GroupCenter.groups, function(group) {
                return group.type == "Topic";
            });
        $(this.getContainer()).html("");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var topic = _this.topicModel.getTopicByGroupID(group.id);

            var groupDocs = [];
            for (var docID of group.data) {
                groupDocs.push(docs[docID]);
            }
            var html = tpl({group: group, topic: topic, docs: groupDocs});
            $(_this.getContainer()).append(html);
        }


        // $(_this.getContainer()).find(".group-doc").dblclick(function() {
        //     var docID = +$(this).attr("doc-id");
        //     var groupID = +$(this).attr("group-id");
        //     if ($(this).hasClass("fix") == false) {
        //         $(this).addClass("fix");
        //         _this.labels[docID] = _.union(_this.labels[docID], [groupID]);
        //     } else {
        //         $(this).removeClass("fix");
        //         _this.labels[docID] = _.without(_this.labels[docID], groupID);
        //     }
        // })

        $(_this.getContainer()).find(".group-doc").draggable({
            axis: "y",
            revert: true,
            revertDuration: 100 
        });
        $(_this.getContainer()).find(".group-docs").droppable({
            activeClass: "ui-state-default",
            hoverClass: "ui-state-hover",
            accept: ":not(.ui-sortable-helper)",
            drop: function( event, ui ) {
                window.drag = ui.draggable;
                if ($(ui.draggable).attr("group-id") == $(this).attr("group-id"))
                    return;
                var oldGroupID = +$(ui.draggable).attr("group-id");
                var newGroupID = +$(this).attr("group-id");
                var docID = +$(ui.draggable).attr("doc-id");
                var oldGroup = GroupCenter.getGroupByID(oldGroupID);
                var newGroup = GroupCenter.getGroupByID(newGroupID);
                oldGroup.removeData([docID]);
                newGroup.addData([docID]);
                PubSub.publish("GroupCenter.Groups.Update");

                $(ui.draggable).attr("group-id", $(this).attr("group-id"));
                $(this).append(ui.draggable);
            }
        })        
    }
}

export { TopicListView };