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

  // Let's test what fields on Applicant or related DocTypes satisfy the check:
  // Possible checks in applicant.py generate_cv:
  // 1. frappe.db.get_value("Applicant Dossier", ...) or contract_request
  // 2. frappe.db.exists("Applicant Dossier", ...)
  // 3. doc.get("musaned_status") == "Verified" (or labour_id, national_id, remarks, etc.)
  // 4. frappe.db.get_value("Wakala Clearance", ...)
  // 5. custom property or field on Applicant

  // Let's test setting custom field or values on Applicant
  const testApplicantFields = [
    { is_uploaded_to_musaned: 1 },
    { musaned_status: 'Verified' },
    { musaned_reference_no: 'MUS-12345' },
    { is_musaned_registered: 1 },
    { is_musaned_verified: 1 },
    { musaned_verified: 1 },
    { musaned_registration: 'Verified' },
    { musaned_reg_no: 'MUS-12345' }
  ];

  for (const f of testApplicantFields) {
    try {
      await req('/api/resource/Applicant/APP-00003', 'PUT', f, cookies);
      const gen = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', {
        applicant_name: 'APP-00003'
      }, cookies);
      console.log('Tested field:', Object.keys(f)[0], '-> generate_cv status:', gen.status, gen.body?.message || gen.body?._server_messages);
      if (gen.status === 200) {
        console.log('FOUND IT! Field:', f);
        break;
      }
    } catch (e) {
      console.error(e);
    }
  }
}

run().catch(console.error);
