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

  // Let's check update_musaned_status again on APP-00003:
  // When update_musaned_status returned:
  // message: {
  //   status: 'success',
  //   applicant: 'APP-00003',
  //   is_uploaded_to_musaned: 1,
  //   musaned_reference_no: 'MUS-12345',
  //   musaned_status: 'Verified',
  //   musaned_uploaded_at: '2026-08-26 10:33:34.494570',
  //   can_generate_cv: true,
  //   message: 'Musaned registration confirmed for APP-00003.'
  // }
  // Did update_musaned_status save to DB or return a response without saving?
  // Let's check what fields are on APP-00003 in DB right now!
  const app = await req('/api/resource/Applicant/APP-00003', 'GET', null, cookies);
  console.log('APP-00003 after update_musaned_status:');
  for (const [k, v] of Object.entries(app.body?.data || {})) {
    if (k.includes('musan') || k.includes('upload') || k.includes('verif') || k.includes('ref')) {
      console.log(`  ${k}: ${v}`);
    }
  }
}

run().catch(console.error);
