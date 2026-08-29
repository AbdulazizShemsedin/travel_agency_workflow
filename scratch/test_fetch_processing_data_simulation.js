const http = require('http');

function req(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method,
      headers: {
        'Accept': 'application/json'
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try {
          resolve({ status: resp.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: resp.statusCode, raw: d });
        }
      });
    });
    r.on('error', reject);
    r.end();
  });
}

async function fetchProcessingData(applicantId) {
  const result = {
    dossier: null,
    dsr: null,
    lms: null,
    injaz: null,
    wakala: null,
    embassy: null,
    telesign: null,
    stamp: null,
    ticket: null,
    departure: null,
  };

  const dosRes = await req(`/api/resource/Applicant Dossier?filters=[["applicant","=","${applicantId}"]]&fields=["*"]&limit_page_length=1`);
  if (!dosRes.body?.data || dosRes.body.data.length === 0) return result;
  result.dossier = dosRes.body.data[0];

  const dossierName = result.dossier?.name;
  if (!dossierName) return result;

  const dsrRes = await req(`/api/resource/DSR?filters=[["applicant_dossier","=","${dossierName}"]]&fields=["*"]&order_by=creation desc&limit_page_length=1`);
  if (!dsrRes.body?.data || dsrRes.body.data.length === 0) return result;
  result.dsr = dsrRes.body.data[0];

  const dsrName = result.dsr?.name;
  if (!dsrName) return result;

  const lmsRes = await req(`/api/resource/LMS Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]&limit_page_length=1`);
  if (lmsRes.body?.data && lmsRes.body.data.length > 0) result.lms = lmsRes.body.data[0];

  const injRes = await req(`/api/resource/Injaz Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]&limit_page_length=1`);
  if (injRes.body?.data && injRes.body.data.length > 0) result.injaz = injRes.body.data[0];

  const wakRes = await req(`/api/resource/Wakala Clearance?filters=[["dsr","=","${dsrName}"]]&fields=["*"]&limit_page_length=1`);
  if (wakRes.body?.data && wakRes.body.data.length > 0) result.wakala = wakRes.body.data[0];

  return result;
}

async function run() {
  for (const appId of ['APP-00001', 'APP-00002', 'APP-00003', 'APP-00004', 'APP-00005']) {
    console.log(`\n========================================`);
    console.log(`Processing Data for ${appId}:`);
    const data = await fetchProcessingData(appId);
    console.log('Dossier:', data.dossier?.name);
    console.log('DSR:', data.dsr?.name);
    console.log('LMS object:', data.lms ? {
      name: data.lms.name,
      dsr: data.lms.dsr,
      status: data.lms.status,
      employee: data.lms.employee
    } : null);
    console.log('Injaz object:', data.injaz ? {
      name: data.injaz.name,
      dsr: data.injaz.dsr,
      status: data.injaz.status,
      employee: data.injaz.employee
    } : null);
    console.log('Wakala object:', data.wakala ? {
      name: data.wakala.name,
      dsr: data.wakala.dsr,
      status: data.wakala.status,
      employee: data.wakala.employee
    } : null);
  }
}

run().catch(console.error);
