const http = require('http');

function req(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method,
      headers: {
        'Content-Type': 'application/json',
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
  console.log('Testing LMS Clearance...');
  const lms = await req('/api/resource/LMS Clearance/LMS-00004', 'PUT', { employee: 'tutu@gmail.com', status: 'Issued', dsr: 'DSR-00003' });
  console.log('LMS:', lms.status, lms.body?.data?.name);

  console.log('Testing Injaz Clearance...');
  const inj = await req('/api/resource/Injaz Clearance/INJ-00002', 'PUT', { employee: 'Administrator', status: 'Completed', dsr: 'DSR-00003' });
  console.log('Injaz:', inj.status, inj.body?.data?.name);

  console.log('Testing Wakala Clearance...');
  const wak = await req('/api/resource/Wakala Clearance/WAK-00002', 'PUT', { employee: 'Administrator', status: 'Completed', dsr: 'DSR-00003' });
  console.log('Wakala:', wak.status, wak.body?.data?.name);
}

run().catch(console.error);
