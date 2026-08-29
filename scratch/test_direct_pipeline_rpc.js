const https = require('https');

const HOST = 'applicantprocessing-production-e2e7.up.railway.app';
const API_KEY = 'a7b1bb5c2468fcf';
const API_SECRET = 'abe2dc090ca1d39';

function makeRequest(path, headers = {}) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: HOST,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
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
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          raw: data
        });
      });
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    req.end();
  });
}

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

async function runTest() {
  const timestamp = new Date().toISOString();
  console.log(`================ READ-ONLY VERIFICATION ================`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Host: https://${HOST}`);

  console.log(`\n--- 1. Testing with Administrator Session Cookie ---`);
  const loginAdmin = await login('Administrator', '1234');
  const cookieAdmin = (loginAdmin.cookies || []).map(c => c.split(';')[0]).join('; ');

  const res1 = await makeRequest(
    '/api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates',
    { 'Cookie': cookieAdmin }
  );
  console.log(`Endpoint: /api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates`);
  console.log(`Status: ${res1.status}`);
  console.log(`Response Body:\n`, JSON.stringify(res1.body, null, 2));

  console.log(`\n--- 2. Testing with Agent Portal Query: ?stage=Selected&limit=100 ---`);
  const res2 = await makeRequest(
    '/api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates?stage=Selected&limit=100',
    { 'Cookie': cookieAdmin }
  );
  console.log(`Status: ${res2.status}`);
  console.log(`Response Body:\n`, JSON.stringify(res2.body, null, 2));

  console.log(`\n--- 3. Testing with Token Authentication Header ---`);
  const res3 = await makeRequest(
    '/api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates',
    { 'Authorization': `token ${API_KEY}:${API_SECRET}` }
  );
  console.log(`Status: ${res3.status}`);
  console.log(`Response Body:\n`, JSON.stringify(res3.body, null, 2));

  console.log(`\n--- 4. Testing with Partner / Foreign Agency User (tutu@gmail.com) ---`);
  const loginAgent = await login('tutu@gmail.com', '@1234@');
  const cookieAgent = (loginAgent.cookies || []).map(c => c.split(';')[0]).join('; ');
  const res4 = await makeRequest(
    '/api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates',
    { 'Cookie': cookieAgent }
  );
  console.log(`Status: ${res4.status}`);
  console.log(`Response Body:\n`, JSON.stringify(res4.body, null, 2));
}

runTest().catch(console.error);
