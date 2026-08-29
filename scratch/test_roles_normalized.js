const http = require('http');

function req(path) {
  return new Promise((resolve, reject) => {
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 2
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
    r.write('{}');
    r.end();
  });
}

async function run() {
  const res = await req('/api/method/applicant_processing.applicant_processing.api.get_available_roles');
  console.log('Roles API response status:', res.status);
  const roles = res.body?.message?.roles || res.body?.roles || [];
  console.log('Roles count:', roles.length);
  roles.forEach(r => {
    console.log(`- Role: "${r.role}", Label: "${r.label}", Category: "${r.category}"`);
  });
}

run().catch(console.error);
