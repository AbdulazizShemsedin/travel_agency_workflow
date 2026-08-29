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

  // Let's create a temporary applicant or test field changes on APP-00003
  // Let's see what happens if remarks has 'MUSANED' or 'VERIFIED' or if labour_id / national_id has something
  const testRemarks = ['Musaned', 'Musaned Verified', 'Verified on Musaned', 'FED', 'MUSANED_VERIFIED'];
  for (const rem of testRemarks) {
    await req('/api/resource/Applicant/APP-00003', 'PUT', { remarks: rem }, cookies);
    const gen = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', {
      applicant_name: 'APP-00003'
    }, cookies);
    console.log(`Remarks "${rem}":`, gen.status, gen.body?._server_messages || gen.body?.message || gen.body?.exc_type);
    if (gen.status === 200) break;
  }
}

run().catch(console.error);
