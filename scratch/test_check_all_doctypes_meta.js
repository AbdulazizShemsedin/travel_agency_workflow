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

  const dts = [
    'Applicant Dossier',
    'Contract Request',
    'CV Record',
    'Wakala Clearance',
    'DSR'
  ];

  for (const dt of dts) {
    const meta = await req(`/api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(dt)}`, 'GET', null, cookies);
    const fields = (meta.body?.docs?.[0]?.fields || []).map(f => ({ name: f.fieldname, label: f.label }));
    console.log(`\nDocType: ${dt}`);
    for (const f of fields) {
      if (f.name.includes('musan') || f.name.includes('saudi') || f.name.includes('wakala') || f.name.includes('ref') || f.name.includes('status') || f.name.includes('verif') || f.name.includes('app')) {
        console.log(`  ${f.name} (${f.label})`);
      }
    }
  }
}

run().catch(console.error);
