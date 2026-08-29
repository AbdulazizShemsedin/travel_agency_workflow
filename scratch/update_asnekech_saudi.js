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

  const updateApp = await req('/api/resource/Applicant/APP-00003', 'PUT', {
    destination_country: 'Saudi Arabia'
  }, cookies);
  console.log('Update APP-00003 destination_country result:', updateApp.status, updateApp.body?.data?.destination_country);

  // Also update related Dossier if any
  const dosList = await req('/api/resource/Applicant Dossier?filters=[["applicant","=","APP-00003"]]', 'GET', null, cookies);
  if (dosList.body?.data?.[0]?.name) {
    const dosName = dosList.body.data[0].name;
    const updateDos = await req(`/api/resource/Applicant Dossier/${dosName}`, 'PUT', {
      destination_country: 'Saudi Arabia'
    }, cookies);
    console.log('Updated Dossier destination_country:', updateDos.status, updateDos.body?.data?.destination_country);
  }
}

run().catch(console.error);
