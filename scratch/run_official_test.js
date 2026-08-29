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

function req(path, cookies, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const postData = body ? JSON.stringify(body) : null;
    const r = https.request({
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
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: parsed,
          raw: data
        });
      });
    });
    r.on('error', (e) => resolve({ status: 500, error: e.message }));
    if (postData) r.write(postData);
    r.end();
  });
}

async function runOfficialTest() {
  const cookies = await login('Administrator', '1234');

  const testClearanceId = 'LMS-00001';

  console.log('================================================================');
  console.log('INITIAL STATE INSPECTION');
  console.log('================================================================');
  const userList = await req('/api/resource/User?fields=["name","email","full_name"]', cookies);
  console.log('Users in system:', JSON.stringify(userList.data?.data, null, 2));

  const initGet = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies);
  console.log(`Initial LMS Clearance (${testClearanceId}) state:`, {
    name: initGet.data?.data?.name,
    employee: initGet.data?.data?.employee,
    status: initGet.data?.data?.status
  });

  console.log('\n================================================================');
  console.log('TEST 1 — USER.NAME ("Administrator") via RPC assign_clearance_employee');
  console.log('================================================================');
  const test1Payload = {
    clearance_doctype: 'LMS Clearance',
    clearance_id: testClearanceId,
    employee: 'Administrator'
  };
  console.log('Target RPC Endpoint: POST /api/method/applicant_processing.applicant_processing.api.assign_clearance_employee');
  console.log('Payload:', JSON.stringify(test1Payload, null, 2));

  const test1Res = await req(
    '/api/method/applicant_processing.applicant_processing.api.assign_clearance_employee',
    cookies,
    'POST',
    test1Payload
  );

  console.log('HTTP Status:', test1Res.status);
  console.log('Accepted:', test1Res.status >= 200 && test1Res.status < 300);
  console.log('Exact Response Body:\n', JSON.stringify(test1Res.data, null, 2));
  console.log('Raw Body:\n', test1Res.raw);

  const test1Get = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies);
  console.log(`GET ${testClearanceId} -> employee:`, test1Get.data?.data?.employee);

  console.log('\n================================================================');
  console.log('TEST 2 — USER.EMAIL ("admin@example.com") via RPC assign_clearance_employee');
  console.log('================================================================');
  const test2Payload = {
    clearance_doctype: 'LMS Clearance',
    clearance_id: testClearanceId,
    employee: 'admin@example.com'
  };
  console.log('Target RPC Endpoint: POST /api/method/applicant_processing.applicant_processing.api.assign_clearance_employee');
  console.log('Payload:', JSON.stringify(test2Payload, null, 2));

  const test2Res = await req(
    '/api/method/applicant_processing.applicant_processing.api.assign_clearance_employee',
    cookies,
    'POST',
    test2Payload
  );

  console.log('HTTP Status:', test2Res.status);
  console.log('Accepted:', test2Res.status >= 200 && test2Res.status < 300);
  console.log('Exact Response Body:\n', JSON.stringify(test2Res.data, null, 2));
  console.log('Raw Body:\n', test2Res.raw);

  const test2Get = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies);
  console.log(`GET ${testClearanceId} -> employee:`, test2Get.data?.data?.employee);

  console.log('\n================================================================');
  console.log('CANONICAL FRAPPE LINK FIELD SEMANTICS VERIFICATION (REST API)');
  console.log('================================================================');
  console.log('1. Testing PUT /api/resource/LMS Clearance/LMS-00001 with { "employee": "Administrator" } [User.name]');
  const restPut1 = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies, 'PUT', { employee: 'Administrator' });
  console.log('Status:', restPut1.status);
  console.log('Response Body:', JSON.stringify(restPut1.data, null, 2));
  const restGet1 = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies);
  console.log('Persisted employee in DB:', restGet1.data?.data?.employee);

  console.log('\n2. Testing PUT /api/resource/LMS Clearance/LMS-00001 with { "employee": "admin@example.com" } [User.email]');
  const restPut2 = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies, 'PUT', { employee: 'admin@example.com' });
  console.log('Status:', restPut2.status);
  console.log('Response Body:', JSON.stringify(restPut2.data, null, 2));
  const restGet2 = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies);
  console.log('Persisted employee in DB:', restGet2.data?.data?.employee);

  console.log('\n3. Testing PUT /api/resource/LMS Clearance/LMS-00001 with { "employee": "tutu@gmail.com" } [User.name where name == email]');
  const restPut3 = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies, 'PUT', { employee: 'tutu@gmail.com' });
  console.log('Status:', restPut3.status);
  console.log('Response Body:', JSON.stringify(restPut3.data, null, 2));
  const restGet3 = await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies);
  console.log('Persisted employee in DB:', restGet3.data?.data?.employee);

  // Restore to clean state
  await req(`/api/resource/LMS Clearance/${testClearanceId}`, cookies, 'PUT', { employee: null });
}

runOfficialTest().catch(console.error);
