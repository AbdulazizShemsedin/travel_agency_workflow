const http = require('http');

function req(path, method, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { 'Cookie': cookie } : {}),
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
  console.log('Testing GET LMS Clearance for DSR-00003...');
  const getRes = await req('/api/resource/LMS Clearance?filters=[["dsr","=","DSR-00003"]]&fields=["*"]', 'GET');
  console.log('GET LMS status:', getRes.status, getRes.body?.data?.[0]?.name);

  const lmsName = getRes.body?.data?.[0]?.name || 'LMS-00004';

  console.log(`Testing PUT LMS Clearance/${lmsName}...`);
  const putRes = await req(`/api/resource/LMS Clearance/${lmsName}`, 'PUT', {
    employee: 'tutu@gmail.com',
    status: 'Issued',
    dsr: 'DSR-00003'
  });
  console.log('PUT LMS status:', putRes.status, putRes.body?.data?.name, 'Employee:', putRes.body?.data?.employee, 'Status:', putRes.body?.data?.status);

  console.log('Testing assign employee endpoint simulation on LMS Clearance...');
  const putAdmin = await req(`/api/resource/LMS Clearance/${lmsName}`, 'PUT', {
    employee: 'Administrator',
    status: 'Issued',
    dsr: 'DSR-00003'
  });
  console.log('PUT Administrator status:', putAdmin.status, putAdmin.body?.data?.name, 'Employee:', putAdmin.body?.data?.employee);
}

run().catch(console.error);
