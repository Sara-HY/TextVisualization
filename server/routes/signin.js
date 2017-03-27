var express = require('express');
var config = require('../config.js');
var router = express.Router();


var g = require.main.require("./global.js");

var response = require.main.require("./utils/response.js");


router.get('/', function(req, res, next) {
	res.render('signin');
})

router.post('/', async function(req, res) {
	try {
		var rlt = await g.db.syncFindOne(g.userCollection, {"userName": req.body.userName});
		if(!rlt){
			req.session.error = '用户名不存在';
			res.send(404);
		}
		else{
			if(req.body.userPwd != rlt.userPwd){ 	//查询到匹配用户名的信息，但相应的password属性不匹配
				req.session.error = "密码错误";
				res.send(404);
			//	res.redirect("/login");
			}else{ 									
				req.session.user = rlt.userName;
				res.send(200);
				// res.redirect("/datasystem/upload");
			}
		}
	} catch (e) {
		response.error(res, e);
	}
});

module.exports = router;
