const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr = 'Administrator', pwd = '1234') {
  return new Promise(res => {
    const data = JSON.stringify({ usr, pwd });
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
  return new Promise((resolve, reject) => {
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
          resolve({ status: resp.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: resp.statusCode, raw: d });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const cookies = await login();
  console.log('Logged in as Administrator');

  // Fetch existing LMS-00004
  const lms = await req('/api/resource/LMS Clearance/LMS-00004', 'GET', null, cookies);
  const fin = (lms.body?.data?.financials || []).map(f => ({
    ...f,
    category: f.category || 'Agency Commission'
  }));

  // Update LMS Clearance with tutu@gmail.com and status Issued
  const putLms = await req('/api/resource/LMS Clearance/LMS-00004', 'PUT', {
    status: 'Issued',
    employee: 'tutu@gmail.com',
    issued_on: '2026-08-26',
    financials: fin
  }, cookies);

  console.log('Update result status:', putLms.status);
  console.log('LMS Clearance data:', putLms.body?.data?.name, 'Status:', putLms.body?.data?.status, 'Employee:', putLms.body?.data?.employee);
}

run().catch(console.error);
