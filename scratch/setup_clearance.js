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

async function setupClearance() {
  const cookies = await login('Administrator', '1234');

  // Check Contractor
  const contractors = await req('/api/resource/Contractor', cookies);
  let contractorName = contractors.data?.data?.[0]?.name;
  if (!contractorName) {
    const createCon = await req('/api/resource/Contractor', cookies, 'POST', {
      contractor_name: 'Al-Khaleej Agency',
      country: 'Saudi Arabia',
      whatsapp: '+966500000000',
      contact_person: 'Tutu'
    });
    contractorName = createCon.data?.data?.name || 'CON-00001';
  }

  // Ensure Applicant APP-00001 exists and is Registered
  const appRes = await req('/api/resource/Applicant/APP-00001', cookies);
  if (appRes.status === 404) {
    await req('/api/resource/Applicant', cookies, 'POST', {
      first_name: 'Aisha',
      last_name: 'Ahmed',
      gender: 'Female',
      nationality: 'Ethiopia',
      phone_number: '+251911223344',
      applicant_state: 'Selected'
    });
  }

  // Create Contract Request
  const crRes = await req('/api/resource/Contract Request', cookies, 'POST', {
    applicant: 'APP-00001',
    contractor: contractorName,
    status: 'Accepted'
  });
  console.log('Contract Request:', crRes.status, crRes.data?.data?.name);
  const crName = crRes.data?.data?.name || 'CR-00001';

  // Create Applicant Dossier
  const dosRes = await req('/api/resource/Applicant Dossier', cookies, 'POST', {
    contract_request: crName,
    applicant: 'APP-00001',
    visa_number: '1234567890',
    sponsor_name: 'Ahmed Al-Saud',
    status: 'Processed'
  });
  console.log('Applicant Dossier:', dosRes.status, dosRes.data?.data?.name);
  const dossierName = dosRes.data?.data?.name || 'DOSSIER-00001';

  // Create DSR
  const dsrRes = await req('/api/resource/DSR', cookies, 'POST', {
    applicant_dossier: dossierName,
    applicant: 'APP-00001',
    country: 'Saudi Arabia',
    status: 'In Progress'
  });
  console.log('DSR:', dsrRes.status, dsrRes.data?.data?.name);
  const dsrName = dsrRes.data?.data?.name || 'DSR-00001';

  // Create LMS Clearance
  const lmsRes = await req('/api/resource/LMS Clearance', cookies, 'POST', {
    dsr: dsrName,
    applicant_dossier: dossierName,
    full_name: 'Aisha Ahmed',
    status: 'Pending'
  });
  console.log('LMS Clearance:', lmsRes.status, lmsRes.data?.data?.name);
  const lmsName = lmsRes.data?.data?.name;

  return lmsName;
}

setupClearance().then((name) => console.log('Successfully setup LMS Clearance:', name)).catch(console.error);
