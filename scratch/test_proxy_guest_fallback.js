const http = require('http');

function req(path, method = 'GET', body = null, cookie = 'sid=Guest; theme=dark') {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method,
      headers: {
        'Accept': 'application/json',
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
  console.log('Testing with Cookie: sid=Guest;');

  const res1 = await req('/api/resource/Applicant?limit_page_length=2');
  console.log('1. GET /api/resource/Applicant:', res1.status, res1.body?.data?.length, 'records');

  const res2 = await req('/api/resource/Contractor');
  console.log('2. GET /api/resource/Contractor:', res2.status, res2.body?.data?.length, 'records');

  const res3 = await req('/api/resource/Role?limit_page_length=5');
  console.log('3. GET /api/resource/Role:', res3.status, res3.body?.data?.length, 'records');

  const res4 = await req('/api/method/applicant_processing.applicant_processing.api.get_system_users', 'POST', {});
  console.log('4. POST get_system_users:', res4.status, res4.body?.message?.users?.length || res4.body?.users?.length || res4.body?.length);

  const res5 = await req('/api/method/applicant_processing.applicant_processing.api.get_available_roles', 'POST', {});
  console.log('5. POST get_available_roles:', res5.status, res5.body?.message?.roles?.length || res5.body?.roles?.length);
}

run().catch(console.error);
