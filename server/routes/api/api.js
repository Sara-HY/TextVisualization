var express = require("express");
var router = express.Router();

var dataSystem = require("./datasystem");
var algorithm = require("./algorithm");
var user = require("./user");
var data = require("./data");

router.use("/datasystem", dataSystem);
router.use("/user", user);
router.use("/data", data);
router.use("/algorithm", algorithm);

module.exports = router;