import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const openapiTxtPath = path.resolve('src/Assets/openapi 3.1.0.txt');
const openapiDoc = yaml.load(fs.readFileSync(openapiTxtPath, 'utf8'));

const endpoints = [];

for (const [pathKey, pathItem] of Object.entries(openapiDoc.paths)) {
  for (const [method, op] of Object.entries(pathItem)) {
    if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
      endpoints.push({
        path: pathKey,
        method: method.toUpperCase(),
        summary: op.summary || '',
        description: op.description || '',
        tags: op.tags || [],
        roles: op['x-roles'] || [],
        security: op.security || [],
        parameters: op.parameters || [],
        requestBody: op.requestBody || null,
        responses: Object.keys(op.responses || {})
      });
    }
  }
}

console.log(`Total operations extracted: ${endpoints.length}`);
fs.writeFileSync('scratch/all_endpoints.json', JSON.stringify(endpoints, null, 2));

// Group by tag/module
const byModule = {};
for (const ep of endpoints) {
  const mod = ep.path.startsWith('/api/method/agency_tracking.')
    ? ep.path.replace('/api/method/agency_tracking.', '').split('.')[0]
    : ep.path.replace('/api/method/', '');
  if (!byModule[mod]) byModule[mod] = [];
  byModule[mod].push(ep);
}

console.log('\nModules summary:');
for (const [mod, list] of Object.entries(byModule)) {
  console.log(`  ${mod}: ${list.length} endpoints`);
}
