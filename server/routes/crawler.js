var express = require('express');
var router = express.Router();
var exec = require("child_process").exec;
var config = require('../config.js');
var path = require('path');
var fs = require('fs');

var g = require.main.require("./global.js");
var dir = path.join(config.rootPath, "/public/crawler");
var saveDir = path.join(config.rootPath, "/public/uploaded/files/");

/* GET users listing. */

router.get('/', async function(req, res, next) {
    if(!req.session.user){                  
        req.session.error = "请先登录"
        return res.redirect(g.serverPath + "/");              
    }
    res.render('crawler', {serverPath: g.serverPath, userName:req.session.user});
});

router.post('/', async function(req, res, next){
	var keywords = req.body.keywords;
	var site = req.body.site;
	var date = new Date();
	var filename = keywords + "-" + date.getTime() + ".json";
	var filePath = path.join(dir, filename);

	var cmd = "python3 externals/crawlerNews.py " + filePath + " " + keywords + " " + site; 
	console.log(cmd);
	exec(cmd, {maxBuffer: 1024 * 10000}, function(err, stdout, stderr) {
        if (err != null) {
            console.log(err);
            response.error(res, err);
        }
        var stat = fs.statSync(filePath); 

        var result = {"url": filename, "size": stat.size}
        res.send(result);
    })
})

router.post('/file', async function(req, res, next){
	var filename = req.body.filename;
	var srcPath = path.join(dir, filename)
	var distPath = path.join(saveDir, filename);
	fs.exists(distPath, function(exists){
        if(!exists){
        	var fileReadStream = fs.createReadStream(srcPath);  
			var fileWriteStream = fs.createWriteStream(distPath);  
			fileReadStream.pipe(fileWriteStream);
			fileWriteStream.on('close', async function(){  
				console.log('copy over');
				var stat = fs.statSync(distPath);  
				var data = { 
			        usrName: req.session.user,
			        fileName: filename, 
			        fileMeta: {
			            name: filename,
			            size: stat.size,
			            type: "application/json",
			            uploadTime: parseInt(filename.substring(filename.indexOf('-') + 1, filename.length - 5))
			        },
			        processStatus: {
			            status: "unprocessed",
			            message: ""
			        }
			    }
		        var rlt = await g.db.syncInsert(g.datasetCollection, data);
		        res.send(rlt.ops[0]._id);
			});    
        }else{//exists
         	res.send("file exists!");
        }
    });
})

module.exports = router;
