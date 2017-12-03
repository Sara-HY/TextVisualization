#!/bin/bash

rsync -auzvp --exclude "config.js" --exclude "temp" --exclude "uploaded" target/ yun.han@192.168.10.9:/var/www/html/docfacet_server/
# rsync -auzvp target/ yun.han@192.168.10.9:/var/www/html/docfacet_server/
# scp -r ~/Desktop/TextVisualization/server/target/routes yun.han@192.168.10.9:/var/www/html/docfacet_server/routes
# scp -r ~/Desktop/TextVisualization/server/target/routes yun.han@192.168.10.9:/var/www/html/docfacet_server/routes
# scp -r ~/Desktop/TextVisualization/server/target/public/javascripts/ yun.han@192.168.10.9:/var/www/html/docfacet_server/public/javascripts/