var Swig = require("swig"),
    Fs = require("fs"),
    Path = require("path"),
    Walk = require("walk"),
    Mkdirp = require('mkdirp');


var targetDir = "dist/"
var templateDir = "templates/"

Swig.setDefaults({
    autoescape: false,
    varControls: ['<<', '>>'],
    tagControls: ['<%', '%>'],
    cmtControls: ['<#', '#>']
});

var tplList = [];
walk( templateDir, tplList );



for (var i = 0; i < tplList.length; i++) {
    var tpl = Swig.compileFile(tplList[i]);
    var html =  tpl()
    writeHtmlFile(targetDir + tplList[i], html);
}
Fs.rename(Path.join(targetDir, templateDir, "index.html"), Path.join(targetDir, "index.html"));


function writeHtmlFile(outFileName, html) {
    console.log(outFileName);
    if (!Fs.existsSync(Path.dirname(outFileName)))
        Mkdirp.sync(Path.dirname(outFileName));
    Fs.writeFileSync(outFileName, html);
}

function walk(path, files) {
    var walkerOptions = {
        followLinks: true,
        listeners: {
            file: function (root, fileStats, next) {
                var name = Path.join(root, fileStats.name);
                if (Path.extname(name) == ".html") {
                    files.push(name);
                }
                next();
            }
        }
    }
    var walker = Walk.walkSync(path, walkerOptions);
}