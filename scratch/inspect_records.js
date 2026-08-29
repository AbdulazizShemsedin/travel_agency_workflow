const https = require('https');

const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr, pwd) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ usr, pwd });
    const req = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/method/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(res.headers['set-cookie'] || []));
    });
    req.write(postData);
    req.end();
  });
}

function req(path, cookies) {
  return new Promise((resolve) => {
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      headers: { 'Cookie': cookieHeader }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    r.end();
  });
}

async function inspectAll() {
  const cookies = await login('Administrator', '1234');
  
  for (const dt of ['Applicant', 'Applicant Dossier', 'DSR', 'LMS Clearance', 'Injaz Clearance', 'Wakala Clearance', 'Embassy Clearance', 'Telesign Clearance', 'User']) {
    const res = await req('/api/resource/' + dt + '?fields=["*"]&limit_page_length=10', cookies);
    console.log(`\n=== ${dt} ===`);
    if (res.data) {
      console.log(`Count: ${res.data.length}`);
      console.log('Items:', JSON.stringify(res.data, null, 2));
    } else {
      console.log('Result:', JSON.stringify(res, null, 2));
    }
  }
}
inspectAll();
