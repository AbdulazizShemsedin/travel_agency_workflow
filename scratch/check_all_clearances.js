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
        'Accept': 'application/json',
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

function req(path, cookies, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const postData = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method: method,
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
      });
    });
    if (postData) r.write(postData);
    r.end();
  });
}

async function check() {
  const cookies = await login('Administrator', '1234');

  const dsrs = await req('/api/resource/DSR?fields=["*"]', cookies);
  console.log('DSRs:', JSON.stringify(dsrs.data, null, 2));

  const lms = await req('/api/resource/LMS Clearance?fields=["*"]', cookies);
  console.log('LMS Clearances:', JSON.stringify(lms.data, null, 2));

  const injaz = await req('/api/resource/Injaz Clearance?fields=["*"]', cookies);
  console.log('Injaz Clearances:', JSON.stringify(injaz.data, null, 2));

  const wakala = await req('/api/resource/Wakala Clearance?fields=["*"]', cookies);
  console.log('Wakala Clearances:', JSON.stringify(wakala.data, null, 2));
}

check().catch(console.error);
