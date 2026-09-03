import fs from 'fs';

const swagger = JSON.parse(fs.readFileSync('src/Assets/new swagger.json', 'utf8'));

console.log('=== ALL PLACEMENT & PORTAL ENDPOINTS ===');
for (const [path, methods] of Object.entries(swagger.paths)) {
  for (const [method, def] of Object.entries(methods)) {
    if (path.includes('portal') || path.includes('placement') || path.includes('contractor')) {
      console.log(`\nEndpoint: ${path} [${method.toUpperCase()}]`);
      console.log(`Summary: ${def.summary}`);
      console.log(`Roles: ${(def['x-roles'] || []).join(', ')}`);
      console.log(`Params: ${(def.parameters || []).map(p => p.name).join(', ')}`);
    }
  }
}
