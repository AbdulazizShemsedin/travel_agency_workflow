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

async function auditBackend() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('=== 1. CHECK APP-00011 ===');
  const app11 = await requestWithCookies('/api/resource/Applicant/APP-00011', cookies);
  console.log('APP-00011 Record:', app11.status, app11.data?.data ? {
    name: app11.data.data.name,
    full_name: app11.data.data.full_name,
    destination_country: app11.data.data.destination_country,
    applicant_state: app11.data.data.applicant_state,
    is_uploaded_to_musaned: app11.data.data.is_uploaded_to_musaned,
    musaned_status: app11.data.data.musaned_status,
  } : app11.data);

  console.log('\n=== 2. DOSSIER FOR APP-00011 ===');
  const dosList = await requestWithCookies('/api/resource/Applicant Dossier?filters=[["applicant","=","APP-00011"]]&fields=["*"]', cookies);
  console.log('Dossiers for APP-00011:', dosList.data?.data);

  let dossierName = dosList.data?.data?.[0]?.name;
  let dsrName = null;

  if (dossierName) {
    console.log('\n=== 3. DSR FOR DOSSIER', dossierName, '===');
    const dsrList = await requestWithCookies(`/api/resource/DSR?filters=[["applicant_dossier","=","${dossierName}"]]&fields=["*"]`, cookies);
    console.log('DSRs:', dsrList.data?.data);
    dsrName = dsrList.data?.data?.[0]?.name;
  }

  console.log('\n=== 4. CLEARANCES LINKED TO DSR', dsrName, '===');
  if (dsrName) {
    const lms = await requestWithCookies(`/api/resource/LMS Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]`, cookies);
    console.log('LMS Clearance:', lms.data?.data);

    const injaz = await requestWithCookies(`/api/resource/Injaz Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]`, cookies);
    console.log('Injaz Clearance:', injaz.data?.data);

    const wakala = await requestWithCookies(`/api/resource/Wakala Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]`, cookies);
    console.log('Wakala Clearance:', wakala.data?.data);

    const embassy = await requestWithCookies(`/api/resource/Embassy Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]`, cookies);
    console.log('Embassy Clearance:', embassy.data?.data);

    const telesign = await requestWithCookies(`/api/resource/Telesign Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]`, cookies);
    console.log('Telesign Clearance:', telesign.data?.data);
  }

  console.log('\n=== 5. CHECK USER "Administrator" IN DB ===');
  const adminUser = await requestWithCookies('/api/resource/User/Administrator', cookies);
  console.log('Administrator User doc:', {
    name: adminUser.data?.data?.name,
    full_name: adminUser.data?.data?.full_name,
    email: adminUser.data?.data?.email,
    username: adminUser.data?.data?.username,
  });

  console.log('\n=== 6. CHECK ALL APPLICANTS IN DB ===');
  const allApps = await requestWithCookies('/api/resource/Applicant?fields=["name","full_name","destination_country","applicant_state"]', cookies);
  console.log('All Applicants:', allApps.data?.data);
}

auditBackend().catch(console.error);
