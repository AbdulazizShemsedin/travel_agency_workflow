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

  // Fetch DocType LMS Clearance
  const lmsDocType = await req('/api/resource/DocType/LMS Clearance', 'GET', null, adminCookies);
  const perms = lmsDocType.body?.data?.permissions || [];
  console.log('Current perms:', perms);

  const updatedPerms = perms.map(p => {
    if (p.role === 'LMS Employee' || p.role === 'System Manager') {
      return {
        ...p,
        create: 1,
        read: 1,
        write: 1,
        delete: 1,
        share: 1
      };
    }
    return p;
  });

  const save = await req('/api/resource/DocType/LMS Clearance', 'PUT', {
    permissions: updatedPerms
  }, adminCookies);

  console.log('Updated DocType LMS Clearance permissions status:', save.status);

  // Also check Custom DocPerm / add permission for LMS Clearance
  const check = await req('/api/resource/DocType/LMS Clearance', 'GET', null, adminCookies);
  console.log('New perms:', check.body?.data?.permissions);
}

run().catch(console.error);
