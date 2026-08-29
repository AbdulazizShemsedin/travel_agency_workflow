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

  const app = await req('/api/resource/Applicant/APP-00003', 'GET', null, cookies);
  console.log('APP-00003 State before recalc:', app.body?.data?.applicant_state);

  const recalc = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.recalculate_applicant_state', 'POST', {
    applicant_name: 'APP-00003'
  }, cookies);
  console.log('Recalc result:', recalc.status, recalc.body);

  const appAfter = await req('/api/resource/Applicant/APP-00003', 'GET', null, cookies);
  console.log('APP-00003 State after recalc:', appAfter.body?.data?.applicant_state);
}

run().catch(console.error);
