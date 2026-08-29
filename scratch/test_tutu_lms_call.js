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
  // Let's test login as tutu@gmail.com
  const tutuCookies = await login('tutu@gmail.com', '1234');
  console.log('Tutu cookies count:', tutuCookies.length);

  // Check current user
  const whoami = await req('/api/method/frappe.auth.get_logged_user', 'GET', null, tutuCookies);
  console.log('Logged in as:', whoami.body);

  // 1. GET /api/resource/LMS Clearance
  const listLms = await req('/api/resource/LMS Clearance?fields=["name","status","employee","owner"]&limit_page_length=10', 'GET', null, tutuCookies);
  console.log('GET LMS list as tutu:', listLms.status, listLms.body);

  // 2. GET /api/resource/LMS Clearance/LMS-00004
  const getLms = await req('/api/resource/LMS Clearance/LMS-00004', 'GET', null, tutuCookies);
  console.log('GET LMS-00004 as tutu:', getLms.status, getLms.body?._server_messages || getLms.body?.data?.name || getLms.body);

  // 3. PUT /api/resource/LMS Clearance/LMS-00004 with employee Administrator
  const putLms = await req('/api/resource/LMS Clearance/LMS-00004', 'PUT', {
    employee: 'Administrator',
    status: 'Issued'
  }, tutuCookies);
  console.log('PUT LMS-00004 as tutu:', putLms.status, putLms.body?._server_messages || putLms.body?.exc || putLms.body);
}

run().catch(console.error);
