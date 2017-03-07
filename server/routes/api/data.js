var express = require("express");
var _ = require('underscore');
var ObjectID = require('mongoskin').ObjectID;

var g = require.main.require("./global.js");
var config = require.main.require('./config.js'); 
var response = require.main.require("./utils/response.js");

var router = express.Router();

router.get('/:datasetID/meta', async function(req, res, next) {
    try {
        var datasetID = ObjectID(req.params.datasetID);
        var collectionName = "dataset";
        var collection = g.db.getCollection(collectionName);
        var data = await g.db.syncFindOne(collection, {_id: datasetID});
        res.send(data);
    } catch (e) {
        response.error(res, e);
    }
});

router.get('/:datasetID/datalist', async function(req, res, next) {
    try {
        var datasetID = ObjectID(req.params.datasetID);
        var collectionName = "data_" + datasetID;
        var collection = g.db.getCollection(collectionName);
        // console.log(collectionName, collection)
        var data = await g.db.syncQuery(collection, {});
        res.send(data);        
    } catch (e) {
        response.error(res, e);
    }

});

module.exports = router;