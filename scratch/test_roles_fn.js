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
  console.log('Status:', res.status);
  console.log('Body:', res.body);
}

run().catch(console.error);
