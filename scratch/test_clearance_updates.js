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

  const lms = await req('/api/resource/LMS Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  const lmsName = lms.body?.data?.[0]?.name;
  console.log('LMS Doc:', lmsName);
  if (lmsName) {
    const updateLms = await req(`/api/resource/LMS Clearance/${lmsName}`, 'PUT', {
      status: 'Issued',
      employee: 'Administrator',
      issued_on: '2026-08-26'
    }, cookies);
    console.log('Update LMS response:', updateLms.status, updateLms.body?.data?.status);
  }

  const inj = await req('/api/resource/Injaz Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  const injName = inj.body?.data?.[0]?.name;
  console.log('Injaz Doc:', injName);
  if (injName) {
    const updateInj = await req(`/api/resource/Injaz Clearance/${injName}`, 'PUT', {
      status: 'Completed',
      employee: 'Administrator'
    }, cookies);
    console.log('Update Injaz response:', updateInj.status, updateInj.body?.data?.status);
  }

  const wak = await req('/api/resource/Wakala Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  const wakName = wak.body?.data?.[0]?.name;
  console.log('Wakala Doc:', wakName);
  if (wakName) {
    const updateWak = await req(`/api/resource/Wakala Clearance/${wakName}`, 'PUT', {
      status: 'Completed',
      employee: 'Administrator'
    }, cookies);
    console.log('Update Wakala response:', updateWak.status, updateWak.body?.data?.status);
  }
}

run().catch(console.error);
