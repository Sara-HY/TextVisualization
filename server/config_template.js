var dbHost = "127.0.0.1";
var dbPort = 27017;
var dbPath = "mongodb://" + dbHost + ":" + dbPort;
module.exports = {
    rootPath: __dirname,
    fileUploadedPath: "public/uploaded/files",
    dbHost: dbHost,
    dbPort: dbPort,
    dbPath: dbPath,
    dbName: "textsystem"
}

