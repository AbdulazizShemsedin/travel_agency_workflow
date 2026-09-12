import https from 'https';

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
        const isZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04;
        console.log('Is ZIP/XLSX:', isZip);
        console.log('Content-Type:', postRes.headers['content-type']);
        console.log('Content-Disposition:', postRes.headers['content-disposition']);
        const cd = postRes.headers['content-disposition'];
        const match = cd ? cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i) : null;
        console.log('Extracted filename:', match ? match[1] : null);
      });
    });
    postReq.write(JSON.stringify({}));
    postReq.end();
  });
});
req.write(JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }));
req.end();
