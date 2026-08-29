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

  // Let's test calling generate_cv with additional arguments!
  // def generate_cv(applicant_name, ...):
  const genArgs = [
    { applicant_name: 'APP-00003', musaned_verified: 1 },
    { applicant_name: 'APP-00003', musaned_status: 'Verified' },
    { applicant_name: 'APP-00003', musaned_reference_no: 'MUS-12345' },
    { applicant_name: 'APP-00003', force: 1 },
    { applicant_name: 'APP-00003', bypass_musaned: 1 },
    { applicant_name: 'APP-00003', confirm_musaned: 1 }
  ];

  for (const a of genArgs) {
    const g = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', a, cookies);
    console.log('Called generate_cv with', Object.keys(a), '->', g.status, g.body?.message || g.body?._server_messages);
    if (g.status === 200) {
      console.log('SUCCESS with args:', a);
      break;
    }
  }
}

run().catch(console.error);
