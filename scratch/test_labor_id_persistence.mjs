import https from 'https';

const HOST = 'travel-agency-workflow-three.vercel.app';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...headers
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch (e) { parsed = d; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

async function main() {
  console.log('Logging in to live backend...');
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' }, [], {
    'Content-Type': 'application/json'
  });
  console.log('Login status:', loginRes.status);
  const cookies = loginRes.headers['set-cookie'] || [];

  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token || csrfRes.body?.message;
  console.log('Got CSRF token:', csrf ? 'YES' : 'NO');

  const headers = {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': csrf
  };

  // Test 1: Fetch an existing applicant to inspect fields
  console.log('Listing existing applicants...');
  const listRes = await req('/api/method/agency_tracking.applicant_api.list_applicants', 'POST', {
    limit_page_length: 5
  }, cookies, headers);

  const applicants = listRes.body?.message || listRes.body?.data || listRes.body || [];
  console.log('Found applicants count:', Array.isArray(applicants) ? applicants.length : 'not array');
  
  if (Array.isArray(applicants) && applicants.length > 0) {
    const testApp = applicants[0];
    const appName = testApp.name;
    console.log(`Testing with applicant: ${appName}`);

    // Read current applicant
    const getRes1 = await req('/api/method/agency_tracking.applicant_api.get_applicant', 'POST', {
      applicant_name: appName
    }, cookies, headers);
    const appDoc1 = getRes1.body?.message || getRes1.body;
    console.log(`Applicant ${appName} current labor_id:`, appDoc1?.labor_id);

    // Update with test labor_id
    const testLaborId = `LBR-${Date.now().toString().slice(-6)}`;
    console.log(`Updating ${appName} with labor_id: ${testLaborId} via update_applicant...`);
    const updateRes = await req('/api/method/agency_tracking.applicant_api.update_applicant', 'POST', {
      applicant_name: appName,
      labor_id: testLaborId
    }, cookies, headers);
    console.log('update_applicant response status:', updateRes.status);
    console.log('update_applicant returned labor_id:', (updateRes.body?.message || updateRes.body)?.labor_id);

    // Verify with get_applicant
    const getRes2 = await req('/api/method/agency_tracking.applicant_api.get_applicant', 'POST', {
      applicant_name: appName
    }, cookies, headers);
    const appDoc2 = getRes2.body?.message || getRes2.body;
    console.log(`Applicant ${appName} verified labor_id after get_applicant:`, appDoc2?.labor_id);

    if (appDoc2?.labor_id === testLaborId) {
      console.log('>>> SUCCESS: labor_id is successfully persisted and retrieved via update_applicant! <<<');
    } else {
      console.log('>>> FAILED: labor_id did not match or was not persisted. <<<');
    }

    // Test 2: create_applicant with labor_id
    console.log('\n--- Testing create_applicant with labor_id ---');
    const newLaborId = `LBR-NEW-${Date.now().toString().slice(-5)}`;
    const createRes = await req('/api/method/agency_tracking.applicant_api.create_applicant', 'POST', {
      full_name: `Test Labor Candidate ${Date.now().toString().slice(-4)}`,
      gender: 'Female',
      entry_track: 'Standard',
      nationality: 'Ethiopia',
      labor_id: newLaborId
    }, cookies, headers);

    console.log('create_applicant status:', createRes.status);
    const createdDoc = createRes.body?.message || createRes.body;
    const createdName = createdDoc?.name;
    console.log('Created applicant name:', createdName, 'returned labor_id:', createdDoc?.labor_id);

    if (createdName) {
      const getNewRes = await req('/api/method/agency_tracking.applicant_api.get_applicant', 'POST', {
        applicant_name: createdName
      }, cookies, headers);
      const newDoc = getNewRes.body?.message || getNewRes.body;
      console.log('Verified newly created applicant labor_id:', newDoc?.labor_id);
      if (newDoc?.labor_id === newLaborId) {
        console.log('>>> SUCCESS: labor_id is successfully persisted during create_applicant! <<<');
      } else {
        console.log('>>> FAILED: labor_id was not persisted on new applicant. <<<');
      }
    }
  }
}

main().catch(console.error);
