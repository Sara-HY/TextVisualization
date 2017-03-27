var fs = require("fs");
var csv = require('csv');
var Baby = require('babyparse');

// var parser = csv.parse({delimiter: ','}, function(err, data){
//   console.log(data);
// });

var fileContent = fs.readFileSync("test/card.csv", "utf-8");
// var dd  = csv.parse(fileContent, {delimiter: ","}, function(err, data) {
//     // console.log(data);
// })

// console.log(dd)
// // fs.createReadStream("test/card.csv").pipe(parser);
// 
var data = Baby.parse(fileContent);
console.log(data.data);