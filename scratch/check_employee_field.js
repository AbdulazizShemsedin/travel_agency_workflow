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

async function checkEmployeeFieldType() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  const lmsMeta = await requestWithCookies('/api/method/frappe.desk.form.load.getdoctype?doctype=LMS Clearance', cookies);
  const empField = lmsMeta.data?.docs?.[0]?.fields?.find(f => f.fieldname === 'employee');
  console.log('LMS Clearance employee field definition:', empField);

  // Test updating LMS-00001 with 'Administrator' and 'tutu@gmail.com'
  const updateRes1 = await requestWithCookies('/api/resource/LMS Clearance/LMS-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('Update LMS-00001 with Administrator:', updateRes1.status, updateRes1.data);

  const updateRes2 = await requestWithCookies('/api/resource/Injaz Clearance/INJ-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('Update INJ-00001 with Administrator:', updateRes2.status, updateRes2.data);

  const updateRes3 = await requestWithCookies('/api/resource/Wakala Clearance/WAK-00001', cookies, 'PUT', { employee: 'Administrator' });
  console.log('Update WAK-00001 with Administrator:', updateRes3.status, updateRes3.data);
}

checkEmployeeFieldType().catch(console.error);
