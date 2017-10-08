var express = require('express');
var config = require('../config.js');
var router = express.Router();

var g = require.main.require("./global.js");

var response = require.main.require("./utils/response.js");


router.get('/', function(req, res, next) {
	res.render('index', {serverPath: g.serverPath});
})

router.post('/', async function(req, res) {
	try {
		var rlt = await g.db.syncFindOne(g.userCollection, {"userName": req.body.userName});
		if(req.body.signType == "signin"){
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
		}
		else{
			if(!rlt){
				var data = {
					userName: req.body.userName,
					userPwd: req.body.userPwd
				};
				await g.db.syncInsert(g.userCollection, data);
				req.session.error = '用户名创建成功！';
	            res.send(200);
			} else {
				req.session.error = '用户名已存在！';
				res.send(500);
				response.error(res, "Username has been used!");
			}	
		}	
	} catch (e) {
		response.error(res, e);
	}
});

router.get("/signout", function(req, res, next) {    
	req.session.user = null;
	req.session.error = null;
	return res.redirect(g.serverPath + "/");
});


module.exports = router;