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
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(res.headers['set-cookie'] || []));
    });
    req.write(postData);
    req.end();
  });
}

function requestWithCookies(path, cookies, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
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
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function testVariousMethods() {
  const cookies = await login('Administrator', '1234');

  const methodsToTest = [
    'applicant_processing.applicant_processing.api.assign_clearance_employee',
    'applicant_processing.applicant_processing.doctype.lms_clearance.lms_clearance.assign_clearance_employee',
    'applicant_processing.applicant_processing.doctype.applicant_dossier.applicant_dossier.assign_clearance_employee',
    'applicant_processing.applicant_processing.api.assign_employee',
    'applicant_processing.api.assign_clearance_employee'
  ];

  for (const m of methodsToTest) {
    const res = await requestWithCookies(`/api/method/${m}`, cookies, 'POST', {
      clearance_doctype: 'LMS Clearance',
      clearance_id: 'LMS-00001',
      employee: 'Administrator'
    });
    console.log(`Method: ${m} -> Status: ${res.status}, Exception: ${res.data?.exception || 'OK'}`);
  }
}

testVariousMethods();
