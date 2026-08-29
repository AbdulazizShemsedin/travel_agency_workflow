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
  console.log('Logged in');

  // List all doctypes in module
  const dts = await req('/api/resource/DocType?filters=[["module","=","Applicant Processing"]]&fields=["name"]&limit_page_length=100', 'GET', null, cookies);
  console.log('All DocTypes in Applicant Processing:', dts.body?.data?.map(d => d.name));

  // Let's check update_musaned_status function in applicant.py again:
  // In our previous test, update_musaned_status failed with:
  // "AttributeError: 'Applicant' object has no attribute 'musaned_reference_no'"
  // That tells us what happened in update_musaned_status:
  // doc = frappe.get_doc("Applicant", applicant)
  // ...
  // doc.musaned_status = status (or similar)
  // doc.save() (or return { "musaned_reference_no": doc.musaned_reference_no })
}

run().catch(console.error);
