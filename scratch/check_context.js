const https = require('https');

const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr, pwd) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ usr, pwd });
    const req = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/method/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(res.headers['set-cookie'] || []));
    });
    req.write(postData);
    req.end();
  });
}

function req(path, cookies) {
  return new Promise((resolve) => {
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const r = https.request({ hostname: HOST, port: 443, path: encodeURI(path), headers: { 'Cookie': cookieHeader } }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.end();
  });
}

async function checkContext() {
  console.log('--- 1. Administrator Context ---');
  const adminCookies = await login('Administrator', '1234');
  const adminCtx = await req('/api/method/applicant_processing.applicant_processing.api.get_my_agency_context', adminCookies);
  console.log('Admin Agency Context:', JSON.stringify(adminCtx, null, 2));

  console.log('\n--- 2. Tutu Context ---');
  const tutuCookies = await login('tutu@gmail.com', '@1234@');
  const tutuCtx = await req('/api/method/applicant_processing.applicant_processing.api.get_my_agency_context', tutuCookies);
  console.log('Tutu Agency Context:', JSON.stringify(tutuCtx, null, 2));
}

checkContext().catch(console.error);
