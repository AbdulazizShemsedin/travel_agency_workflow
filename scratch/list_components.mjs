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
    } else {
      results.push(filePath);
    }
  }
  return results;
}

const compFiles = walkDir('src/components');
console.log('--- COMPONENTS ---');
compFiles.forEach(f => console.log(' ', f.replace(/\\/g, '/')));
