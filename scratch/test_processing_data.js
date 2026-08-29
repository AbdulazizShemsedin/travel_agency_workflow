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

  const dsrRes = await req('/api/resource/DSR?filters=[["applicant_dossier","=","DOSSIER-00003"]]&fields=["*"]', 'GET', null, cookies);
  console.log('DSR for DOSSIER-00003:', dsrRes.body);

  const lmsRes = await req('/api/resource/LMS Clearance?filters=[["dsr","=","DSR-00003"]]&fields=["*"]', 'GET', null, cookies);
  console.log('LMS for DSR-00003:', lmsRes.body);

  const injazRes = await req('/api/resource/Injaz Clearance?filters=[["dsr","=","DSR-00003"]]&fields=["*"]', 'GET', null, cookies);
  console.log('Injaz for DSR-00003:', injazRes.body);

  const wakalaRes = await req('/api/resource/Wakala Clearance?filters=[["dsr","=","DSR-00003"]]&fields=["*"]', 'GET', null, cookies);
  console.log('Wakala for DSR-00003:', wakalaRes.body);
}

run().catch(console.error);
