var express = require('express');
var router = express.Router();
var exec = require("child_process").exec;
var config = require('../config.js');
var path = require('path');
var fs = require('fs');

var g = require.main.require("./global.js");
var utils = require.main.require("./utils/utils.js");
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

router.post('/start', async function(req, res, next) {
	var cmd = "rm -rf " + dir + "; mkdir " + dir;
	console.log(cmd);
	exec(cmd, function(err, stdout, stderr) {
        if (err != null) {
            console.log(err);
            response.error(res, err);
        }
        res.send("delete");
    })
})

router.post('/crawling', async function(req, res, next) {
	try{
		var keywords = req.body.keywords;
		var site = req.body.site;
		var pageNum = req.body.pageNum;

		var filename = keywords + "-" + site.replace(/\./g, '-') + ".json";
		var filePath = path.join(dir, filename);

		var cmd = "python3 externals/crawlerNews.py " + filePath + " " + keywords + " " + pageNum + " " + site; 
		console.log(cmd);

		exec(cmd, {maxBuffer: 1024 * 10000}, function(err, stdout, stderr) {
	        if (err != null) {
	            console.log(err);
	            response.error(res, err);
	        }
	        res.send("success");
		})
	} catch (e) {
		throw(e);
	}
})

router.get('/file/:filename', function(req, res, next){
	try{
		var filePath = path.join(dir, req.params.filename);

		fs.exists(filePath, function(exists){
        	if(exists){
	        	var stat = fs.statSync(filePath); 
		        var result = {"filename": req.params.filename, "size": stat.size}
		        res.send(result);
		    }
		    else{
		    	res.send("file not exists!");
		    }
        })
	} catch (e) {
		throw(e);
	}
})

router.post('/file', function(req, res, next){
	var filename = req.body.filename;
	var time = req.body.time;
	var srcPath = dir;
	var distPath = path.join(saveDir, filename);
	fs.exists(distPath, function(exists){
        if(!exists){
        	var cmd = "python3 externals/mergeData.py " + dir + " " + distPath;
			console.log(cmd);
			exec(cmd, function(err, stdout, stderr) {
		        if (err != null) {
		            console.log(err);
		            response.error(res, err);
		        }
		        fs.rmdir(srcPath, async function(){
		        	var stat = fs.statSync(distPath);  
					var data = { 
				        usrName: req.session.user,
				        fileName: filename, 
				        fileMeta: {
				            name: filename,
				            size: stat.size,
				            type: "application/json",
				            uploadTime: parseInt(time)
				        },
				        processStatus: {
				            status: "unprocessed",
				            message: ""
				        }
				    }
				    var rlt = await g.db.syncInsert(g.datasetCollection, data);
			        res.send(rlt.ops[0]._id);
		        })
		    });
   //      	var fileReadStream = fs.createReadStream(srcPath);  
			// var fileWriteStream = fs.createWriteStream(distPath);  
			// fileReadStream.pipe(fileWriteStream);
			// fileWriteStream.on('close', async function(){  
			// 	console.log('copy over');
			// 	var stat = fs.statSync(distPath);  
			// 	var data = { 
			//         usrName: req.session.user,
			//         fileName: filename, 
			//         fileMeta: {
			//             name: filename,
			//             size: stat.size,
			//             type: "application/json",
			//             uploadTime: parseInt(filename.substring(filename.indexOf('-') + 1, filename.length - 5))
			//         },
			//         processStatus: {
			//             status: "unprocessed",
			//             message: ""
			//         }
			//     }
		 //        var rlt = await g.db.syncInsert(g.datasetCollection, data);
		 //        res.send(rlt.ops[0]._id);
			// });    
        }
        else{//exists
         	res.send("file exists!");
        }
    });
})

module.exports = router;
