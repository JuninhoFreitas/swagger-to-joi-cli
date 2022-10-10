# swagger-to-joi

Swagger to Joi via CLI converter

Generates text for Joi definitions.

Example usage:

```bash
node cli.js ./openapi.json
```

```

/*
Outputs:

Parsing Route: /test/
Parsing Verb: post
RequestBody:
joi.object().keys({
token_id: joi.string().description(`Reference code of the encoded data to be decoded.`),
})
200
Response Joi:
joi.object().keys({
data: joi.string().description(`Decoded data in plain text`),
})
*/

```

Used for openAPI 3.0.0. Components used in schema.

### Version
actually supports only OpenAPI 3.x.x

Its basically a Fork version of the swagger-to-joi library,
but, working and trying to clean the code.

