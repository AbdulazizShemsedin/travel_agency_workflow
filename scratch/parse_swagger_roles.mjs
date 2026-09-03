import fs from 'fs';

const swagger = JSON.parse(fs.readFileSync('src/Assets/new swagger.json', 'utf8'));

const endpointsByTag = {};
const endpointsByRole = {};

for (const [path, methods] of Object.entries(swagger.paths)) {
  for (const [method, def] of Object.entries(methods)) {
    const tag = def.tags?.[0] || 'Uncategorized';
    const roles = def['x-roles'] || [];
    if (!endpointsByTag[tag]) endpointsByTag[tag] = [];
    endpointsByTag[tag].push({ path, method, summary: def.summary, roles });

    for (const r of roles) {
      if (!endpointsByRole[r]) endpointsByRole[r] = [];
      endpointsByRole[r].push(path);
    }
  }
}

console.log('--- ALL TAGS IN NEW SWAGGER ---');
console.log(Object.keys(endpointsByTag));

console.log('\n--- ENDPOINTS WITH "Foreign Agency" IN ROLES OR TAGS ---');
for (const [tag, eps] of Object.entries(endpointsByTag)) {
  for (const ep of eps) {
    if (tag.toLowerCase().includes('foreign') || tag.toLowerCase().includes('portal') || ep.roles.some(r => r.toLowerCase().includes('foreign'))) {
      console.log(`[${tag}] ${ep.path} (roles: ${ep.roles.join(', ')})`);
    }
  }
}
