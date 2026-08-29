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

async function testPipelineFallback() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  const validFields = JSON.stringify([
    'name',
    'full_name',
    'first_name',
    'last_name',
    'passport_number',
    'job_applied',
    'destination_country',
    'photo_passport',
    'applicant_state',
    'locked_contractor',
    'creation',
    'modified'
  ]);

  const pipelineStates = ['Selected', 'Processing', 'Stamped', 'Ticketed', 'Departed'];
  const filters = JSON.stringify([['applicant_state', 'in', pipelineStates]]);

  const res = await requestWithCookies(`/api/resource/Applicant?filters=${filters}&fields=${validFields}&limit_page_length=100`, cookies);
  console.log('Pipeline Applicants:', res.status, res.data?.data);

  // Query Dossiers for enrichment
  const dosRes = await requestWithCookies(`/api/resource/Applicant Dossier?fields=["name","applicant","contractor_name","sponsor_name","visa_number","contract_number","contract_date"]&limit_page_length=100`, cookies);
  console.log('Dossiers:', dosRes.status, dosRes.data?.data);
}

testPipelineFallback().catch(console.error);
