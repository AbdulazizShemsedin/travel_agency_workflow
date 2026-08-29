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
  console.log('Logged in as Administrator');

  // Let's test updating LMS Clearance for DSR-00003 with Administrator
  const lms = await req('/api/resource/LMS Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  const lmsName = lms.body?.data?.[0]?.name;
  console.log('LMS Doc for DSR-00003:', lmsName);

  // Fetch full LMS doc
  const lmsDoc = await req(`/api/resource/LMS Clearance/${lmsName}`, 'GET', null, cookies);
  const fin = (lmsDoc.body?.data?.financials || []).map(f => ({ ...f, category: f.category || 'Agency Commission' }));

  const putLms = await req(`/api/resource/LMS Clearance/${lmsName}`, 'PUT', {
    employee: 'Administrator',
    status: 'Issued',
    financials: fin
  }, cookies);

  console.log('Update LMS Clearance status:', putLms.status, putLms.body?.data?.name, 'Employee:', putLms.body?.data?.employee);

  // Check Injaz
  const inj = await req('/api/resource/Injaz Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  console.log('Injaz doc:', inj.body?.data?.[0]?.name);

  // Check Wakala
  const wak = await req('/api/resource/Wakala Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  console.log('Wakala doc:', wak.body?.data?.[0]?.name);
}

run().catch(console.error);
