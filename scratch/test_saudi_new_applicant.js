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

  // Let's create a fresh registered applicant
  const newApp = await req('/api/resource/Applicant', 'POST', {
    first_name: 'Fatima',
    last_name: 'Ali',
    gender: 'Female',
    destination_country: 'Saudi Arabia',
    phone_number: '+251911223344',
    applicant_type: 'Standard',
    nationality: 'Ethiopia',
    applicant_state: 'Registered',
    medical_status: 'FIT'
  }, cookies);

  const appId = newApp.body?.data?.name;
  console.log('Created applicant:', appId, newApp.status);

  if (!appId) return;

  // Test 1: Call generate_cv directly
  const gen1 = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', {
    applicant_name: appId
  }, cookies);
  console.log('gen1 (before musaned update):', gen1.status, gen1.body?._server_messages || gen1.body?.message);

  // Test 2: Call update_musaned_status
  const mus = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.update_musaned_status', 'POST', {
    applicant: appId,
    musaned_status: 'Verified',
    musaned_reference_no: 'MUS-99999'
  }, cookies);
  console.log('update_musaned_status:', mus.status, mus.body);

  // Test 3: Call generate_cv after musaned update
  const gen2 = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', {
    applicant_name: appId
  }, cookies);
  console.log('gen2 (after musaned update):', gen2.status, gen2.body?._server_messages || gen2.body?.message);
}

run().catch(console.error);
