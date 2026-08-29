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

  // Let's create Custom DocPerm for LMS Clearance
  const createPerm = await req('/api/resource/Custom DocPerm', 'POST', {
    parent: 'LMS Clearance',
    parenttype: 'DocType',
    parentfield: 'permissions',
    role: 'LMS Employee',
    permlevel: 0,
    read: 1,
    write: 1,
    create: 1,
    delete: 1,
    share: 1,
    print: 1,
    email: 1
  }, adminCookies);

  console.log('Create Custom DocPerm for LMS Employee status:', createPerm.status, createPerm.body);

  // Also create for System Manager if needed
  const createPerm2 = await req('/api/resource/Custom DocPerm', 'POST', {
    parent: 'LMS Clearance',
    parenttype: 'DocType',
    parentfield: 'permissions',
    role: 'System Manager',
    permlevel: 0,
    read: 1,
    write: 1,
    create: 1,
    delete: 1,
    share: 1,
    print: 1,
    email: 1
  }, adminCookies);
  console.log('Create Custom DocPerm for System Manager status:', createPerm2.status, createPerm2.body);
}

run().catch(console.error);
