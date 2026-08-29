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

async function testAssignAdmin() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('1. Assigning LMS-00001, INJ-00001, WAK-00001 to Administrator:');
  const resLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'Administrator' });
  const resInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies, 'PUT', { employee: 'Administrator' });
  const resWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies, 'PUT', { employee: 'Administrator' });

  console.log('LMS Status:', resLms.status, 'Employee in DB:', resLms.data?.data?.employee);
  console.log('Injaz Status:', resInj.status, 'Employee in DB:', resInj.data?.data?.employee);
  console.log('Wakala Status:', resWak.status, 'Employee in DB:', resWak.data?.data?.employee);

  console.log('\n2. Verifying GET on processing records:');
  const getLms = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies);
  const getInj = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies);
  const getWak = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies);

  console.log('Fetched LMS Employee:', getLms.data?.data?.employee);
  console.log('Fetched Injaz Employee:', getInj.data?.data?.employee);
  console.log('Fetched Wakala Employee:', getWak.data?.data?.employee);
}

testAssignAdmin().catch(console.error);
