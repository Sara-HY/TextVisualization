import {BaseView} from './BaseView.js';
import {DataUtils} from "../DataUtils.js"
import {DataCenter} from "../DataCenter.js"
import {GroupCenter} from "../GroupCenter.js"
import {Utils} from "../Utils.js"
import viewTemplate from "../../templates/views/session-config-view.html!text"


class SessionConfigView {
    constructor() {
        var _this = this;
        this.viewTemplate = $(Utils.wrapTemplate(viewTemplate));
        var html = $(this.viewTemplate).html();
        $("#views-wrapper").append(html); 
        $("#session-config-modal").modal();
        $("#session-config-modal #total").text(DataCenter.data.length)

        $("#session-config-modal #session-config-ok-btn").click(function() {
            
            var config = {};
            for (var i = 0; i < 4; i++) {
                var paper = +$("#session-config-modal #paper-" + i).val();
                var session = +$("#session-config-modal #session-" + i).val();
                if (paper > 0 && session > 0)
                    config[paper] = session;
            }
            var sum = 0;
            for (var paperNum in config) {
                sum += paperNum * config[paperNum]
            };         
            if (sum != DataCenter.data.length) {
                alert("The total paper num is not equal to " + DataCenter.data.length);
                return;
            }
            _this.updateSessionConfig(config);
            $("#session-config-modal").modal("hide");
        })
    }

    updateSessionConfig(config) {
        if (config == null) {
            config = { 5: 4, 4: 3 }            
        }
        DataCenter.sessionConfig = config;
        SessionHelper.initGroups();
        PubSub.publish("DataCenter.SessionConfig.Update");
    }
}

export { SessionConfigView };