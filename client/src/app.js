import {Utils} from "./Utils.js";
import {DataCenter} from "./DataCenter.js";
import {Config} from "./Config.js";
import {GroupCenter} from "./GroupCenter.js"
import {FilterCenter} from "./FilterCenter.js"
// import {SessionHelper} from "./SessionHelper.js"

import {DataListView} from "./views/DataListView.js";
// import {PaperListView} from "./views/PaperListView.js";
import {DocumentGalaxyView} from "./views/DocumentGalaxyView.js";
import {TimelineView} from "./views/TimelineView.js";
import {EntityGraphView} from "./views/EntityGraphView.js";
import {DendrogramView} from "./views/DendrogramView.js";
import {GroupListView} from "./views/GroupListView.js";
import {TopicListView} from "./views/TopicListView.js";
import {FacetsView} from "./views/FacetsView.js"
import {TopicEntityView} from "./views/TopicEntityView.js"
import {TopicMatrixView} from "./views/TopicMatrixView.js";
import {TopicConfigView} from "./views/TopicConfigView.js";
import {KeyWordsView} from "./views/KeyWordsView.js";
import {EntityView} from "./views/EntityView.js";
// import {TopicSelectionView} from "./views/TopicSelectionView.js";
// import {SessionConfigView} from "./views/SessionConfigView.js";
// import {SessionDetailView} from "./views/SessionDetailView.js";

import viewConfig from "../config/view-config.json!json"

import "spin"


$(async () => {
    let datasetID = Utils.getUrlParam("datasetid");
    new DataCenter();
    new GroupCenter();
    new FilterCenter();
    DataCenter.datasetID = datasetID;

    var spinner = new Spinner().spin($("body")[0]);
    await DataCenter.loadMeta();
    await DataCenter.loadAllData();

    var model = await DataCenter.getTopicModel(5, 0, null, null);
    DataCenter.topicModel = model;
    model.pullToGroups();
    PubSub.publish("DataCenter.TopicModel.Update");
    
    //根据配置创建view
    for (var view of viewConfig) {
        var layout = JSON.stringify(view.layout);
        layout = layout.replace(/'/g, "\"")
        var command = "new " + view.Class + "(\"" + view.id + "\", \"" + view.title + "\", '" + layout + "')";
        console.log(command)
        eval(command)
    }

    // for (var i = 0; i < modelNumber; i++) {
    //     var model = await DataCenter.getTopicModel(topicModelK, i);
    //     DataCenter.topicModels.push(model);
    // }
    // PubSub.publish("DataCenter.TopicModel.Update");
    // PubSub.publish("GroupCenter.Groups.Update");
    spinner.stop();
});
