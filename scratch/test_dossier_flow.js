const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login() {
  return new Promise(res => {
    const data = JSON.stringify({ usr: 'Administrator', pwd: '1234' });
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/method/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => res(resp.headers['set-cookie'] || []));
    });
    r.write(data);
    r.end();
  });
}

function req(path, method, body, cookies) {
  return new Promise(res => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try {
          res({ status: resp.statusCode, body: JSON.parse(d), raw: d });
        } catch {
          res({ status: resp.statusCode, raw: d });
        }
      });
    });
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const cookies = await login();
  console.log('Logged in as Administrator');

  // 1. Check Contractors
  const contrRes = await req('/api/resource/Contractor?limit_page_length=5', 'GET', null, cookies);
  console.log('Contractors:', contrRes.body?.data);
  const contractorName = contrRes.body?.data?.[0]?.name;

  // 2. Check CV Record for APP-00003
  const cvRes = await req('/api/resource/CV Record?filters=[["applicant","=","APP-00003"]]', 'GET', null, cookies);
  console.log('CV Record:', cvRes.body?.data);
  const cvName = cvRes.body?.data?.[0]?.name;

  // 3. Create or find Contract Request
  let crRes = await req('/api/resource/Contract Request?filters=[["applicant","=","APP-00003"]]', 'GET', null, cookies);
  let crName = crRes.body?.data?.[0]?.name;
  if (!crName && contractorName && cvName) {
    const newCR = await req('/api/resource/Contract Request', 'POST', {
      applicant: 'APP-00003',
      contractor: contractorName,
      cv_reference: cvName,
      status: 'Sent'
    }, cookies);
    console.log('Created CR:', newCR.status, newCR.body);
    crName = newCR.body?.data?.name;
  }

  // 4. Create Applicant Dossier
  let dosRes = await req('/api/resource/Applicant Dossier?filters=[["applicant","=","APP-00003"]]', 'GET', null, cookies);
  let dosName = dosRes.body?.data?.[0]?.name;
  if (!dosName) {
    const newDos = await req('/api/resource/Applicant Dossier', 'POST', {
      applicant: 'APP-00003',
      contract_request: crName || undefined,
      file_name: 'test_contract.pdf',
      approval_status: 'Pending',
      is_parsed: 0
    }, cookies);
    console.log('Created Dossier:', newDos.status, newDos.body);
    dosName = newDos.body?.data?.name;
  }
  console.log('Dossier Name for APP-00003:', dosName);

  if (dosName) {
    // 5. Test parse_contract_document
    const parseRes = await req('/api/method/applicant_processing.applicant_processing.utils.contract_parser.parse_contract_document', 'POST', {
      dossier_name: dosName
    }, cookies);
    console.log('parse_contract_document result:', parseRes.status, parseRes.body);
  }
}

run().catch(console.error);
