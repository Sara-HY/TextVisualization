#!/bin/bash

rsync -auzvp --exclude "config.js" --exclude "temp" target/ zhenhuang.wang@192.168.10.9:/var/www/html/textva_server/
