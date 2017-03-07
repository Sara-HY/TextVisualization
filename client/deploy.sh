#!/bin/bash

rsync -auzvp --exclude "src/Config.js" dist/ zhenhuang.wang@192.168.10.9:/var/www/html/textva/