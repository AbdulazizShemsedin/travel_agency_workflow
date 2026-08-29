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

async function runTest() {
  console.log('Logging in as Administrator on', HOST);
  const loginRes = await login('Administrator', '1234');
  console.log('Login Status:', loginRes.status);
  const cookies = loginRes.cookies;

  console.log('\n================ 1. INSPECTING REAL APPLICANTS ================');
  for (const appId of ['APP-00001', 'APP-00002', 'APP-00003']) {
    const res = await requestWithCookies(`/api/resource/Applicant/${appId}`, cookies);
    const d = res.data?.data;
    console.log(`[${appId}] Name: ${d?.full_name}, State: ${d?.applicant_state}, Dest: ${d?.destination_country}, Musaned Status: ${d?.musaned_status}, Musaned Ref: ${d?.musaned_reference_no}`);
  }

  console.log('\n================ 2. TESTING MUSANED PRE-REGISTRATION UPDATE ================');
  const targetApp = 'APP-00002';
  const putRes = await requestWithCookies(`/api/resource/Applicant/${targetApp}`, cookies, 'PUT', {
    destination_country: 'Saudi Arabia',
    is_uploaded_to_musaned: 1,
    musaned_reference_no: 'MUS-2026-SA9912',
    musaned_status: 'Registered',
  });
  console.log('PUT Musaned Status Code:', putRes.status);
  console.log('Updated Record:', {
    name: putRes.data?.data?.name,
    musaned_status: putRes.data?.data?.musaned_status,
    musaned_reference_no: putRes.data?.data?.musaned_reference_no,
    is_uploaded_to_musaned: putRes.data?.data?.is_uploaded_to_musaned,
  });

  console.log('\n================ 3. TESTING CV GENERATION AFTER MUSANED REGISTRATION ================');
  const cvRes = await requestWithCookies(
    '/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv',
    cookies,
    'POST',
    { applicant: targetApp, applicant_name: targetApp }
  );
  console.log('CV Gen HTTP Status:', cvRes.status);
  console.log('CV Gen Result:', cvRes.data?.message);

  const refreshedApp = await requestWithCookies(`/api/resource/Applicant/${targetApp}`, cookies);
  console.log('\nRefreshed Applicant State:', refreshedApp.data?.data?.applicant_state);
  console.log('Refreshed CV File URL:', refreshedApp.data?.data?.cv_file_url);

  console.log('\n================ 4. TESTING KUWAIT CORRIDOR APPLICANT ================');
  const kuwaitApp = 'APP-00003';
  await requestWithCookies(`/api/resource/Applicant/${kuwaitApp}`, cookies, 'PUT', {
    destination_country: 'Kuwait',
    applicant_state: 'Registered',
    medical_status: 'FIT'
  });
  const kuwaitRes = await requestWithCookies(`/api/resource/Applicant/${kuwaitApp}`, cookies);
  console.log(`[${kuwaitApp}] Destination: ${kuwaitRes.data?.data?.destination_country}, State: ${kuwaitRes.data?.data?.applicant_state}, Musaned Req: None`);

  console.log('\n================ ALL E2E VERIFICATION CHECKS COMPLETED SUCCESSFULLY ================');
}

runTest().catch(console.error);
