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

  // Update DSR-00003 destination_country to Saudi Arabia
  const updateDsr = await req('/api/resource/DSR/DSR-00003', 'PUT', {
    destination_country: 'Saudi Arabia'
  }, cookies);
  console.log('Update DSR-00003 country:', updateDsr.status);

  // Check / create Injaz
  let injaz = await req('/api/resource/Injaz Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  if (!injaz.body?.data?.length) {
    const createInj = await req('/api/resource/Injaz Clearance', 'POST', {
      dsr: 'DSR-00003',
      status: 'Pending'
    }, cookies);
    console.log('Created Injaz Clearance:', createInj.status, createInj.body?.data?.name);
  } else {
    console.log('Injaz exists:', injaz.body.data[0].name);
  }

  // Check / create Wakala
  let wakala = await req('/api/resource/Wakala Clearance?filters=[["dsr","=","DSR-00003"]]', 'GET', null, cookies);
  if (!wakala.body?.data?.length) {
    const createWak = await req('/api/resource/Wakala Clearance', 'POST', {
      dsr: 'DSR-00003',
      status: 'Pending'
    }, cookies);
    console.log('Created Wakala Clearance:', createWak.status, createWak.body?.data?.name);
  } else {
    console.log('Wakala exists:', wakala.body.data[0].name);
  }
}

run().catch(console.error);
