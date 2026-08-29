const http = require('http');

async function loginAndSave() {
  // Let's test calling through Next.js proxy route
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      status: 'Issued',
      employee: 'tutu@gmail.com',
      issued_on: '2026-08-26'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/resource/LMS%20Clearance/LMS-00004',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

loginAndSave().then(res => {
  console.log('Result:', res.status, res.body.slice(0, 300));
}).catch(console.error);
