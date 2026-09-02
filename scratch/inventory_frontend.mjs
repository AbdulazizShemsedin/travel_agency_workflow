import fs from 'fs';
import path from 'path';

function walkDir(dir, filterExt = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath, filterExt));
    } else {
      if (filterExt.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const appFiles = walkDir('src/app');
const pageFiles = appFiles.filter(f => f.endsWith('page.tsx'));
const routeFiles = appFiles.filter(f => f.endsWith('route.ts'));
const compFiles = walkDir('src/components');
const libFiles = walkDir('src/lib');

console.log('--- PAGE ROUTES (page.tsx) ---');
pageFiles.forEach(f => console.log(' ', f.replace(/\\/g, '/')));

console.log('\n--- API ROUTES (route.ts) ---');
routeFiles.forEach(f => console.log(' ', f.replace(/\\/g, '/')));

console.log(`\nTotal components: ${compFiles.length}`);
console.log(`Total lib files: ${libFiles.length}`);
