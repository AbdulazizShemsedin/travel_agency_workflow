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
  console.log('Logged in');

  // Test 1: Call update_musaned_status with empty body to see required params
  const res1 = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.update_musaned_status', 'POST', {}, cookies);
  console.log('update_musaned_status empty:', res1.status, res1.body?.exc || res1.body?.exception || res1.body);

  // Test 2: Call update_musaned_status with applicant_name: 'APP-00003'
  const res2 = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.update_musaned_status', 'POST', {
    applicant_name: 'APP-00003',
    status: 'Verified'
  }, cookies);
  console.log('update_musaned_status with APP-00003 status Verified:', res2.status, res2.body?.exc || res2.body?.exception || res2.body);

  // Test 3: Call with is_verified / musaned_status / musaned_verified
  const res3 = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.update_musaned_status', 'POST', {
    applicant: 'APP-00003',
    musaned_status: 'Verified'
  }, cookies);
  console.log('update_musaned_status with applicant APP-00003:', res3.status, res3.body?.exc || res3.body?.exception || res3.body);
}

run().catch(console.error);
