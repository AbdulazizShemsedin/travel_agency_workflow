const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function req(path, key = 'b5e234357830f5a', sec = 'd7545958831889f') {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `token ${key}:${sec}`
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
  const res = await req('/api/resource/Applicant?limit_page_length=2');
  console.log('API Key request status:', res.status, res.body?.data?.length, 'applicants found');
}

run().catch(console.error);
