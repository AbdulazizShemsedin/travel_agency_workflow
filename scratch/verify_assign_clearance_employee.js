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
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        resolve({ status: res.statusCode, cookies, raw: data });
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
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  const users = await requestWithCookies('/api/resource/User?fields=["name","email","full_name","username"]&limit_page_length=50', cookies);
  console.log('--- USERS IN SYSTEM ---');
  console.log(JSON.stringify(users.data?.data, null, 2));

  const lmsList = await requestWithCookies('/api/resource/LMS Clearance?fields=["name","employee","status","applicant_dossier"]&limit_page_length=20', cookies);
  console.log('\n--- LMS CLEARANCE RECORDS ---');
  console.log(JSON.stringify(lmsList.data?.data, null, 2));

  const clearanceId = lmsList.data?.data?.[0]?.name;
  console.log(`\nSelected safe test clearance: ${clearanceId}`);

  const initClearance = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
  console.log(`Initial clearance record state for ${clearanceId}:`);
  console.log(`- name: ${initClearance.data?.data?.name}`);
  console.log(`- employee: ${initClearance.data?.data?.employee}`);
  console.log(`- status: ${initClearance.data?.data?.status}`);

  console.log('\n==================================================');
  console.log('TEST 1 — USER.NAME ("Administrator")');
  console.log('==================================================');
  const payload1 = {
    clearance_doctype: 'LMS Clearance',
    clearance_id: clearanceId,
    employee: 'Administrator'
  };

  const test1Post = await requestWithCookies(
    '/api/method/applicant_processing.applicant_processing.api.assign_clearance_employee',
    cookies,
    'POST',
    payload1
  );

  console.log('HTTP Status:', test1Post.status);
  console.log('Exact Response Body:\n', JSON.stringify(test1Post.data, null, 2));
  console.log('Accepted:', test1Post.status >= 200 && test1Post.status < 300);

  const test1Get = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
  console.log(`GET ${clearanceId} employee field:`, test1Get.data?.data?.employee);

  console.log('\n==================================================');
  console.log('TEST 2 — USER.EMAIL ("admin@example.com")');
  console.log('==================================================');
  const payload2 = {
    clearance_doctype: 'LMS Clearance',
    clearance_id: clearanceId,
    employee: 'admin@example.com'
  };

  const test2Post = await requestWithCookies(
    '/api/method/applicant_processing.applicant_processing.api.assign_clearance_employee',
    cookies,
    'POST',
    payload2
  );

  console.log('HTTP Status:', test2Post.status);
  console.log('Exact Response Body:\n', JSON.stringify(test2Post.data, null, 2));
  console.log('Accepted:', test2Post.status >= 200 && test2Post.status < 300);

  const test2Get = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
  console.log(`GET ${clearanceId} employee field:`, test2Get.data?.data?.employee);

  console.log('\n==================================================');
  console.log('ADDITIONAL DIAGNOSTICS: Direct Resource Update (REST standard)');
  console.log('==================================================');
  // Check how Frappe standard REST handles User.name vs User.email on Link: User field
  console.log('Testing REST PUT with employee = "Administrator"...');
  const put1 = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies, 'PUT', { employee: 'Administrator' });
  console.log('PUT "Administrator" Status:', put1.status, 'Body:', JSON.stringify(put1.data));

  const getPut1 = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
  console.log('GET after PUT "Administrator": employee =', getPut1.data?.data?.employee);

  console.log('\nTesting REST PUT with employee = "admin@example.com"...');
  const put2 = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies, 'PUT', { employee: 'admin@example.com' });
  console.log('PUT "admin@example.com" Status:', put2.status, 'Body:', JSON.stringify(put2.data));

  const getPut2 = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
  console.log('GET after PUT "admin@example.com": employee =', getPut2.data?.data?.employee);

  // Restore or set to known state if needed
  console.log('\nTesting REST PUT with tutu@gmail.com (where name === email)...');
  const put3 = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies, 'PUT', { employee: 'tutu@gmail.com' });
  console.log('PUT "tutu@gmail.com" Status:', put3.status, 'Body:', JSON.stringify(put3.data));
  const getPut3 = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
  console.log('GET after PUT "tutu@gmail.com": employee =', getPut3.data?.data?.employee);
}

run().catch(console.error);
