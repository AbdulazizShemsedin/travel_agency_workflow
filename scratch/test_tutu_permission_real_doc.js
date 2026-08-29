const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr, pwd) {
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
  // Let's test tutu@gmail.com login or check permissions directly
  const adminCookies = await login('Administrator', '1234');
  console.log('Logged in as Administrator');

  // Check roles assigned to tutu@gmail.com
  const tutuUser = await req('/api/resource/User/tutu@gmail.com', 'GET', null, adminCookies);
  console.log('tutu@gmail.com roles:', tutuUser.body?.data?.roles?.map(r => r.role));

  // Let's test has_permission on LMS-00004 and LMS-00005 for user tutu@gmail.com
  const checkPerm4 = await req('/api/method/frappe.client.has_permission?doctype=LMS Clearance&docname=LMS-00004&perm_type=write&user=tutu@gmail.com', 'GET', null, adminCookies);
  console.log('Permission for tutu@gmail.com on LMS-00004 (write):', checkPerm4.status, checkPerm4.body);

  const checkPerm5 = await req('/api/method/frappe.client.has_permission?doctype=LMS Clearance&docname=LMS-00005&perm_type=write&user=tutu@gmail.com', 'GET', null, adminCookies);
  console.log('Permission for tutu@gmail.com on LMS-00005 (write):', checkPerm5.status, checkPerm5.body);

  const checkPermCreate = await req('/api/method/frappe.client.has_permission?doctype=LMS Clearance&perm_type=create&user=tutu@gmail.com', 'GET', null, adminCookies);
  console.log('Permission for tutu@gmail.com on LMS Clearance (create):', checkPermCreate.status, checkPermCreate.body);
}

run().catch(console.error);
