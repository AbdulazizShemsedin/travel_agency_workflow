import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) results.push(...walkDir(p));
    else if (/\.(ts|tsx)$/.test(f)) results.push(p);
  }
  return results;
}

const compFiles = walkDir('src/components');

console.log('=== COMPONENT AUDIT ===');
for (const p of compFiles) {
  const content = fs.readFileSync(p, 'utf8');
  const usesLegacy = content.includes('applicantApi') || content.includes('applicant_processing');
  const usesV2 = content.includes('/api/v2') || content.includes('@/lib/api/v2');
  const usesDemo = content.includes('@/lib/demo') || content.includes('demoStore');
  
  if (usesLegacy || usesDemo || usesV2) {
    console.log(`\n${p.replace(/\\/g, '/')}:`);
    if (usesLegacy) console.log('  ⚠️ USES LEGACY applicantApi / applicant_processing');
    if (usesDemo) console.log('  ⚠️ USES DEMO STORE / FIXTURES');
    if (usesV2) console.log('  ✅ USES V2 API');
  }
}
