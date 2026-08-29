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

async function fullInventory() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('--- ALL APPLICANTS ---');
  const apps = await requestWithCookies('/api/resource/Applicant?fields=["name","full_name","destination_country","applicant_state"]&limit_page_length=100', cookies);
  console.log(apps.data?.data);

  console.log('--- ALL DOSSIERS ---');
  const dos = await requestWithCookies('/api/resource/Applicant Dossier?fields=["name","applicant","full_name"]&limit_page_length=100', cookies);
  console.log(dos.data?.data);

  console.log('--- ALL DSRs ---');
  const dsrs = await requestWithCookies('/api/resource/DSR?fields=["name","applicant_dossier","full_name"]&limit_page_length=100', cookies);
  console.log(dsrs.data?.data);

  console.log('--- ALL LMS ---');
  const lms = await requestWithCookies('/api/resource/LMS Clearance?fields=["name","dsr","applicant_dossier","employee","status"]&limit_page_length=100', cookies);
  console.log(lms.data?.data);

  console.log('--- ALL INJAZ ---');
  const inj = await requestWithCookies('/api/resource/Injaz Clearance?fields=["name","dsr","applicant_dossier","employee","status"]&limit_page_length=100', cookies);
  console.log(inj.data?.data);

  console.log('--- ALL WAKALA ---');
  const wak = await requestWithCookies('/api/resource/Wakala Clearance?fields=["name","dsr","applicant_dossier","employee","status"]&limit_page_length=100', cookies);
  console.log(wak.data?.data);

  console.log('--- ALL EMBASSY ---');
  const emb = await requestWithCookies('/api/resource/Embassy Clearance?fields=["name","dsr","applicant_dossier","employee","status"]&limit_page_length=100', cookies);
  console.log(emb.data?.data);

  console.log('--- ALL TELESIGN ---');
  const tel = await requestWithCookies('/api/resource/Telesign Clearance?fields=["name","dsr","applicant_dossier","employee","status"]&limit_page_length=100', cookies);
  console.log(tel.data?.data);
}

fullInventory().catch(console.error);
