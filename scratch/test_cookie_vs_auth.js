const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function req(headers) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/resource/Applicant?limit_page_length=1',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
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
    r.end();
  });
}

async function run() {
  console.log('1. Only Authorization header:');
  const res1 = await req({ 'Authorization': 'token b5e234357830f5a:d7545958831889f' });
  console.log('Status:', res1.status, res1.body?.data?.length);

  console.log('\n2. Authorization header + Cookie: sid=Guest:');
  const res2 = await req({
    'Authorization': 'token b5e234357830f5a:d7545958831889f',
    'Cookie': 'sid=Guest'
  });
  console.log('Status:', res2.status, res2.body);

  console.log('\n3. Only Cookie: sid=Guest:');
  const res3 = await req({
    'Cookie': 'sid=Guest'
  });
  console.log('Status:', res3.status, res3.body);
}

run().catch(console.error);
