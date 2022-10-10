const swagger = require('./swagger');
const OpenApiClass = require('./openapi')
const parse = (swagger) => {
  const [major_version] = swagger.openapi?swagger.openapi:swagger.swagger;

  if(major_version == 3) {
    const parserOpenApi = new OpenApiClass(swagger);
    parserOpenApi.parse();
  };

  if(major_version == 2) return swagger(swagger);

};

module.exports = parse;
