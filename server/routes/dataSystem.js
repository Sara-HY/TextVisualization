var express = require('express'),
    config = require.main.require('./config.js'),
    router = express.Router(),
    path = require('path'),
    swig = require('swig'),
    _ = require('underscore'),
    fs = require('fs'),
    csv = require('csv'),
    baby = require('babyparse'),    
    utils = require.main.require("./utils/utils.js");


var g = require("../global.js");
var ObjectID = require('mongoskin').ObjectID;    

router.get('/upload', async function(req, res, next) {
    console.log(req.session.user);
    if(!req.session.user){                  
        req.session.error = "请先登录"
        return res.redirect(g.serverPath + "/");              
    } 
    req.session.user = req.session.user;
    var html = swig.renderFile(path.join(config.rootPath, "/views/datasystem/upload.html"), {serverPath: g.serverPath, userName: req.session.user});
    res.writeHead(200, {"Content-type": "text/html"});
    res.write(html);
    res.write(fs.readFileSync( path.join(config.rootPath, "/views/datasystem/upload-template.html")));
    res.end();
});

router.get('/process/:id', async function(req, res, next) {
    if(!req.session.user){                  
        req.session.error = "请先登录"
        return res.redirect(g.serverPath + "/");              
    }
    var datasetID = req.params.id;
    console.log("process", datasetID);
    var data = await g.db.syncFindOne(g.datasetCollection, {"_id": ObjectID(datasetID)});
    if (data == null) {
        res.send({"status": "error"});
        return;
    }
    var fileName = data.fileName;
    var filePath = path.join(config.rootPath, config.fileUploadedPath, fileName);
    var fileData = fs.readFileSync(filePath, "utf-8");

    var result = {};
    if (fileName.endsWith("csv"))
        result = parseCSVFields(fileData);
    else if (fileName.endsWith("json"))
        result = parseJSONFields(fileData);
    res.render('datasystem/process', {userName: req.session.user, datasetID: datasetID, fileName: fileName, fields: result.fields, preview: result.preview, webPath: g.webPath, serverPath: g.serverPath});
});

function parseJSONFields(fileData) {
    var jsonData = JSON.parse(fileData);
    var map = {};
    var preview = {};
    function parseFields(prefix, d) {
        if (!_.isObject(d))
            return;
        if (_.isArray(d)) {
            for (var i = 0; i < d.length; i++) {
                parseFields(prefix, d[i]);
            }
        } else {
            for (var key in d) {
                var completeKey = prefix + "." + key;
                // completeKey = 
                // completeKey = utils.safeDBKey(fields[i]);
                map[completeKey] = true;
                if (preview[completeKey] == null)
                    preview[completeKey] = d[key];
                parseFields(completeKey, d[key]);
            }
        }
    }
    parseFields("", jsonData);
    var fields = _.keys(map);
    var result = {
        fields: fields,
        preview: preview
    }
    for (var i = 0; i < fields.length; i++) {
        var safeKey = utils.safeDBKey(fields[i].substring(1));
        preview[safeKey] = preview[fields[i]];
        fields[i] = safeKey;
    }
    return result;
}

function parseCSVFields(fileData) {
    var preview = {};
    var fields = [];
    var parser = baby.parse(fileData);
    var data = parser.data;
    if (data.length > 1) {
        fields = data[0];
        var previewData = data[1];
        for (var i = 0; i < fields.length; i++) {
            fields[i] = utils.safeDBKey(fields[i]);        
            preview[fields[i]] = previewData[i];
        }
    }
    var result = {
        fields: fields,
        preview: preview
    }
    return result;
}

function getPreviewData(fileData) {
}

module.exports = router;
