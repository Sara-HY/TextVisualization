var express = require("express");
var _ = require('underscore');
var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')
var ObjectID = require('mongoskin').ObjectID;
var exec = require("child_process").exec; 


var g = require.main.require("./global.js");
var config = require.main.require('./config.js'); 
var response = require.main.require("./utils/response.js");
var utils = require.main.require("./utils/utils.js");
var clusterfck = require.main.require("./externals/clusterfck/clusterfck.js");

var router = express.Router();

router.post('/constraintedKMeans/', async function(req, res, next) {
    try {
        var source = req.body.source;
        var datasetID = req.body.datasetID;
        var mainTextField = req.body.mainTextField;
        var k = req.body.k;
        var vectors = req.body.vectors
        var collectionName = "data_" + datasetID;
        var cmd = "";
        if (source == "database") {
            cmd = "python3 externals/ConstraintedKMeans.py " + source + " " + config.dbHost + " " + config.dbPort + " " +
                            config.dbName + " " + collectionName + " " + mainTextField + " " + k;            
        }
        else if (source == "points")
            cmd = "python3 externals/ConstraintedKMeans.py " + source + " " + k + " " + JSON.stringify(vectors);
        exec(cmd, function(err, stdout, stderr) {
            if (err != null)
                response.error(res, err);
            var result = JSON.parse(stdout);
            res.json({labels: result});
        })
    } catch (e) {
        response.error(res, e);
    }
});

router.post('/hierarchicalClustering/', function(req, res, next) {
    var source = req.body.source;
    var datasetID = req.body.datasetID;
    var mainTextField = req.body.mainTextField;
    var vectors = req.body.vectors
    var collectionName = "data_" + datasetID;  
    if (source == "database") {
        var cmd =  "python3 externals/TFIDF.py " + config.dbHost + " " + config.dbPort + " " + config.dbName + " " + collectionName + " " + mainTextField;
        exec(cmd, {maxBuffer: 1024 * 5000}, function(err, stdout, stderr) {
            if (err != null)
                response.error(res, err);
            var matrix = JSON.parse(stdout);
            var cluster = clusterfck.hcluster(matrix);
            res.json({cluster: cluster})
        })
    } else if (source == "points") {
        var cluster = clusterfck.hcluster(JSON.parse(vectors));
        res.json({cluster: cluster})
    }
});

router.post('/bubbleSets/', function(req, res, next) {
    try {
        var positions = req.body.positions;
        positions = JSON.parse(positions);
        var randomString = utils.randomString(32);
        var fileName = "bubble-sets-" + randomString + ".json";
        var resultFileName = "bubble-sets-output-" + randomString + ".json";
        var filePath = path.join(config.rootPath, "temp", fileName);
        var resultFilePath = path.join(config.rootPath, "temp", resultFileName);
        fs.writeFileSync(filePath, JSON.stringify(positions), "utf-8");

        var edgeR0 = req.body.edgeR0 || 1;
        var edgeR1 = req.body.edgeR1 || 4;
        var nodeR0 = req.body.nodeR0 || 1;
        var nodeR1 = req.body.nodeR1 || 4;
        var morphBuffer = req.body.morphBuffer || 10;
        var skip = req.body.skip || 5;


        var cmd = "java -jar externals/BubbleSets.jar \"" + filePath + "\"" + " \"" + resultFilePath + "\"" + " "
            + edgeR0 + " " + edgeR1 + " " + nodeR0 + " " + nodeR1 + " " + morphBuffer + " " + skip;
        console.log("cmd", cmd);
        exec(cmd, function (err, stdout, stderr) {
            if (err != null) {
                console.log(err);
                response.error(res, err);
            }
            var result = fs.readFileSync(resultFilePath);
            res.json({ paths: JSON.parse(result) });
        });
    } catch (e) {
        console.log(e);
        response.error(res, e);
    }
});

