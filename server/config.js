// var dbHost = "192.168.10.9";
var dbHost = "127.0.0.1";
var dbPort = 27017;
var dbPath = "mongodb://" + dbHost + ":" + dbPort;
// var webPath = "http://localhost:8080/TextVisualization/client/dist/index.html?datasetid="
// var serverPath = "http://vis.pku.eud.cn/docfacetserver"
var serverPath = ""
var webPath = "http://localhost:8000/index.html?datasetid="

module.exports = {
    rootPath: __dirname,
    fileUploadedPath: "/public/uploaded/files",
    fileCrawlerPath: "/crawler",
    webPath: webPath,
    serverPath: serverPath,
    dbHost: dbHost,
    dbPort: dbPort,
    dbPath: dbPath,
    dbName: "docFacets"
}