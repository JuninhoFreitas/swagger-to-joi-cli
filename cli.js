const SWAGGER_FILENAME = process.argv.slice(2)[0]
const swaggerToJoi = require('./index');
const fs = require('fs');
if(!fs.existsSync(SWAGGER_FILENAME)){
  return console.log(`
  Invalid swagger file: ${SWAGGER_FILENAME}
  Verify if the file exists or is correct

  Correct way to use this CLI:
  'node cli.js ./FILENAME.json'
  `)
}
const swagger = require(SWAGGER_FILENAME);
swaggerToJoi(swagger);
