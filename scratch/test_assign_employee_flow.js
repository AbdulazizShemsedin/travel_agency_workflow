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

async function testFullStaffAssignment() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('--- 1. Testing Assignment of APP-00002 to Administrator ---');
  // Update LMS-00001, INJ-00001, WAK-00001
  const upLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('LMS Update Status:', upLms.status, 'Employee:', upLms.data?.data?.employee);

  const upInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('Injaz Update Status:', upInj.status, 'Employee:', upInj.data?.data?.employee);

  const upWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('Wakala Update Status:', upWak.status, 'Employee:', upWak.data?.data?.employee);

  console.log('\n--- 2. Reading Clearances for APP-00002 ---');
  const readLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies);
  const readInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies);
  const readWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies);

  console.log('Read LMS Employee:', readLms.data?.data?.employee);
  console.log('Read Injaz Employee:', readInj.data?.data?.employee);
  console.log('Read Wakala Employee:', readWak.data?.data?.employee);

  console.log('\n--- 3. Testing Multi-Process Delegation (lms: tutu@gmail.com, injaz: Administrator, wakala: tutu@gmail.com) ---');
  await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'tutu@gmail.com' });
  await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies, 'PUT', { employee: 'Administrator' });
  await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies, 'PUT', { employee: 'tutu@gmail.com' });

  const multiLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies);
  const multiInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies);
  const multiWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies);

  console.log('Multi LMS Employee:', multiLms.data?.data?.employee);
  console.log('Multi Injaz Employee:', multiInj.data?.data?.employee);
  console.log('Multi Wakala Employee:', multiWak.data?.data?.employee);
}

testFullStaffAssignment().catch(console.error);
