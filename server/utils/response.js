module.exports = {
    success : function(res, data) {
        var d = {
            "status": "success",
        }
        if (data != null)
            d.data = data;
        res.json(d);
        res.end();
    },
    error: function(res, message) {
        console.log("error", message);
        var d = {
            "status": "error",
            "message": message
        }
        res.status(500).json(JSON.stringify(d));
    },
    test: function() {
        console.log("test");
    }
}