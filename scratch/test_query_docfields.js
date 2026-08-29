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

  const fields = await req('/api/resource/DocField?filters=[["parent","in",["Applicant","Contract Request","Applicant Dossier","CV Record","Wakala Clearance"]]]&fields=["parent","fieldname","label","fieldtype","options"]&limit_page_length=500', 'GET', null, cookies);
  
  const grouped = {};
  for (const f of fields.body?.data || []) {
    if (!grouped[f.parent]) grouped[f.parent] = [];
    grouped[f.parent].push(f);
  }

  for (const [parent, list] of Object.entries(grouped)) {
    console.log(`\n=== DocType: ${parent} (${list.length} fields) ===`);
    for (const f of list) {
      console.log(`  ${f.fieldname} | ${f.label} | ${f.fieldtype} | ${f.options || ''}`);
    }
  }
}

run().catch(console.error);
