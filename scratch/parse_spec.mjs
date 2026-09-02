import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const openapiTxtPath = path.resolve('src/Assets/openapi 3.1.0.txt');
const swaggerJsonPath = path.resolve('src/Assets/new swagger.json');

console.log('Loading OpenAPI 3.1.0...');
const openapiContent = fs.readFileSync(openapiTxtPath, 'utf8');
const openapiDoc = yaml.load(openapiContent);

console.log('OpenAPI Title:', openapiDoc.info?.title);
console.log('OpenAPI Version:', openapiDoc.openapi);
const openapiPaths = Object.keys(openapiDoc.paths || {});
console.log(`OpenAPI total paths: ${openapiPaths.length}`);

console.log('\nLoading Swagger 2.0...');
const swaggerContent = fs.readFileSync(swaggerJsonPath, 'utf8');
const swaggerDoc = JSON.parse(swaggerContent);

console.log('Swagger Title:', swaggerDoc.info?.title);
console.log('Swagger Version:', swaggerDoc.swagger);
const swaggerPaths = Object.keys(swaggerDoc.paths || {});
console.log(`Swagger total paths: ${swaggerPaths.length}`);

// Compare paths
const openapiSet = new Set(openapiPaths);
const swaggerSet = new Set(swaggerPaths);

const inOpenApiOnly = openapiPaths.filter(p => !swaggerSet.has(p));
const inSwaggerOnly = swaggerPaths.filter(p => !openapiSet.has(p));

console.log(`\nIn OpenAPI only (${inOpenApiOnly.length}):`, inOpenApiOnly);
console.log(`\nIn Swagger only (${inSwaggerOnly.length}):`, inSwaggerOnly);

// Summarize endpoints by module / prefix
const moduleCounts = {};
for (const p of openapiPaths) {
  const parts = p.replace('/api/method/', '').split('.');
  const mod = parts.length > 1 ? parts[1] : parts[0];
  moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
}
console.log('\nEndpoints per module in OpenAPI 3.1.0:', moduleCounts);

// Check schemas
const openapiSchemas = Object.keys(openapiDoc.components?.schemas || {});
console.log(`\nOpenAPI components.schemas count: ${openapiSchemas.length}`);
console.log('Schemas:', openapiSchemas);

const swaggerDefinitions = Object.keys(swaggerDoc.definitions || {});
console.log(`\nSwagger definitions count: ${swaggerDefinitions.length}`);
console.log('Definitions:', swaggerDefinitions);
