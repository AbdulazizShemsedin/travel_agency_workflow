import fs from 'fs';
import path from 'path';

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

// Step 1: Map each endpoint to the exported V2 function name
const endpointToFn = {};

for (const file of v2Files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  // Look for exported async functions
  // and which /api/method/ they call inside their body
  let currentFn = null;
  let fnStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const exportMatch = line.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
    if (exportMatch) {
      currentFn = exportMatch[1];
      fnStartLine = i;
    }
    
    const epMatch = line.match(/\/api\/method\/([a-zA-Z0-9_\.]+)/);
    if (epMatch) {
      const fullEndpoint = '/api/method/' + epMatch[1];
      if (!endpointToFn[fullEndpoint]) endpointToFn[fullEndpoint] = [];
      if (currentFn) {
        endpointToFn[fullEndpoint].push({
          fnName: currentFn,
          file: file.replace(/\\/g, '/')
        });
      }
    }
  }
}

console.log('Endpoints mapped to exported V2 functions:', Object.keys(endpointToFn).length);

// Step 2: Search for each exported V2 function across all components and app pages
const allConsumerFiles = [...compFiles, ...appFiles].map(f => ({
  path: f.replace(/\\/g, '/'),
  content: fs.readFileSync(f, 'utf8')
}));

const fnUsage = {};
for (const [ep, fns] of Object.entries(endpointToFn)) {
  fnUsage[ep] = {
    v2Functions: fns,
    consumers: []
  };
  
  for (const { fnName } of fns) {
    for (const consumer of allConsumerFiles) {
      // Check if consumer imports or calls fnName (word boundary)
      const regex = new RegExp(`\\b${fnName}\\b`);
      if (regex.test(consumer.content)) {
        if (!fnUsage[ep].consumers.includes(consumer.path)) {
          fnUsage[ep].consumers.push(consumer.path);
        }
      }
    }
  }
}

fs.writeFileSync('scratch/v2_fn_usage.json', JSON.stringify(fnUsage, null, 2));

console.log('\nSample mapping:');
Object.entries(fnUsage).slice(0, 10).forEach(([ep, data]) => {
  console.log(`\nEndpoint: ${ep}`);
  console.log(`  Functions: ${data.v2Functions.map(f => f.fnName).join(', ')}`);
  console.log(`  Consumers (${data.consumers.length}): ${data.consumers.join(', ')}`);
});
