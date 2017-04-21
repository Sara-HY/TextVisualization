#!/bin/bash

rsync -auzvp --exclude "config.js" --exclude "temp" target/ yun.han@192.168.10.9:/var/www/html/docfacet_server/
# rsync -auzvp target/ yun.han@192.168.10.9:/var/www/html/docfacet_server/
