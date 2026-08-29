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

async function verifyCorridors() {
  const cookies = await login('Administrator', '1234');

  console.log('========================================================================');
  console.log('1. VERIFY SAUDI ARABIA CORRIDOR ASSIGNMENT (LMS + Injaz + Wakala)');
  console.log('========================================================================');
  // Read DSR-00001 (linked to Saudi Dossier DOSSIER-00001)
  const dsrRes = await req('/api/resource/DSR/DSR-00001', cookies);
  console.log('Saudi DSR:', dsrRes.data?.data?.name, 'Country:', dsrRes.data?.data?.destination_country);

  // Fetch clearances linked to DSR-00001
  const lmsList = await req('/api/resource/LMS Clearance?filters=[["dsr","=","DSR-00001"]]', cookies);
  const injazList = await req('/api/resource/Injaz Clearance?filters=[["dsr","=","DSR-00001"]]', cookies);
  const wakalaList = await req('/api/resource/Wakala Clearance?filters=[["dsr","=","DSR-00001"]]', cookies);

  const lmsName = lmsList.data?.data?.[0]?.name;
  const injazName = injazList.data?.data?.[0]?.name;
  const wakalaName = wakalaList.data?.data?.[0]?.name;

  console.log('Found Saudi Clearances:', { lmsName, injazName, wakalaName });

  // Update Saudi clearances with Frappe User.names
  console.log('Assigning Saudi Clearances via REST PUT:');
  const upLms = await req(`/api/resource/LMS Clearance/${lmsName}`, cookies, 'PUT', { employee: 'Administrator' });
  const upInj = await req(`/api/resource/Injaz Clearance/${injazName}`, cookies, 'PUT', { employee: 'tutu@gmail.com' });
  const upWak = await req(`/api/resource/Wakala Clearance/${wakalaName}`, cookies, 'PUT', { employee: 'Administrator' });

  console.log(`- PUT LMS (${lmsName}) status:`, upLms.status, 'employee:', upLms.data?.data?.employee);
  console.log(`- PUT Injaz (${injazName}) status:`, upInj.status, 'employee:', upInj.data?.data?.employee);
  console.log(`- PUT Wakala (${wakalaName}) status:`, upWak.status, 'employee:', upWak.data?.data?.employee);

  // Refetch & Verify
  const getLms = await req(`/api/resource/LMS Clearance/${lmsName}`, cookies);
  const getInj = await req(`/api/resource/Injaz Clearance/${injazName}`, cookies);
  const getWak = await req(`/api/resource/Wakala Clearance/${wakalaName}`, cookies);

  console.log('Readback Verification:');
  console.log(`- LMS Clearance Employee: ${getLms.data?.data?.employee} (Expected: "Administrator")`);
  console.log(`- Injaz Clearance Employee: ${getInj.data?.data?.employee} (Expected: "tutu@gmail.com")`);
  console.log(`- Wakala Clearance Employee: ${getWak.data?.data?.employee} (Expected: "Administrator")`);

  console.log('\n========================================================================');
  console.log('2. SET UP & VERIFY KUWAIT CORRIDOR ASSIGNMENT (LMS + Telesign + Embassy)');
  console.log('========================================================================');
  
  // Create Kuwait Dossier & DSR for APP-00002
  await req('/api/resource/Applicant/APP-00002', cookies, 'PUT', {
    destination_country: 'Kuwait',
    applicant_state: 'Selected'
  });

  const cv2 = await req('/api/resource/CV Record', cookies, 'POST', {
    applicant: 'APP-00002',
    full_name: 'Fatima Ali',
    file_attachment: '/files/test_cv2.pdf',
    status: 'Final'
  });
  const cv2Name = cv2.data?.data?.name || 'CV-00002';

  const conList = await req('/api/resource/Contractor', cookies);
  const contractorName = conList.data?.data?.[0]?.name;

  const cr2 = await req('/api/resource/Contract Request', cookies, 'POST', {
    applicant: 'APP-00002',
    cv_reference: cv2Name,
    contractor: contractorName,
    status: 'Accepted'
  });
  const cr2Name = cr2.data?.data?.name || 'CR-00002';

  const dos2 = await req('/api/resource/Applicant Dossier', cookies, 'POST', {
    contract_request: cr2Name,
    applicant: 'APP-00002',
    status: 'Ready for Clearances'
  });
  const dos2Name = dos2.data?.data?.name || 'DOSSIER-00002';

  const dsr2 = await req('/api/resource/DSR', cookies, 'POST', {
    applicant_dossier: dos2Name,
    applicant: 'APP-00002',
    destination_country: 'Kuwait',
    status: 'In Progress'
  });
  const dsr2Name = dsr2.data?.data?.name || 'DSR-00002';

  // Create Kuwait Clearances (LMS, Telesign, Embassy)
  const lms2 = await req('/api/resource/LMS Clearance', cookies, 'POST', {
    dsr: dsr2Name,
    applicant_dossier: dos2Name,
    full_name: 'Fatima Ali',
    status: 'Pending'
  });
  const lms2Name = lms2.data?.data?.name;

  const ts2 = await req('/api/resource/Telesign Clearance', cookies, 'POST', {
    dsr: dsr2Name,
    applicant_dossier: dos2Name,
    full_name: 'Fatima Ali',
    status: 'Pending'
  });
  const ts2Name = ts2.data?.data?.name;

  const emb2 = await req('/api/resource/Embassy Clearance', cookies, 'POST', {
    dsr: dsr2Name,
    applicant_dossier: dos2Name,
    full_name: 'Fatima Ali',
    status: 'Pending'
  });
  const emb2Name = emb2.data?.data?.name;

  console.log('Kuwait DSR Created:', dsr2Name);
  console.log('Created Kuwait Clearances:', { lms2Name, ts2Name, emb2Name });

  // Update Kuwait clearances via REST PUT
  console.log('\nAssigning Kuwait Clearances via REST PUT:');
  const upLms2 = await req(`/api/resource/LMS Clearance/${lms2Name}`, cookies, 'PUT', { employee: 'Administrator' });
  const upTs2 = await req(`/api/resource/Telesign Clearance/${ts2Name}`, cookies, 'PUT', { employee: 'tutu@gmail.com' });
  const upEmb2 = await req(`/api/resource/Embassy Clearance/${emb2Name}`, cookies, 'PUT', { employee: 'Administrator' });

  console.log(`- PUT LMS (${lms2Name}) status:`, upLms2.status, 'employee:', upLms2.data?.data?.employee);
  console.log(`- PUT Telesign (${ts2Name}) status:`, upTs2.status, 'employee:', upTs2.data?.data?.employee);
  console.log(`- PUT Embassy (${emb2Name}) status:`, upEmb2.status, 'employee:', upEmb2.data?.data?.employee);

  // Refetch & Verify
  const getLms2 = await req(`/api/resource/LMS Clearance/${lms2Name}`, cookies);
  const getTs2 = await req(`/api/resource/Telesign Clearance/${ts2Name}`, cookies);
  const getEmb2 = await req(`/api/resource/Embassy Clearance/${emb2Name}`, cookies);

  console.log('\nKuwait Readback Verification:');
  console.log(`- LMS Clearance Employee: ${getLms2.data?.data?.employee} (Expected: "Administrator")`);
  console.log(`- Telesign Clearance Employee: ${getTs2.data?.data?.employee} (Expected: "tutu@gmail.com")`);
  console.log(`- Embassy Clearance Employee: ${getEmb2.data?.data?.employee} (Expected: "Administrator")`);
}

verifyCorridors().catch(console.error);
