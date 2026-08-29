const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr = 'Administrator', pwd = '1234') {
  return new Promise(res => {
    const data = JSON.stringify({ usr, pwd });
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
  const adminCookies = await login();
  console.log('Logged in as Administrator');

  // Check DocPerm for LMS Clearance, Injaz Clearance, Wakala Clearance
  for (const dt of ['LMS Clearance', 'Injaz Clearance', 'Wakala Clearance', 'DSR', 'Applicant']) {
    const perms = await req(`/api/resource/DocPerm?filters=[["parent","=","${dt}"]]&fields=["role","read","write","create","delete","permlevel"]`, 'GET', null, adminCookies);
    console.log(`\nDocPerm for ${dt}:`, perms.body?.data);
  }

  // Check Custom DocPerm
  const customPerms = await req(`/api/resource/Custom DocPerm?fields=["parent","role","read","write","create"]&limit_page_length=50`, 'GET', null, adminCookies);
  console.log('\nCustom DocPerms:', customPerms.body?.data);
}

run().catch(console.error);
