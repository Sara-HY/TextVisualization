var exec = require("child_process").exec; 

module.exports = {
    safeDBKey: function(key){
        key = key.replace(/\./g, "\uFF0E");
        key = key.replace(/\$/g, "\uFF04");
        return key;
    },

    randomString: function(len) {
        len = len || 32;　　
        var $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
        var maxPos = $chars.length;　　
        var pwd = '';　　
        for (var i = 0; i < len; i++) {
            pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
        }　　
        return pwd;
    },

    syncExec: function(cmd) {
        return new Promise((resolve) => {
            exec(cmd, {maxBuffer: 1024 * 10000}, function(err, stdout, stderr) {
                var data = {
                    err: err,
                    stdout: stdout,
                    stderr: stderr
                }
                resolve(data);
            })   
        })
    }
}