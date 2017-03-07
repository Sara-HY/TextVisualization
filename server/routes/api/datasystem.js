var express = require('express');
var path = require('path')
var swig = require('swig')
var fs = require('fs')
var _ = require('underscore');
var exec = require('child_process').exec; 
var ObjectID = require('mongoskin').ObjectID; 

var g = require.main.require("./global.js");
var config = require.main.require('./config.js'); 
var response = require.main.require("./utils/response.js");
var dataProcesser = require.main.require("./functions/dataprocess.js");
var router = express.Router();


router.put("/process/:id", async function(req, res, next) { 
    try {
        var datasetID = req.params.id;
        var data = await g.db.syncFindOne(g.datasetCollection, {"_id": ObjectID(datasetID)});
        if (data == null) {
            res.send({"status": "error"});
            return;
        }

        var attrs = req.body.data ;
        attrs = JSON.parse(attrs);
        if (attrs != null) {
            for (var key in attrs) {

                data[key] = attrs[key];
            }
        }
        console.log(data)
        await g.db.syncSave(g.datasetCollection, data);
        response.success(res);
    } catch (e) {
        response.error(res, e);
    }
})

router.get("/process/start/:id", async function(req, res, next) {
    try {
        var datasetID = req.params.id;
        var data = await g.db.syncFindOne(g.datasetCollection, {"_id": ObjectID(datasetID)});
        dataProcesser(data);
        response.success(res);
    } catch (e) {
        response.error(res, e);
    }    
})

router.get("/process/status/:id", async function(req, res, next) {
    try {
        var datasetID = req.params.id;
        var data = await g.db.syncFindOne(g.datasetCollection, {"_id": ObjectID(datasetID)});
        response.success(res, data.processStatus);
    } catch (e) {
        response.error(res, e);
    }    
})

// router.get('/process/segmentation/:filename', function(req, res, next) {
//     var fileName = req.params.filename,
//         textField = req.query.textfield;
//     var fileName = Utils
//     var filePath = path.join(config.rootPath, "public/temp/files", fileName);
//     var fileData = fs.readFileSync(filePath, "utf-8");
//     var jsonData = JSON.parse(fileData);

//     var returnCount = 0;
//     var targetCount = jsonData.length;
//     var segData = [];
//     for (var i = 0; i < jsonData.length; i++) {
//         var text = jsonData[i][textField];
//         var cmd = "java -jar externals/haNLP.jar \"" + text + "\"";
//         exec(cmd, function(err, stdout, stderr) {
//             segData.push(stdout);
//             returnCount++;
//             if (returnCount >= targetCount)
//                 res.send(segData);
//         })
//     }
// })



module.exports = router;