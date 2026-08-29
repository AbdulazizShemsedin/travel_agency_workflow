const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login() {
  return new Promise(res => {
    const data = JSON.stringify({ usr: 'Administrator', pwd: '1234' });
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/method/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => res(resp.headers['set-cookie'] || []));
    });
    r.write(data);
    r.end();
  });
}

function req(path, method, body, cookies) {
  return new Promise(res => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try {
          res({ status: resp.statusCode, body: JSON.parse(d) });
        } catch {
          res({ status: resp.statusCode, raw: d });
        }
      });
    });
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const cookies = await login();
  console.log('Logged in');

  // Test 1: PUT with None
  const putNone = await req('/api/resource/LMS Clearance/None', 'PUT', { status: 'Issued' }, cookies);
  console.log('PUT /LMS Clearance/None response:', putNone.status, putNone.raw || putNone.body);

  // Test 2: PUT with valid LMS-00004 and employee tutu@gmail.com
  const putValid = await req('/api/resource/LMS Clearance/LMS-00004', 'PUT', {
    status: 'Issued',
    employee: 'tutu@gmail.com'
  }, cookies);
  console.log('PUT /LMS Clearance/LMS-00004 with tutu@gmail.com:', putValid.status, putValid.body?.data);

  // Test 3: PUT with valid LMS-00004 and employee Administrator
  const putAdmin = await req('/api/resource/LMS Clearance/LMS-00004', 'PUT', {
    status: 'Issued',
    employee: 'Administrator'
  }, cookies);
  console.log('PUT /LMS Clearance/LMS-00004 with Administrator:', putAdmin.status, putAdmin.body?.data);
}

run().catch(console.error);
