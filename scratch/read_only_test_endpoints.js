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

async function verifyCorridorUpdates() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('=== TEST 1: SAUDI CORRIDOR (APP-00002 / DSR-00001) ===');
  // Target LMS-00001, INJ-00001, WAK-00001
  const pLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'Administrator' });
  const pInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies, 'PUT', { employee: 'Administrator' });
  const pWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('LMS-00001 PUT:', pLms.status, pLms.data?.data?.employee);
  console.log('INJ-00001 PUT:', pInj.status, pInj.data?.data?.employee);
  console.log('WAK-00001 PUT:', pWak.status, pWak.data?.data?.employee);

  // Read back
  const rLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies);
  const rInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies);
  const rWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies);
  console.log('LMS-00001 GET Read-back:', rLms.status, rLms.data?.data?.employee);
  console.log('INJ-00001 GET Read-back:', rInj.status, rInj.data?.data?.employee);
  console.log('WAK-00001 GET Read-back:', rWak.status, rWak.data?.data?.employee);

  console.log('\n=== TEST 2: KUWAIT CORRIDOR (APP-00003 / DSR-00002) ===');
  // Target LMS-00002, EMB-00001, TSG-00001
  const pLms2 = await requestWithCookies('/api/resource/LMS Clearance/LMS-00002', cookies, 'PUT', { employee: 'tutu@gmail.com' });
  const pEmb = await requestWithCookies('/api/resource/Embassy Clearance/EMB-00001', cookies, 'PUT', { employee: 'Administrator' });
  const pTsg = await requestWithCookies('/api/resource/Telesign Clearance/TSG-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('LMS-00002 PUT:', pLms2.status, pLms2.data?.data?.employee);
  console.log('EMB-00001 PUT:', pEmb.status, pEmb.data?.data?.employee);
  console.log('TSG-00001 PUT:', pTsg.status, pTsg.data?.data?.employee);

  // Read back
  const rLms2 = await requestWithCookies('/api/resource/LMS Clearance/LMS-00002', cookies);
  const rEmb = await requestWithCookies('/api/resource/Embassy Clearance/EMB-00001', cookies);
  const rTsg = await requestWithCookies('/api/resource/Telesign Clearance/TSG-00001', cookies);
  console.log('LMS-00002 GET Read-back:', rLms2.status, rLms2.data?.data?.employee);
  console.log('EMB-00001 GET Read-back:', rEmb.status, rEmb.data?.data?.employee);
  console.log('TSG-00001 GET Read-back:', rTsg.status, rTsg.data?.data?.employee);
}

verifyCorridorUpdates().catch(console.error);
