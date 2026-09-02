import fs from 'fs';
import path from 'path';

const allEndpoints = JSON.parse(fs.readFileSync('scratch/all_endpoints.json', 'utf8'));

function walkDir(dir, filter = /\.(ts|tsx)$/) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) results.push(...walkDir(p, filter));
    else if (filter.test(f)) results.push(p);
  }
  return results;
}

const v2Files = walkDir('src/lib/api/v2');
const compFiles = walkDir('src/components');
const appFiles = walkDir('src/app');

const filesToSearch = [
  ...v2Files.map(f => ({ path: f, type: 'v2_api' })),
  ...compFiles.map(f => ({ path: f, type: 'component' })),
  ...appFiles.map(f => ({ path: f, type: 'app_page' })),
  { path: 'src/lib/api/applicantApi.ts', type: 'legacy_api' }
];

const fileContents = filesToSearch.map(f => ({
  path: f.path.replace(/\\/g, '/'),
  type: f.type,
  content: fs.readFileSync(f.path, 'utf8')
}));

const report = [];

for (const ep of allEndpoints) {
  const methodPath = ep.path;
  const functionName = methodPath.split('.').pop();
  
  // Find references
  const matches = [];
  for (const f of fileContents) {
    if (f.content.includes(methodPath) || (f.type !== 'v2_api' && f.content.includes(functionName))) {
      matches.push(f);
    }
  }

  const v2Callers = matches.filter(m => m.type === 'v2_api');
  const pageCallers = matches.filter(m => m.type === 'app_page');
  const compCallers = matches.filter(m => m.type === 'component');
  const legacyCallers = matches.filter(m => m.type === 'legacy_api');

  report.push({
    endpoint: ep.path,
    httpMethod: ep.method,
    summary: ep.summary,
    roles: ep.roles,
    parameters: ep.parameters,
    requestBody: ep.requestBody,
    responses: ep.responses,
    v2Callers: v2Callers.map(m => m.path),
    pageCallers: pageCallers.map(m => m.path),
    compCallers: compCallers.map(m => m.path),
    legacyCallers: legacyCallers.map(m => m.path),
    hasV2Wrapper: v2Callers.length > 0,
    hasUIUsage: (pageCallers.length + compCallers.length) > 0
  });
}

fs.writeFileSync('scratch/swagger_frontend_mapping.json', JSON.stringify(report, null, 2));

console.log(`Total Swagger Endpoints: ${report.length}`);
const withV2Wrapper = report.filter(r => r.hasV2Wrapper);
const withUI = report.filter(r => r.hasUIUsage);
const noUI = report.filter(r => !r.hasUIUsage);
const noWrapper = report.filter(r => !r.hasV2Wrapper);

console.log(`Endpoints with V2 API client wrapper: ${withV2Wrapper.length}`);
console.log(`Endpoints without V2 API client wrapper: ${noWrapper.length}`);
console.log(`Endpoints used in UI (pages/components): ${withUI.length}`);
console.log(`Endpoints with NO UI usage: ${noUI.length}`);

console.log('\n--- ENDPOINTS WITH NO V2 WRAPPER ---');
noWrapper.forEach(r => console.log(`  ${r.httpMethod} ${r.endpoint}`));

console.log('\n--- ENDPOINTS WITH NO FRONTEND UI USAGE ---');
noUI.forEach(r => console.log(`  ${r.httpMethod} ${r.endpoint} (${r.summary})`));
