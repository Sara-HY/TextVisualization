var express = require("express");
var _ = require('underscore');
var ObjectID = require('mongoskin').ObjectID;

var g = require.main.require("./global.js");
var config = require.main.require('./config.js'); 
var router = express.Router();


router.get('/:userid', async function(req, res, next) {
    var userid = ObjectID(req.params.userid);
    var data = await global.db.syncFindOne(global.userCollection, {"_id": userid});
    res.send(data);
});

module.exports = router;