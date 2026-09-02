import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) results.push(...walkDir(p));
    else if (/\.(ts|tsx|js|mjs)$/.test(f)) results.push(p);
  }
  return results;
}

const files = walkDir('src');
const apiCalls = [];

const pattern = /(?:['"`])(\/api\/(?:method|resource)\/[^'"`\s\?]+)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let match;
    while ((match = pattern.exec(line)) !== null) {
      apiCalls.push({
        file: file.replace(/\\/g, '/'),
        line: idx + 1,
        endpoint: match[1],
        codeSnippet: line.trim()
      });
    }
  });
}

console.log(`Found ${apiCalls.length} raw API string endpoints in frontend code.`);
fs.writeFileSync('scratch/all_frontend_api_calls.json', JSON.stringify(apiCalls, null, 2));

const uniqueEndpoints = [...new Set(apiCalls.map(c => c.endpoint))].sort();
console.log(`\nUnique endpoints (${uniqueEndpoints.length}):`);
uniqueEndpoints.forEach(ep => console.log(' ', ep));
