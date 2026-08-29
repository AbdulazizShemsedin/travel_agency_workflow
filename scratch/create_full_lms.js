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
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
      });
    });
    if (postData) r.write(postData);
    r.end();
  });
}

async function createFullLmsRecord() {
  const cookies = await login('Administrator', '1234');

  // 0. Update APP-00001 to CV Generated
  await req('/api/resource/Applicant/APP-00001', cookies, 'PUT', {
    applicant_state: 'CV Generated',
    state_step: '3 of 9',
    state_progress: 33.3
  });

  // 1. Get or Create Contractor
  const conRes = await req('/api/resource/Contractor', cookies);
  const contractorName = conRes.data?.data?.[0]?.name;

  // 2. Update CV Record with file_attachment
  const cvList = await req('/api/resource/CV Record', cookies);
  const cvName = cvList.data?.data?.[0]?.name;
  await req(`/api/resource/CV Record/${cvName}`, cookies, 'PUT', {
    file_attachment: '/files/test_cv.pdf'
  });

  // 3. Create Contract Request
  const crRes = await req('/api/resource/Contract Request', cookies, 'POST', {
    applicant: 'APP-00001',
    cv_reference: cvName,
    contractor: contractorName,
    status: 'Accepted'
  });
  console.log('3. Contract Request:', crRes.status, crRes.data?.data?.name || crRes.data);
  const crName = crRes.data?.data?.name;

  // Update Applicant to Selected
  await req('/api/resource/Applicant/APP-00001', cookies, 'PUT', {
    applicant_state: 'Selected',
    state_step: '5 of 9',
    state_progress: 55.5
  });

  // 4. Create Applicant Dossier
  const dosRes = await req('/api/resource/Applicant Dossier', cookies, 'POST', {
    contract_request: crName,
    applicant: 'APP-00001',
    status: 'Ready for Clearances'
  });
  console.log('4. Applicant Dossier:', dosRes.status, dosRes.data?.data?.name || dosRes.data);
  const dossierName = dosRes.data?.data?.name;

  // 5. Create DSR
  const dsrRes = await req('/api/resource/DSR', cookies, 'POST', {
    applicant_dossier: dossierName,
    applicant: 'APP-00001',
    country: 'Saudi Arabia',
    status: 'In Progress'
  });
  console.log('5. DSR:', dsrRes.status, dsrRes.data?.data?.name || dsrRes.data);
  const dsrName = dsrRes.data?.data?.name;

  // 6. Create LMS Clearance
  const lmsRes = await req('/api/resource/LMS Clearance', cookies, 'POST', {
    dsr: dsrName,
    applicant_dossier: dossierName,
    full_name: 'Aisha Ahmed',
    status: 'Pending'
  });
  console.log('6. LMS Clearance:', lmsRes.status, lmsRes.data?.data?.name || lmsRes.data);
  const lmsName = lmsRes.data?.data?.name;

  return lmsName;
}

createFullLmsRecord().then(res => console.log('Final LMS Clearance Name:', res)).catch(console.error);
