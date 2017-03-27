var  mongodb = require('mongoskin'),
    ObjectID = require('mongoskin').ObjectID,
    babel_polyfill = require("babel-polyfill");

module.exports = function(dbPath, dbName) {
    var db = new mongodb.db(dbPath + "/" + dbName);
    this.getDB = function() {
        return db;
    }
    
    this.getCollection = function(collectionName) {
        return db.collection(collectionName);
    }

    this.syncQuery = function(collection, query) {
        return new Promise((resolve) => {
            if (collection == null)
                resolve(null);
            collection.find(query).toArray(function(err, data) {
                resolve(data);
            });        
        })
    }

    this.syncFindOne = function(collection, query) {
        return new Promise((resolve) => {
            if (collection == null)
                resolve(null);
            collection.findOne(query, function(err, data) {
                resolve(data);
            });
        })
    }

    this.syncInsert = function(collection, data) {
        if (collection == null)
            return null;        
        return new Promise((resolve) => {
            collection.insert(data, function(err, data) {
                resolve(data);
            });
        });
    }

    this.syncSave = function(collection, data) {
        if (collection == null)
            return null;        
        return new Promise((resolve) => {
            collection.save(data, function(err, data) {
                resolve(data);    
            });
        });
    }

    this.syncDelete= function(collection, data) {
        if (collection == null)
            return null;        
        return new Promise((resolve) => {
            collection.remove(data, function(err, data) {
                resolve(data);    
            });
        });
    }   
}