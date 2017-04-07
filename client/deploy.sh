#!/bin/bash

# rsync -auzvp dist/ yun.han@192.168.10.9:/var/www/html/docfacets/
rsync -auzvp --exclude "src/Config.js" dist/ yun.han@192.168.10.9:/var/www/html/docfacets/
