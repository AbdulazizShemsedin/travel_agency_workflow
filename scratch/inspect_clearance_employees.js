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

async function inspectClearancesAndEmployees() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('--- 1. LMS Clearance Records in DB ---');
  const lmsList = await requestWithCookies('/api/resource/LMS Clearance?fields=["*"]', cookies);
  console.log('LMS Records:', lmsList.data?.data);

  console.log('\n--- 2. Injaz Clearance Records in DB ---');
  const injazList = await requestWithCookies('/api/resource/Injaz Clearance?fields=["*"]', cookies);
  console.log('Injaz Records:', injazList.data?.data);

  console.log('\n--- 3. Wakala Clearance Records in DB ---');
  const wakalaList = await requestWithCookies('/api/resource/Wakala Clearance?fields=["*"]', cookies);
  console.log('Wakala Records:', wakalaList.data?.data);

  console.log('\n--- 4. Users / Employees in DB ---');
  const userList = await requestWithCookies('/api/resource/User?fields=["name","full_name","email"]&limit_page_length=50', cookies);
  console.log('Users in DB:', userList.data?.data);
}

inspectClearancesAndEmployees().catch(console.error);
