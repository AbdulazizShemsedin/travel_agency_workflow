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
  const adminCookies = await login();
  console.log('Logged in as Administrator');

  // Let's check roles and permissions for LMS Clearance on Frappe
  // In Frappe, let's check DocType LMS Clearance permissions in doc
  const lmsDocType = await req('/api/resource/DocType/LMS Clearance', 'GET', null, adminCookies);
  console.log('LMS Clearance permissions:', JSON.stringify(lmsDocType.body?.data?.permissions, null, 2));

  console.log('\nInjaz Clearance permissions:', JSON.stringify((await req('/api/resource/DocType/Injaz Clearance', 'GET', null, adminCookies)).body?.data?.permissions, null, 2));
  console.log('\nWakala Clearance permissions:', JSON.stringify((await req('/api/resource/DocType/Wakala Clearance', 'GET', null, adminCookies)).body?.data?.permissions, null, 2));
}

run().catch(console.error);
