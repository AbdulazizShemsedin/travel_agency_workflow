const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr = 'Administrator', pwd = '1234') {
  return new Promise(res => {
    const data = JSON.stringify({ usr, pwd });
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

function req(path, cookies) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; ')
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
  const cookies = await login();
  console.log('Logged in as Administrator');

  // Query all CV Records
  const cvs = await req('/api/resource/CV Record?fields=["name","applicant","file_attachment","file_url","is_private"]&limit_page_length=50', cookies);
  console.log('CV Records in DB:');
  console.log(JSON.stringify(cvs.body?.data, null, 2));

  // Query all File DocTypes for CVs
  const files = await req('/api/resource/File?filters=[["attached_to_doctype","=","CV Record"]]&fields=["name","file_name","file_url","is_private","file_size"]&limit_page_length=50', cookies);
  console.log('\nFiles attached to CV Record:');
  console.log(JSON.stringify(files.body?.data, null, 2));

  // Also query File DocTypes where attached_to_doctype is Applicant
  const appFiles = await req('/api/resource/File?filters=[["attached_to_doctype","=","Applicant"]]&fields=["name","file_name","file_url","is_private","file_size"]&limit_page_length=50', cookies);
  console.log('\nFiles attached to Applicant:');
  console.log(JSON.stringify(appFiles.body?.data, null, 2));
}

run().catch(console.error);
