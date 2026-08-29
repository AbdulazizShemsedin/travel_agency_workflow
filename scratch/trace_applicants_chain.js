const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr = 'Administrator', pwd = '1234') {
  return new Promise(res => {
    const data = JSON.stringify({ usr, pwd });
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

function req(path, cookies) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; ')
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

async function run() {
  const cookies = await login();
  console.log('Logged in as Administrator');

  // List all applicants
  const apps = await req('/api/resource/Applicant?fields=["name","full_name","destination_country","applicant_state"]&limit_page_length=50', cookies);
  console.log('Applicants:', apps.body?.data);

  for (const app of (apps.body?.data || [])) {
    console.log(`\n=== Tracing Applicant: ${app.name} (${app.full_name}, ${app.destination_country}, ${app.applicant_state}) ===`);
    
    // Dossier
    const dos = await req(`/api/resource/Applicant Dossier?filters=[["applicant","=","${app.name}"]]&fields=["*"]`, cookies);
    console.log('Dossier count:', dos.body?.data?.length);
    const dossier = dos.body?.data?.[0];
    console.log('Dossier name:', dossier?.name);

    if (dossier?.name) {
      // DSR
      const dsrs = await req(`/api/resource/DSR?filters=[["applicant_dossier","=","${dossier.name}"]]&fields=["*"]`, cookies);
      console.log('DSR count:', dsrs.body?.data?.length);
      const dsr = dsrs.body?.data?.[0];
      console.log('DSR name:', dsr?.name);

      if (dsr?.name) {
        // LMS Clearance
        const lms = await req(`/api/resource/LMS Clearance?filters=[["dsr","=","${dsr.name}"]]&fields=["*"]`, cookies);
        console.log('LMS Clearance count for DSR:', lms.body?.data?.length);
        console.log('LMS Clearance records:', lms.body?.data);

        // Injaz Clearance
        const inj = await req(`/api/resource/Injaz Clearance?filters=[["dsr","=","${dsr.name}"]]&fields=["*"]`, cookies);
        console.log('Injaz count:', inj.body?.data?.length, inj.body?.data?.map(i => i.name));

        // Wakala Clearance
        const wak = await req(`/api/resource/Wakala Clearance?filters=[["dsr","=","${dsr.name}"]]&fields=["*"]`, cookies);
        console.log('Wakala count:', wak.body?.data?.length, wak.body?.data?.map(w => w.name));
      }
    }
  }

  // Also list all LMS Clearance records in the entire database
  const allLms = await req('/api/resource/LMS Clearance?fields=["name","dsr","applicant_dossier","status","employee"]&limit_page_length=50', cookies);
  console.log('\n=== ALL LMS Clearance records in DB ===');
  console.log(allLms.body?.data);
}

run().catch(console.error);
