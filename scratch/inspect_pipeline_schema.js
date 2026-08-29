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

async function inspectPipelineSchema() {
  const loginRes = await login('Administrator', '1234');
  const cookies = loginRes.cookies;

  console.log('--- 1. Testing get_agency_pipeline_candidates RPC ---');
  const pipeRes = await requestWithCookies('/api/method/applicant_processing.applicant_processing.api.get_agency_pipeline_candidates', cookies);
  console.log('get_agency_pipeline_candidates status:', pipeRes.status, pipeRes.data);

  console.log('\n--- 2. Inspecting Applicant DocType Fields ---');
  const appMeta = await requestWithCookies('/api/method/frappe.desk.form.load.getdoctype?doctype=Applicant', cookies);
  const fields = appMeta.data?.docs?.[0]?.fields?.map(f => f.fieldname) || [];
  console.log('Applicant fieldnames:', fields);

  console.log('\n--- 3. Inspecting Applicant Dossier DocType Fields ---');
  const dosMeta = await requestWithCookies('/api/method/frappe.desk.form.load.getdoctype?doctype=Applicant Dossier', cookies);
  const dosFields = dosMeta.data?.docs?.[0]?.fields?.map(f => f.fieldname) || [];
  console.log('Applicant Dossier fieldnames:', dosFields);

  console.log('\n--- 4. Inspecting DSR Ticket DocType Fields ---');
  const tktMeta = await requestWithCookies('/api/method/frappe.desk.form.load.getdoctype?doctype=DSR Ticket', cookies);
  const tktFields = tktMeta.data?.docs?.[0]?.fields?.map(f => f.fieldname) || [];
  console.log('DSR Ticket fieldnames:', tktFields);

  console.log('\n--- 5. Querying Dossiers in DB ---');
  const dosList = await requestWithCookies('/api/resource/Applicant Dossier?fields=["*"]', cookies);
  console.log('Dossiers in DB:', dosList.data?.data);
}

inspectPipelineSchema().catch(console.error);
