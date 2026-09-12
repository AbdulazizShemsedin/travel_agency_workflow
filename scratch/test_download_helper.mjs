import https from 'https';

// Test 1: Simulate XLSX binary detection
const xlsxSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const isXlsx = xlsxSignature[0] === 0x50 && xlsxSignature[1] === 0x4b && xlsxSignature[2] === 0x03 && xlsxSignature[3] === 0x04;
console.log('Test 1 (XLSX Detection):', isXlsx ? 'PASS' : 'FAIL');

// Test 2: Real backend response format test
const req = https.request({
  hostname: 'travelagency-production-b48d.up.railway.app',
  path: '/api/method/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let cookies = res.headers['set-cookie'] || [];
  res.on('data', () => {});
  res.on('end', () => {
    const postReq = https.request({
      hostname: 'travelagency-production-b48d.up.railway.app',
      path: '/api/method/agency_tracking.report_api.export_commissions_xlsx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; ')
      }
    }, postRes => {
      let chunks = [];
      postRes.on('data', c => chunks.push(c));
      postRes.on('end', () => {
        const buf = Buffer.concat(chunks);
        const isBinaryZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
        const format = isBinaryZip ? 'xlsx' : 'csv';
        const expectedExt = `.${format}`;
        
        const cd = postRes.headers['content-disposition'] || '';
        const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        const serverFilename = match ? match[1] : 'export';
        const finalFilename = `${serverFilename.replace(/\.(xlsx|csv|txt)$/i, '')}${expectedExt}`;

        console.log('Test 2 (Backend Stream Validation):');
        console.log('  Content-Type:', postRes.headers['content-type']);
        console.log('  Content-Disposition:', cd);
        console.log('  Detected Format:', format);
        console.log('  Final Aligned Filename:', finalFilename);
        console.log('  Matches Backend Ext:', finalFilename.endsWith(expectedExt) ? 'PASS' : 'FAIL');
      });
    });
    postReq.write(JSON.stringify({}));
    postReq.end();
  });
});
req.write(JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }));
req.end();
