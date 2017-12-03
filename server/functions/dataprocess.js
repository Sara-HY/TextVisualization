var config = require.main.require("./config.js")
var path = require("path");
var fs = require("fs");
var exec = require("child_process").exec; 
var baby = require('babyparse');

var config = require.main.require("./config.js");
var g = require.main.require("./global.js");
var utils = require.main.require("./utils/utils.js");



async function process(dataset) {
    try {
        var filePath = path.join(config.rootPath, config.fileUploadedPath, dataset.fileName);
        var fileContent = fs.readFileSync(filePath, "utf-8");

        var collectionName = "data_" + dataset["_id"];
        var collection = g.db.getDB().createCollection(collectionName);

        g.db.getCollection(collectionName).removeMany();

        dataset.processStatus = {
            status: "Processing",
            message: "Loading data"
        }
        console.log("dataset", dataset.processStatus);
        g.db.syncSave(g.datasetCollection, dataset);

        if (dataset.fileName.endsWith("csv")) {
            await saveCSVRawData(fileContent, collectionName);
        } else if (dataset.fileName.endsWith("json")) {
            await saveJSONRawData(fileContent, collectionName);    
        }

        if (dataset.preprocess != null) {
            for (var i = 0; i < dataset.preprocess.length; i++) {
                var stage = dataset.preprocess[i];
                dataset.processStatus = {
                    status: "Processing",
                    message: "Process:" + stage
                } 
                g.db.syncSave(g.datasetCollection, dataset);
                if (stage == "chinese") {
                    await chineseSegAndNER(collectionName, dataset);
                    console.log("chinese segmentation and NER");
                }
            }
        }

        dataset.processStatus = {
            status: "Processed",
            message: "Success"
        }
        g.db.syncSave(g.datasetCollection, dataset);   
    } catch (e) {
        console.log("error", e);
        dataset.processStatus = {
            status: "error",
            message: e
        }
        g.db.syncSave(g.datasetCollection, dataset);        
    }

}

async function saveJSONRawData(fileContent, collectionName) {
    var collection = g.db.getCollection(collectionName);
    var jsonData = JSON.parse(fileContent);
    for (var i = 0; i < jsonData.length; i++) {
        await g.db.syncInsert(collection, jsonData[i]);
    }
    console.log("save Raw Data success");
}


async function saveCSVRawData(fileContent, collectionName) {
    try {         
        var collection = g.db.getCollection(collectionName);
        var parser = baby.parse(fileContent);
        var data = parser.data;
        if (data.length == 0)
            return [];
        var fields = data[0];
        for (var i = 0; i < fields.length; i++)
            fields[i] = utils.safeDBKey(fields[i]);

        for (var i = 1; i < data.length; i++) {
            var d = {};            
            for (var j = 0; j < data[i].length; j++) {
                if (j >= fields.length)
                    break;
                d[fields[j]] = data[i][j];
            }
            await g.db.syncInsert(collection, d);
        }
        console.log("save Raw Data success");        
    } catch (e) {
        console.log("error", e);
    }

}


async function chineseSegAndNER(collectionName, dataset) {
    try {
        var mainTextField = "";
        if (dataset.fields == null)
            return;
        for (var key in dataset.fields) {
            if (dataset.fields[key] == "main-text") {
                mainTextField = key;
                break;
            }
        }
        if (mainTextField == "")
            return;
        var cmd = "cd externals; pwd; java -jar TextNLP.jar " + config.dbHost + " " + config.dbPort + " " +
                config.dbName + " " + collectionName + " " + mainTextField + " " + "chinese";
        console.log(cmd);
        var result = await utils.syncExec(cmd);
        console.log("result", result); 
        if (result.err != null) {
            throw (result.err);
        }
    } catch (e) {
        throw(e);
    }



}

module.exports = process