router.post('/LDA/', function (req, res, next) {
    try {
        var datasetID = req.body.datasetID;
        var collectionName = "data_" + datasetID;
        var ids = [];
        if (req.body.ids) ids = JSON.parse(req.body.ids);
        var alpha = +req.body.alpha;
        var beta = +req.body.beta;
        var niter = +req.body.niter;
        var k = +req.body.k;
        var runID = req.body.runID; //用于标识
        if (runID == null) runID = 0;


        var modelName = collectionName + "_" + alpha + "_" + beta + "_" + niter + "_" + k + "_" + runID;
        modelName = modelName.replace(/\./g, "_");
        var dir = path.join(config.rootPath, "temp", "labeledLDA", modelName);
        mkdirp.sync(dir);

        var ids = [];
        if (req.body.ids)
            ids = JSON.parse(req.body.ids);
        var idFileName = "ids-" + modelName + ".txt";
        var idFilePath = path.join(dir, idFileName);   

        //输出id信息
        var outputText = "";
        if (ids != null) {
            for (var i = 0; i < ids.length; i++) {
                outputText += ids[i] + "\n";
            }             
        }
        fs.writeFileSync(idFilePath, outputText, "utf-8");

        //直接读取已有文件.
        var outputPath = path.join(dir, modelName + ".json");
        console.log("LDAOutputPath", outputPath);
        if (fs.existsSync(outputPath) == true) {
            var result = fs.readFileSync(outputPath);
            res.json(JSON.parse(result));
            return;
        }

        var cmd = "java -jar externals/LabeledLDA.jar " + config.dbHost + " " + config.dbPort + " " + config.dbName + " " + collectionName + " " + alpha + " " + beta + " " + niter + " " + k + " " + modelName + " " + dir + " " + null + " " + idFilePath;

        console.log("cmd", cmd);

        exec(cmd, function (err, stdout, stderr) {
            if (err != null) {
                console.log(err);
                response.error(res, err);
            }
            var resultPath = path.join(dir, modelName + ".json");
            var result = fs.readFileSync(resultPath);
            res.json(JSON.parse(result));
        });
    } catch (e) {
        console.log(e, e.stack.split("\n"));
        response.error(res, e);
    }
});


router.post('/labeledLDA/', function(req, res, next) {
    try {
        var datasetID = req.body.datasetID;
        var collectionName = "data_" + datasetID;
        var labels = JSON.parse(req.body.labels);
        var ids = [];
        if (req.body.ids)
            ids = JSON.parse(req.body.ids);
        var alpha = +req.body.alpha;
        var beta = +req.body.beta;
        var niter = +req.body.niter;
        var k = +req.body.k;
        var runID = req.body.runID; //用于标识
        if (runID == null) runID = 0;


        var modelName = collectionName + "_" + alpha + "_" + beta + "_" + niter + "_" + k + "_" + runID + "_" + utils.randomString(32);
        var dir = path.join(config.rootPath, "temp", "labeledLDA", modelName);
        mkdirp.sync(dir);
        var labelFileName = "labels-" + modelName + ".txt";
        var labelFilePath = path.join(dir, labelFileName);
        var idFileName = "ids-" + modelName + ".txt";
        var idFilePath = path.join(dir, idFileName);

        //输出labels信息
        var outputText = "";
        for (var i = 0; i < labels.length; i++) {
            var lineLabels = labels[i];
            if (lineLabels.length == 0) {
                outputText += "\n";
            } else {
                outputText += "[" + lineLabels.join(" ") + "]\n";
            }
        }
        fs.writeFileSync(labelFilePath, outputText, "utf-8");        

        //输出id信息
        outputText = "";
        if (ids != null && ids.length > 0) {
            for (var i = 0; i < ids.length; i++) {
                outputText += ids[i] + "\n";
            }
            fs.writeFileSync(idFilePath, outputText, "utf-8");
        } else {
            idFilePath = null;
        }
        console.log("ids", ids, idFilePath);

        var cmd = "java -jar externals/LabeledLDA.jar " + config.dbHost + " " + config.dbPort + " " + config.dbName + " " 
                    + collectionName + " " + alpha + " " + beta + " " + niter + " " + k + " " + modelName + " " 
                    + dir + " " + labelFilePath + " " + idFilePath;

        console.log("cmd", cmd);                    

        exec(cmd, function(err, stdout, stderr) {
            if (err != null) {
                console.log(err);
                response.error(res, err);
            }
            var resultPath = path.join(dir, modelName + ".json");
            var result = fs.readFileSync(resultPath);
            res.json(JSON.parse(result));
        }) 
    } catch (e) {
        console.log(e);
        response.error(res, e);
    }
});


module.exports = router;