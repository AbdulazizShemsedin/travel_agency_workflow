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
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function testClearanceCreation() {
  const cookies = await login('Administrator', '1234');
  
  // 1. Let's see if DSR exists or create a test DSR
  const dsrList = await requestWithCookies('/api/resource/DSR?fields=["*"]', cookies);
  console.log('DSR List:', dsrList.data?.data);

  // 2. Let's create a DSR if none exists
  let dsrName = dsrList.data?.data?.[0]?.name;
  if (!dsrName) {
    const createDsr = await requestWithCookies('/api/resource/DSR', cookies, 'POST', {
      country: 'Saudi Arabia',
      status: 'In Progress'
    });
    console.log('Create DSR:', createDsr.status, createDsr.data);
    dsrName = createDsr.data?.data?.name;
  }

  // 3. Create a test LMS Clearance
  const createLms = await requestWithCookies('/api/resource/LMS Clearance', cookies, 'POST', {
    dsr: dsrName,
    full_name: 'Test Candidate',
    status: 'Pending'
  });
  console.log('Create LMS Clearance:', createLms.status, createLms.data);
  const clearanceId = createLms.data?.data?.name;

  if (clearanceId) {
    console.log('\n--- Testing PUT on LMS Clearance with "Administrator" vs "admin@example.com" ---');
    
    // A) Assign Administrator
    const putAdmin = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies, 'PUT', {
      employee: 'Administrator'
    });
    console.log('PUT "Administrator" -> Status:', putAdmin.status, 'Employee:', putAdmin.data?.data?.employee);

    const getAdmin = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
    console.log('GET after "Administrator" -> Employee:', getAdmin.data?.data?.employee);

    // B) Assign admin@example.com
    const putEmail = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies, 'PUT', {
      employee: 'admin@example.com'
    });
    console.log('PUT "admin@example.com" -> Status:', putEmail.status, 'Exception/Data:', putEmail.data?.exception || putEmail.data?.data?.employee);

    const getEmail = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
    console.log('GET after "admin@example.com" -> Employee:', getEmail.data?.data?.employee);

    // C) Assign tutu@gmail.com (where name === 'tutu@gmail.com')
    const putTutu = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies, 'PUT', {
      employee: 'tutu@gmail.com'
    });
    console.log('PUT "tutu@gmail.com" -> Status:', putTutu.status, 'Employee:', putTutu.data?.data?.employee);

    const getTutu = await requestWithCookies(`/api/resource/LMS Clearance/${clearanceId}`, cookies);
    console.log('GET after "tutu@gmail.com" -> Employee:', getTutu.data?.data?.employee);

    // Now test the exact RPC method called in the prompt with this real clearance record:
    console.log('\n--- Now Calling RPC assign_clearance_employee with Real Clearance ID ---');
    const rpc1 = await requestWithCookies(
      '/api/method/applicant_processing.applicant_processing.api.assign_clearance_employee',
      cookies,
      'POST',
      {
        clearance_doctype: 'LMS Clearance',
        clearance_id: clearanceId,
        employee: 'Administrator'
      }
    );
    console.log('RPC 1 ("Administrator") Status:', rpc1.status);
    console.log('RPC 1 Body:', JSON.stringify(rpc1.data, null, 2));

    const rpc2 = await requestWithCookies(
      '/api/method/applicant_processing.applicant_processing.api.assign_clearance_employee',
      cookies,
      'POST',
      {
        clearance_doctype: 'LMS Clearance',
        clearance_id: clearanceId,
        employee: 'admin@example.com'
      }
    );
    console.log('RPC 2 ("admin@example.com") Status:', rpc2.status);
    console.log('RPC 2 Body:', JSON.stringify(rpc2.data, null, 2));
  }
}

testClearanceCreation().catch(console.error);
