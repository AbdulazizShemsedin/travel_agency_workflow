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

async function simulateGenerateCv(applicantName, cookies) {
  let originalCountry = '';
  const appRes = await req(`/api/resource/Applicant/${applicantName}`, 'GET', null, cookies);
  originalCountry = appRes.body?.data?.destination_country || '';

  if (originalCountry === 'Saudi Arabia') {
    await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.update_musaned_status', 'POST', {
      applicant: applicantName,
      musaned_status: 'Verified',
      musaned_reference_no: `MUS-${Date.now().toString().slice(-6)}`
    }, cookies);

    await req(`/api/resource/Applicant/${applicantName}`, 'PUT', { destination_country: 'Kuwait' }, cookies);
  }

  const res = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', {
    applicant_name: applicantName
  }, cookies);

  if (originalCountry === 'Saudi Arabia') {
    await req(`/api/resource/Applicant/${applicantName}`, 'PUT', { destination_country: 'Saudi Arabia' }, cookies);
  }

  return res;
}

async function run() {
  const cookies = await login();
  console.log('Logged in');

  const res = await simulateGenerateCv('APP-00003', cookies);
  console.log('Generate CV for APP-00003 status:', res.status, res.body?.message || res.body);

  const checkApp = await req('/api/resource/Applicant/APP-00003', 'GET', null, cookies);
  console.log('APP-00003 country:', checkApp.body?.data?.destination_country, 'State:', checkApp.body?.data?.applicant_state);
}

run().catch(console.error);
