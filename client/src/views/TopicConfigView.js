import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/topic-config-view.html!text"


class TopicConfigView extends BaseView {
    constructor(viewID, viewTitle, layout, config) {
        super(viewID, "topic-config-view", viewTitle, viewTemplate, layout);
        window.TopicConfigView = this;
        var _this = this;
        $(this.getContainer()).find("input").val(5);
        $(this.getContainer()).find("#run-topic-btn").click(async function() {
            var topicNum = +$(_this.getContainer()).find("#topic-number-input").val();
            var useLabeledLDA = $(_this.getContainer()).find("#labeled-lda-checkbox")[0].checked;
            _this.spinner.spin(_this.getContainer());
            var model = await _this._runTopicModel(topicNum, useLabeledLDA);
            _this.spinner.stop();
            DataCenter.topicModel = model;
            model.pullToGroups();
            PubSub.publish("DataCenter.TopicModel.Update", _this);
            PubSub.publish("GroupCenter.Groups.Update");
        })
        this.randomRunID = false;
    }

    //处理Labeled LDA.
    async _runTopicModel(topicNum, useLabeledLDA) {
        var labels = null;
        var groups = _.filter(GroupCenter.groups, {type: "Group"});

        //读取Label，Label必须是0到k-1的数字，topicNum必须大于group数量
        if (useLabeledLDA && groups.length > 0) {
            topicNum = Math.max(topicNum, groups.length);

            labels = [];
            var docs = DataCenter.data;
            for (var i = 0; i < docs.length; i++)
                labels.push([]);

            var groupLabel = 0;
            for (var group of groups) {
                for (var docID of group.data) {
                    labels[docID].push(groupLabel);
                }
                groupLabel++;
            }
            console.log("labels", labels);
        }
        var runID = this.randomRunID ? Utils.randomString() : 0;
        var model = await DataCenter.getTopicModel(topicNum, runID, null, labels);
        return model;
    }

}

export { TopicConfigView };