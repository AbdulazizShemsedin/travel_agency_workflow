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

async function createFullClearance() {
  const cookies = await login('Administrator', '1234');

  // 1. Create Applicant
  const appRes = await req('/api/resource/Applicant', cookies, 'POST', {
    first_name: 'Test',
    last_name: 'ClearanceRunner',
    gender: 'Female',
    nationality: 'Ethiopia',
    marital_status: 'Single',
    children: 0,
    phone_number: '+251911998877',
    city: 'Addis Ababa',
    country: 'Ethiopia'
  });
  console.log('Applicant creation:', appRes.status, appRes.data?.data?.name || appRes.data);
  const applicantId = appRes.data?.data?.name;
  if (!applicantId) return;

  // 2. Register
  await req(`/api/resource/Applicant/${applicantId}`, cookies, 'PUT', {
    date_of_birth: '1998-01-01',
    passport_number: 'EP' + Math.floor(100000 + Math.random() * 900000),
    highest_education: 'High School',
    medical_status: 'FIT',
    medical_expiry_date: '2027-01-01'
  });

  const regRes = await req(
    '/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant',
    cookies,
    'POST',
    { applicant_name: applicantId }
  );
  console.log('Register Applicant:', regRes.status, regRes.data?.message || regRes.data?.applicant?.applicant_state);

  // 3. Generate CV
  const cvRes = await req(
    '/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv',
    cookies,
    'POST',
    { applicant_name: applicantId }
  );
  console.log('Generate CV:', cvRes.status, cvRes.data?.message?.cv_record || cvRes.data);

  // 4. Send Contract Request
  const crId = `CR-${applicantId.replace('APP-', '')}`;
  const crRes = await req(
    '/api/method/applicant_processing.applicant_processing.doctype.contract_request.contract_request.send_contract_request',
    cookies,
    'POST',
    { contract_request_name: crId }
  );
  console.log('Send Contract Request:', crRes.status, crRes.data);

  // 5. Parse Dossier -> This creates DSR and LMS Clearance
  const dossierId = `DOSSIER-${applicantId.replace('APP-', '')}`;
  const parseRes = await req(
    '/api/method/applicant_processing.applicant_processing.doctype.applicant_dossier.applicant_dossier.parse_dossier_file',
    cookies,
    'POST',
    { dossier_name: dossierId }
  );
  console.log('Parse Dossier:', parseRes.status, parseRes.data);

  // 6. Check LMS Clearance records
  const lmsList = await req('/api/resource/LMS Clearance?fields=["name","applicant","employee","status"]', cookies);
  console.log('\nAll LMS Clearance records:', JSON.stringify(lmsList.data, null, 2));

  return lmsList.data?.[0]?.name;
}

createFullClearance().then((name) => console.log('Created Clearance:', name)).catch(console.error);
