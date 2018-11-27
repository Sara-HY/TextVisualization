# Text Visualization

Statistical and Visual Analysis on the Text Data such as news.

## Prerequisite
```bash
1. NodeJS & npm
2. bower     npm install bower -g
3. grunt     npm install grunt -g
4. traceur   npm install traceur@^0.0.96 -g
5. MongoDB
```

### Run

### Server
``` bash
1. Config the dbHost and dbPort of the database in 'server/config.js'
2. npm install
3. bower install
4. grunt dev
5. cd target
6. node app_textva.js
7. Access localhost:8023 (You can change the port 8023 in 'app_textva.js'.)
```

### Client
```bash
1. Set the the server address in 'client/src/Config.js'. (For example: localhost:5003)
2. npm install
3. bower install
4. grunt init 
5. grunt dev
8. cd dist
9. Start http server in the 'client/dist':
    1. cd client/dist
    2. python -m SimpleHTTPServer 8000
    3. Access http://localhost:8000/index.html?datasetid=[dataset_id] 
 (You can also change the port 8000.)
```

## License
[MIT](https://opensource.org/licenses/MIT)
