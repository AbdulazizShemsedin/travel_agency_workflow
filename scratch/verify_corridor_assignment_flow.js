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

async function verifyCorridorAssignment() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('--- 1. Testing Saudi Corridor Assignment (APP-00002) ---');
  // Target: LMS-00001, INJ-00001, WAK-00001
  const saudiLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'Administrator' });
  const saudiInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies, 'PUT', { employee: 'Administrator' });
  const saudiWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies, 'PUT', { employee: 'Administrator' });

  console.log('Saudi LMS-00001 PUT status:', saudiLms.status, 'Employee:', saudiLms.data?.data?.employee);
  console.log('Saudi INJ-00001 PUT status:', saudiInj.status, 'Employee:', saudiInj.data?.data?.employee);
  console.log('Saudi WAK-00001 PUT status:', saudiWak.status, 'Employee:', saudiWak.data?.data?.employee);

  // Read back
  const readSaudiLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies);
  const readSaudiInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies);
  const readSaudiWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies);

  console.log('Read-back Saudi LMS:', readSaudiLms.data?.data?.employee);
  console.log('Read-back Saudi INJ:', readSaudiInj.data?.data?.employee);
  console.log('Read-back Saudi WAK:', readSaudiWak.data?.data?.employee);

  console.log('\n--- 2. Testing Kuwait Corridor Assignment (APP-00003) ---');
  // Target: EMB-00001, TSG-00001
  const kuwaitEmb = await requestWithCookies('/api/resource/Embassy Clearance/EMB-00001', cookies, 'PUT', { employee: 'Administrator' });
  const kuwaitTsg = await requestWithCookies('/api/resource/Telesign Clearance/TSG-00001', cookies, 'PUT', { employee: 'Administrator' });

  console.log('Kuwait EMB-00001 PUT status:', kuwaitEmb.status, 'Employee:', kuwaitEmb.data?.data?.employee);
  console.log('Kuwait TSG-00001 PUT status:', kuwaitTsg.status, 'Employee:', kuwaitTsg.data?.data?.employee);

  // Read back
  const readKuwaitEmb = await requestWithCookies('/api/resource/Embassy Clearance/EMB-00001', cookies);
  const readKuwaitTsg = await requestWithCookies('/api/resource/Telesign Clearance/TSG-00001', cookies);

  console.log('Read-back Kuwait EMB:', readKuwaitEmb.data?.data?.employee);
  console.log('Read-back Kuwait TSG:', readKuwaitTsg.data?.data?.employee);
}

verifyCorridorAssignment().catch(console.error);
