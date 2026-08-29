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

  // Fetch DocType meta for Applicant to see ALL fields on the live server
  const meta = await req('/api/method/frappe.desk.form.load.getdoctype?doctype=Applicant', 'GET', null, cookies);
  const fields = (meta.body?.docs?.[0]?.fields || []).map(f => ({ name: f.fieldname, label: f.label, type: f.fieldtype }));
  console.log('Total fields on live Applicant DocType:', fields.length);
  const musanedFields = fields.filter(f => f.name.includes('musan') || f.name.includes('saudi') || f.name.includes('verify') || f.name.includes('reg'));
  console.log('Fields matching musaned/saudi/verify/reg:', musanedFields);

  // Test calling generate_cv on APP-00001, APP-00002, APP-00003
  for (const appId of ['APP-00001', 'APP-00002', 'APP-00003']) {
    const app = await req(`/api/resource/Applicant/${appId}`, 'GET', null, cookies);
    console.log(`\nApplicant ${appId}:`, {
      destination: app.body?.data?.destination_country,
      state: app.body?.data?.applicant_state,
      remarks: app.body?.data?.remarks
    });

    const gen = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', {
      applicant_name: appId
    }, cookies);
    console.log(`generate_cv on ${appId}:`, gen.status, gen.body?.message || gen.body?.exc_type || gen.body?._server_messages || gen.raw);
  }
}

run().catch(console.error);
