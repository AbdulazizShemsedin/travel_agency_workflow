import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (/\.(ts|tsx|js|mjs|json)$/.test(file)) {
      results.push(filePath);
    }
  }
  return results;
}

const keywords = [
  'mock',
  'dummy',
  'fake',
  'fixture',
  'demo',
  'fallback',
  'localStorage',
  'applicant_processing'
];

const files = walkDir('src');
const findings = {};
keywords.forEach(k => findings[k] = []);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    keywords.forEach(k => {
      // Case insensitive match
      const regex = new RegExp(`\\b${k}\\b`, 'i');
      if (regex.test(line)) {
        findings[k].push({
          file: file.replace(/\\/g, '/'),
          line: idx + 1,
          content: line.trim()
        });
      }
    });
  });
}

console.log('=== SEARCH RESULTS SUMMARY ===');
for (const k of keywords) {
  const fileCount = new Set(findings[k].map(f => f.file)).size;
  console.log(`Keyword "${k}": ${findings[k].length} occurrences across ${fileCount} files`);
}

fs.writeFileSync('scratch/search_keyword_findings.json', JSON.stringify(findings, null, 2));
console.log('\nWrote details to scratch/search_keyword_findings.json');
