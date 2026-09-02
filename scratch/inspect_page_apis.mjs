import fs from 'fs';

const pages = [
  'src/app/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/applicants/page.tsx',
  'src/app/applicants/new/page.tsx',
  'src/app/applicants/[id]/page.tsx',
  'src/app/applicants/[id]/edit/page.tsx',
  'src/app/applicants/[id]/cv/page.tsx',
  'src/app/applicants/[id]/contractor-doc/page.tsx',
  'src/app/agent/page.tsx',
  'src/app/agent/discovery/page.tsx',
  'src/app/agent/reserved/page.tsx',
  'src/app/agent/commission/page.tsx',
  'src/app/agent/complaints/page.tsx',
  'src/app/commission/page.tsx',
  'src/app/complaints/page.tsx',
  'src/app/contractors/page.tsx',
  'src/app/employees/page.tsx',
  'src/app/expenses-income/page.tsx',
  'src/app/login/page.tsx',
  'src/app/notifications/page.tsx',
  'src/app/reports/page.tsx',
  'src/app/settings/page.tsx'
];

for (const p of pages) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const apiImports = [];
    content.split('\n').forEach(line => {
      if (line.includes('from ') && (line.includes('/api') || line.includes('demo') || line.includes('store'))) {
        apiImports.push(line.trim());
      }
    });
    console.log(`\n=== ${p} ===`);
    apiImports.forEach(imp => console.log('  ', imp));
    if (content.includes('applicantApi')) console.log('   ⚠️ USES applicantApi (Legacy V1)');
    if (content.includes('/api/v2') || content.includes('@/lib/api/v2')) console.log('   ✅ USES V2 API');
    if (content.includes('demoStore') || content.includes('@/lib/demo')) console.log('   ⚠️ USES Demo Fixtures/Store');
  }
}
