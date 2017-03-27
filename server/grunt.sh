pkill -9 node app_textva.js
rm -rf target
grunt dev
cd target
node app_textva.js