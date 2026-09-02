import fs from 'fs';
import yaml from 'js-yaml';

const doc = yaml.load(fs.readFileSync('src/Assets/openapi 3.1.0.txt', 'utf8'));

let withDetailedSchema = 0;
let withGenericObject = 0;

for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(pathItem)) {
    const resp200 = op.responses?.['200'];
    const schema = resp200?.content?.['application/json']?.schema;
    const msgProps = schema?.properties?.message?.properties;
    if (msgProps) {
      withDetailedSchema++;
    } else {
      withGenericObject++;
    }
  }
}

console.log(`Endpoints with detailed response properties: ${withDetailedSchema}`);
console.log(`Endpoints with generic response object: ${withGenericObject}`);
