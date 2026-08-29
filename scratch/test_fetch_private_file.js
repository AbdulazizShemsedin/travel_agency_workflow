const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function req(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method: 'GET',
      headers: {
        'Accept': '*/*',
        ...headers
      }
    }, resp => {
      let d = [];
      resp.on('data', c => d.push(c));
      resp.on('end', () => {
        const buf = Buffer.concat(d);
        resolve({
          status: resp.statusCode,
          contentType: resp.headers['content-type'],
          length: buf.length,
          preview: buf.toString('utf8').slice(0, 100)
        });
      });
    });
    r.on('error', reject);
    r.end();
  });
}

async function run() {
  const filePath = '/private/files/CV-APP-00006-CV-00008712266.pdf';
  console.log('1. Fetch with Authorization token:');
  const res1 = await req(filePath, {
    'Authorization': 'token b5e234357830f5a:d7545958831889f'
  });
  console.log('Status:', res1.status, 'Type:', res1.contentType, 'Length:', res1.length);

  console.log('\n2. Fetch with Cookie: sid=Guest:');
  const res2 = await req(filePath, {
    'Cookie': 'sid=Guest'
  });
  console.log('Status:', res2.status, 'Preview:', res2.preview);

  console.log('\n3. Fetch with Authorization token + Cookie: sid=Guest:');
  const res3 = await req(filePath, {
    'Authorization': 'token b5e234357830f5a:d7545958831889f',
    'Cookie': 'sid=Guest'
  });
  console.log('Status:', res3.status, 'Type:', res3.contentType, 'Length:', res3.length);
}

run().catch(console.error);
