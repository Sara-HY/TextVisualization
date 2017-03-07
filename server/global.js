var config = require("./config.js");
var database = require("./utils/database.js");

var db = new database(config.dbPath, config.dbName);
var testCollection = db.getCollection("test");
var userCollection = db.getCollection("user");
var datasetCollection = db.getCollection("dataset");

exports.db = db;
exports.testCollection = testCollection;
exports.userCollection = userCollection;
exports.datasetCollection = datasetCollection;

