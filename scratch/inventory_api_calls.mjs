import fs from 'fs';
import path from 'path';

const searchDir = './src';
const results = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Look for api patterns
    const matches = [
      ...line.matchAll(/\/api\/method\/[a-zA-Z0-9_.]+/g),
      ...line.matchAll(/\/api\/resource\/[a-zA-Z0-9_.]+/g),
      ...line.matchAll(/applicant_processing\.[a-zA-Z0-9_.]+/g),
      ...line.matchAll(/agency_tracking\.[a-zA-Z0-9_.]+/g),
      ...line.matchAll(/assignEmployeeApi|fetchProcessingData|updateLmsClearanceApi|submitDsrStampApi/g),
    ];

    for (const m of matches) {
      results.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        match: m[0],
        snippet: line.trim().slice(0, 140),
      });
    }
  });
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!f.startsWith('.') && f !== 'node_modules' && f !== '.next') {
        walk(full);
      }
    } else if (/\.(tsx?|jsx?)$/.test(f)) {
      scanFile(full);
    }
  }
}

walk(searchDir);

console.log(`Found ${results.length} API occurrences across repository.`);
const grouped = {};
for (const r of results) {
  if (!grouped[r.match]) grouped[r.match] = [];
  grouped[r.match].push(`${r.file}:${r.line}`);
}

Object.entries(grouped).sort().forEach(([match, locs]) => {
  console.log(`\n[${locs.length}x] ${match}`);
  locs.slice(0, 5).forEach(l => console.log('   ', l));
  if (locs.length > 5) console.log(`    ...and ${locs.length - 5} more`);
});
