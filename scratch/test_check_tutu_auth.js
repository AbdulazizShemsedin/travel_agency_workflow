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

  // Let's check User/tutu@gmail.com
  const tutuUser = await req('/api/resource/User/tutu@gmail.com', 'GET', null, adminCookies);
  console.log('Tutu user:', tutuUser.body?.data?.email, tutuUser.body?.data?.enabled);

  // Set password for tutu@gmail.com to 1234 using frappe.core.doctype.user.user.update_password or reset_password
  // or set via /api/resource/User/tutu@gmail.com with new_password
  const setPwd = await req('/api/resource/User/tutu@gmail.com', 'PUT', {
    new_password: '1234'
  }, adminCookies);
  console.log('Set password for tutu status:', setPwd.status);

  // Now test login as tutu@gmail.com
  const tutuCookies = await login('tutu@gmail.com', '1234');
  console.log('Tutu cookies after password set:', tutuCookies.length);

  // Test GET LMS Clearance as tutu
  const getLms = await req('/api/resource/LMS Clearance/LMS-00004', 'GET', null, tutuCookies);
  console.log('GET LMS-00004 as tutu:', getLms.status, getLms.body?.data?.name || getLms.body);

  // Test PUT LMS Clearance as tutu
  const fin = (getLms.body?.data?.financials || []).map(f => ({ ...f, category: 'Agency Commission' }));
  const putLms = await req('/api/resource/LMS Clearance/LMS-00004', 'PUT', {
    employee: 'Administrator',
    status: 'Issued',
    financials: fin
  }, tutuCookies);
  console.log('PUT LMS-00004 as tutu:', putLms.status, putLms.body?.data?.name || putLms.body);
}

run().catch(console.error);
