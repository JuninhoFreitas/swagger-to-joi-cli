const DEV_ENV = true;
const dlog = (...opts) => {
  if(DEV_ENV) console.log(...opts);

}
const flog = (...opts) => {
  console.log(...opts);
}
const colors = require('colors');
colors.enable();
module.exports = class OpenApiParser {
  constructor(swagger = {}) {
    this.swagger = swagger;
    this.routes = swagger.paths;
    this.components = swagger.components
    this.options = {};
    this.intend = '  '
  }

  parse() {
    flog('\n\nLoaded Routes: %s', this.routes);
    const containRoutes = Object.keys(this.routes).length > 0;
    if (!containRoutes) return;
    for (const route in this.routes) {
      // flog('                  '.bgMagenta);
      flog('Parsing Route: %s'.bgGreen.bold, route);
      const processingRoute = this.routes[route]
      for (const verb in processingRoute) {
        const routeMapped = processingRoute[verb]
        flog('Parsing Verb: %s'.white, verb);
        const {
          requestBody,
          responses
        } = routeMapped;
        if (requestBody) {
          const joiRequestBody = this.getRequestBodyText(requestBody);
          flog('RequestBody:\n'.bold.green, joiRequestBody)
        }
        if (responses) {
          for (const httpCode in responses) {
            flog(`${httpCode}`.bgCyan)
            const joiResponseBody = this.getResponseBodyText(responses[httpCode]);
            if(joiResponseBody) flog('Response Joi:\n'.bold.green,joiResponseBody)
          }
        }
      }
    }
  };

  getRequestBodyText(requestBody = {}) {
    const {
      content
    } = requestBody;
    for (let mediaType in content) {
      dlog(content[mediaType])
      return this.getText(content[mediaType]);
    }
    if (requestBody['$ref']) {
      dlog('if(requestBody[$ref])')
      return this.getText(requestBody);
    }
  };

  getText(parameter) {
    let finalText = '';
    if (parameter) {
      const param = parameter.schema? parameter.schema : parameter;
      let component;
      if ('$ref' in param) {
        dlog('Contains $ref')
        component = this.findComponentByPath(param.$ref, this.components);
      }
      if ('allOf' in param && ('$ref' in param.allOf[0])) {
        dlog('Contains allOf')
        component = this.findComponentByPath(param.allOf[0].$ref)
      }
      if ('oneOf' in param && ('$ref' in param.oneOf[0])) {
        dlog('Contains oneOf')
        component = this.findComponentByPath(param.oneOf[0].$ref)
      }
      if ('anyOf' in param && ('$ref' in param.anyOf[0])) {
        dlog('Contains anyOf')
        component = this.findComponentByPath(param.anyOf[0].$ref)
      }

      // dlog('Component '.bgRed, component)
      parameter.schema = component;
    }

    if (parameter['$ref']) {
      parameter = this.findComponentByPath(parameter['$ref']);
    }

    let type;

    if (parameter.schema) {
      if (parameter.schema.type) type = parameter.schema.type
    } else {
      if (parameter.type) type = parameter.type
    }

    if(!type)console.log('Not Found TYPE to Parameter: ', parameter)
    switch (type) {
      case 'string':
        finalText = this._getKeyStringText(parameter);
        break;
      case 'boolean':
        finalText = this._getKeyBooleanText(parameter);
        break;
      case 'integer':
        finalText = this._getKeyIntegerText(parameter);
        break;
      case 'number':
        finalText = this._getKeyNumberText(parameter);
        break;
      case 'array':
        finalText = this._getKeyArrayText(parameter);
        break;
      case 'object':
        finalText = this._getKeyObjectText(parameter);
        break;
      default:
        throw new Error(`Unexpected parameter type ${type} in parameter named ${parameter.name}.`);
    }

    return finalText;
  };

  getResponseBodyText(responseBody) {
    const {
      content
    } = responseBody;

    for (let mediaType in content) {
      const schema =  content[mediaType].schema;
      if (schema.type == 'array') {
        // console.log('schema',schema)
        schema.type = 'object'
        schema.properties = {
          ...schema.items.properties
        }
        delete schema.items;
        // console.log('schema',schema)

        return `joi.array().items(
        ${this.getText(content[mediaType])})`;
      } else {
        schema.type = 'object'
        return this.getText(content[mediaType]);
      }
    }
    if ('$ref' in responseBody) {
      return this.getText(requestBody);
    }
  };

  findComponentByPath(path) {
    const componentPath = path.replace('#/components/', '');

    const foundComponent = componentPath.split('/').reduce((o, i) => o[i], this.components);

    if (!foundComponent) {
      throw Error(`component ${componentPath} not found.`);
    }
    return foundComponent;
  };

  _getKeyStringText(parameter) {
    const correctQuote = this.options.singleQuote === true ? '\'' : '"';
    let definition = 'joi.string()';
    const format = this._getFormat(parameter);
    if (format === 'uuid') {
      definition += '.guid()';
    } else if (format === 'email') {
      definition += '.email()';
    } else if (format === 'uri') {
      definition += '.uri()';
    } else if (format === 'hostname') {
      definition += '.hostname()';
    }

    if ('minLength' in parameter) {
      if (parameter.minLength === 0) {
        definition += `.allow(${correctQuote}${correctQuote})`;
      }
    }

    if ('pattern' in parameter) {
      definition += `.regex(/${parameter.pattern}/)`;
    }

    if ('enum' in parameter) {
      definition += `.valid('${parameter.enum.join('\', \'')}')`;
    }
    return this._getKeyText(parameter, definition);
  }
  _getKeyBooleanText(parameter) {
    const definition = 'joi.boolean()';

    return this._getKeyText(parameter, definition);
  }
  _getKeyIntegerText(parameter) {
    let definition = 'joi.number().integer()';

    definition += this._getCommonNumberText(parameter);

    return this._getKeyText(parameter, definition);
  }
  _getKeyNumberText(parameter) {
    let definition = 'joi.number()';

    definition += this._getCommonNumberText(parameter);

    return this._getKeyText(parameter, definition);
  }
  _getKeyArrayText(parameter) {
    if (!('level' in parameter)) {
      // eslint-disable-next-line no-param-reassign
      parameter.level = 0;
    }

    let definition = `joi.array().items(
      `;
    dlog('PARAMETER IN ARRAY TYPE: ',parameter);
    if ('items' in parameter) {
      // eslint-disable-next-line no-use-before-define
      if(parameter.items.properties){
      definition += this.getText({
        ...parameter.items,
        level: parameter.level + 1
      })
    };
    } else if ('items' in parameter.schema) {
      // eslint-disable-next-line no-use-before-define
      definition += this.getText({
        ...parameter.schema.items,
        level: parameter.level + 1
      });
    } else {
      throw Error('Array definition doesn\'t have items.');
    }

    definition += `
  ${this.intend.repeat(parameter.level)})`;

    return this._getKeyText(parameter, definition);
  }
  _getKeyObjectText(parameter) {
    if (!('level' in parameter)) {
      // eslint-disable-next-line no-param-reassign
      parameter.level = 0;
    }

    let definition = `joi.object().keys({
`;
    let properties = parameter.schema ? parameter.schema.properties : parameter.properties;
    if (!properties) properties = parameter.schema
    if (properties) {
      Object.keys(properties).forEach((propertyName) => {
        const property = {
          ...properties[propertyName],
          name: propertyName,
          level: parameter.level + 1
        };

        // check override
        if ('overrideKeys' in this.options) {
          if (propertyName in this.options.overrideKeys) {
            definition += this._getKeyText(property, this.options.overrideKeys[propertyName], false);
            return;
          }
        }

        // eslint-disable-next-line no-use-before-define
        definition += `${this.getText(property)}`;
      });
    } else {
      throw Error('Object definition doesn\'t have properties.');
    }

    definition = `${definition.trim().substr(0, definition.length - 1)}
${this.intend.repeat(parameter.level)}})`;

    if ('additionalProperties' in parameter && parameter.additionalProperties === true) {
      definition += '.unknown()';
    }

    return this._getKeyText(parameter, definition);
  };

  _getKeyText(parameter, definition, addCommonProperties = true) {
    const commonProperties = addCommonProperties ? this._getCommonProperties(parameter) : '';
    if (!('name' in parameter)) return `${definition}${commonProperties}`;

    const isSimpleKeyName = parameter.name.match(/^[\w$]+$/);
    const quoteSign = isSimpleKeyName ? '' : '\'';

    return `${quoteSign}${parameter.name}${quoteSign}: ${definition}${commonProperties},
      `;
  };
  _getCommonProperties(parameter) {
    let commonProperties = '';
    if (parameter.required) {
      commonProperties += '.required()';
    }
    if (parameter.description) {
      commonProperties += `.description(\`${parameter.description.replace("'", "\\'")}\`)`;
    }
    // check if there is a x-joi-add
    if (parameter['x-joi-add']) {
      commonProperties += parameter['x-joi-add'];
    }

    return commonProperties;
  }
  _getFormat(parameter) {
    if (parameter.format === 'uuid' || parameter.format === 'guid' || (parameter.schema && parameter.schema.format === 'uuid') || (parameter.schema && parameter.schema.format === 'guid')) {
      return 'uuid';
    }
    if (parameter.format === 'email' || (parameter.schema && parameter.schema.format === 'email')) {
      return 'email';
    }
    if (parameter.format === 'uri' || (parameter.schema && parameter.schema.format === 'uri')) {
      return 'uri';
    }
    if (parameter.format === 'hostname' || (parameter.schema && parameter.schema.format === 'hostname')) {
      return 'hostname';
    }
  }

}
