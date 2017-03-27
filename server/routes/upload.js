var express = require('express');
var config = require('../config.js');
var router = express.Router();
var path = require('path')
var swig = require('swig')
var fs = require('fs')

var g = require.main.require("./global.js");
var ObjectID = require('mongoskin').ObjectID;

var response = require.main.require("./utils/response.js");

// config the uploader
var dir = path.join(config.rootPath, "/public/uploaded/");
var options = {
    tmpDir:  path.join(dir, '/tmp'),
    uploadDir: path.join(dir, '/files'),
    uploadUrl:  '/uploaded/files/',
    maxPostSize: 11000000000, // 11 GB
    minFileSize:  1,
    maxFileSize:  10000000000, // 10 GB
    acceptFileTypes:  /.+/i,
    accessControl: {
        allowOrigin: '*',
        allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
        allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
    },
    storage : {
        type : 'local'
    }

};


var uploader = require('uni-blueimp-file-upload-expressjs')(options);

router.get('/', function(req, res) {
    // uploader.get(req, res, async function (err,obj) {
    uploader.get(req, res, async function (obj) {
        try {
            var rlt = await g.db.syncQuery(g.datasetCollection, {"usrName": req.session.user});
            rlt = rlt.sort(function(a, b) {
                return new Date(b.fileMeta.uploadTime).getTime() - new Date(a.fileMeta.uploadTime).getTime()
            })
            for (var i = 0; i < rlt.length; i++) {
                var d = rlt[i];
                d["name"] = d["fileName"];
                d["url"] = "/uploaded/files/" + d["fileName"];
            }
            var data = { files: rlt , Webpath: g.webPath};
            response.success(res, data);
        } catch (e) {
            response.error(res, e);
        }
    });
});

router.post('/', function(req, res) {
    // uploader.post(req, res, async function (error, obj, redirect) {
    uploader.post(req, res, async function (obj, redirect, error) {
        try {
            if(!error) {
                for (var i = 0; i < obj.files.length; i++) {
                    var data = { 
                        usrName: req.session.user,
                        fileName: obj.files[i].name, 
                        fileMeta: {
                            name: obj.files[i].originalName,
                            size: obj.files[i].size,
                            type: obj.files[i].type,
                            uploadTime: new Date().getTime(),
                            user: null
                        },
                        processStatus: {
                            status: "unprocessed",
                            message: ""
                        }
                    };
                    var rlt = await g.db.syncInsert(g.datasetCollection, data);
                    var id = rlt.ops[0]._id;
                    obj.files[i]._id = id;
                }
                res.send(JSON.stringify(obj)); 
            }
        } catch (e) {
            response.error(res, e);
        }
    });  
});

// the path SHOULD match options.uploadUrl
router.get('/delete/:id', async function(req, res) {
    try {
        var id = req.params.id;
        var rlt = await g.db.syncQuery(g.datasetCollection, {_id: ObjectID(id)});
        if (rlt.length > 0) {
            var fileName = rlt[0].fileName;
            var filePath = path.join(options.uploadDir, fileName);
            console.log("filepath", filePath);
            req.url = filePath;
            fs.unlinkSync(filePath)
            await g.db.syncDelete(g.datasetCollection, {_id: ObjectID(id)});
            res.json({"status": "success"});     
        } else {
            response.error(res, "resource not found!");
        }
    } catch (e) {
        response.error(res, e);
    }

});

module.exports = router;
