var express = require('express');
var config = require('../config.js');
var router = express.Router();
var g = require.main.require("./global.js");

var response = require.main.require("./utils/response.js");

router.get('/', function (req, res, next) {
	res.render('signup');
});


router.post('/', async function(req, res) {
	try {
		var rlt = await g.db.syncFindOne(g.userCollection, {"userName": req.body.userName});
		console.log(rlt);
		if(!rlt){
			var data = {
				userName: req.body.userName,
				userPwd: req.body.userPwd
			};
			console.log(data);
			await g.db.syncInsert(g.userCollection, data);
			req.session.error = '用户名创建成功！';
            res.send(200);
		} else {
			// req.session.error = '用户名已存在！';
			// res.send(500);
			response.error(res, "Username has been used!");
		}	
	} catch (e) {
		response.error(res, e);
	}
});
	
module.exports = router;