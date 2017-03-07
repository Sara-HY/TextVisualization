import { Config } from './Config.js'
import { DataUtils } from "./DataUtils.js"
import { TopicModel } from "./TopicModel.js"

import "scripts/doc-text-processor.js"

/**
 * DataCenter.fields: 映射各字段
 *   _MAINTEXT: 主文本域
 *   _SEGMENTATIONS: 主文本域的分词
 *
 * DataCenter.meta: 数据元数据
 * DataCenter.data: 数据列表
 * DataCenter.datasetID: datasetID
 */
class DataCenter {
    static async loadMeta() {
        DataCenter.meta = await DataUtils.queryToServer("/api/data/" + DataCenter.datasetID + "/meta/");

        var metaFields = DataCenter.meta.fields;
        for (var key in metaFields) {
            if (metaFields[key] == "main-text")
                DataCenter.fields["_MAINTEXT"] = key;
            if (metaFields[key] == "main-time")
                DataCenter.fields["_MAINTIME"] = key;
        }
        DataCenter.fields["_SEGMENTATION"] = "_segmentation";
        DataCenter.fields["_NER"] = "_ner";

        console.log("fields", DataCenter.fields);
    }

    static async loadAllData() {
        DataCenter.data = await DataUtils.queryToServer("/api/data/" + DataCenter.datasetID + "/datalist/");
        DataCenter.data = _.sortBy(DataCenter.data, "_id");
        var docs = DataCenter.data;
        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];
            doc["_index"] = i;
            if (DataCenter.fields._MAINTIME != null) {
                var d = DataUtils.getDataByField(doc, DataCenter.fields._MAINTIME);
                if (d != null) {
                    doc["_MAINTIME"] = new Date(d);
                }
            }
            if (DataCenter.fields._MAINTEXT != null) {
                var d = DataUtils.getDataByField(doc, DataCenter.fields._MAINTEXT);
                if (d != null)
                    doc["_MAINTEXT"] = d; 
            }
        }
        this.initDocTextProcessor();
    }

    static initDocTextProcessor() {
        var segmentedDocs = _.map(DataCenter.data, function(doc) {
            return doc[DataCenter.fields._SEGMENTATION]
        })
        DataCenter.docTextProcessor = new DocTextProcessor();
        DataCenter.docTextProcessor.setDocs(segmentedDocs);     
    }

    static async getKMeansClusters() {
        var k = 7;
        // var clusters = await DataUtils.queryToServer("/api/algorithm/constraintedKMeans", {
        //     source: "database",
        //     datasetID: DataCenter.datasetID,
        //     k: k,
        //     mainTextField: DataCenter.fields._MAINTEXT
        // }, "POST");
        // DataCenter.clusterLabels = clusters.labels;
        // DataCenter.clusterColors = d3.scale.category10().domain(d3.range(0, k));
    }

    static async getTopicModel(k, _runID, _docIDs, _labels) {
        var alpha = 2;
        var beta = 0.5;
        var niter = 1000;
        var labels = [];
        for (var i = 0; i < DataCenter.data.length; i++) {
            labels.push([]);
        }        
        var idMap = null;
        if (_labels != null)
            labels = _labels;

        var docIDs = [];
        if (_docIDs != null)
            docIDs = _docIDs;

        var data = {
            datasetID: DataCenter.datasetID,
            alpha: alpha,
            beta: beta,
            niter: niter,
            k: k,
            labels: JSON.stringify(labels),
            runID: _runID            
        }
        if (docIDs.length > 0)
            data.ids = JSON.stringify(docIDs);

        var topicModel = null;
        if (_labels == null) {
            topicModel = await DataUtils.queryToServer("/api/algorithm/LDA", data, "POST");
        } else {
            topicModel = await DataUtils.queryToServer("/api/algorithm/labeledLDA", data, "POST");
        }

        if (docIDs.length != 0) {
            idMap = {};
            for (var i = 0; i < docIDs.length; i++) {
                var id = docIDs[i];
                idMap[i] = id;
            }
        }

        var topicModel = new TopicModel(topicModel, idMap);
        // // topic model排序
        // topicModel.topics.sort(function(a, b) {
        //     return -(a.quality - b.quality);
        // })
        // DataCenter.topicModels.push(topicModel);
        // PubSub.publish("DataCenter.TopicModel.Receive", _runID);
        return topicModel;

    }
}

DataCenter.currentViewZIndex = 1000;
DataCenter.datasetID = "";
DataCenter.fields = {};

//For testing
window.DataCenter = DataCenter;

export {
    DataCenter
};
