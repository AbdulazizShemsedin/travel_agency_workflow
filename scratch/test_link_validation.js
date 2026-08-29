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
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        resolve({ status: res.statusCode, cookies });
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    req.write(postData);
    req.end();
  });
}

function requestWithCookies(path, cookies, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const cookieHeader = (cookies || []).map(c => c.split(';')[0]).join('; ');
    const postData = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method: method,
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function testLinkValidation() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('Testing updating LMS-00001 with employee="admin@example.com":');
  const r1 = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'admin@example.com' });
  console.log('Result with email:', r1.status, r1.data);

  console.log('\nTesting updating LMS-00001 with employee="Administrator":');
  const r2 = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('Result with username/name:', r2.status, r2.data?.data?.employee);

  console.log('\nTesting updating LMS-00001 with employee="tutu@gmail.com":');
  const r3 = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'tutu@gmail.com' });
  console.log('Result with tutu:', r3.status, r3.data?.data?.employee);
}

testLinkValidation().catch(console.error);
