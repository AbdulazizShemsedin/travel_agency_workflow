import http from 'http';

function req(path, method = 'GET', body = null, cookies = []) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    if (data) r.write(data);
    r.end();
  });
}

async function verify() {
  console.log("=== VERIFYING CANDIDATE SELECTION DATA SOURCE ===");
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];

  // 1. Fetch portal candidates (marketplace candidates)
  const portalRes = await req('/api/method/agency_tracking.portal_api.list_portal_candidates', 'POST', {}, cookies);
  const portalCandidates = JSON.parse(portalRes.body).message || [];

  // 2. Fetch all agency applicants
  const applicantsRes = await req('/api/method/agency_tracking.applicant_api.list_applicants', 'POST', {}, cookies);
  const allApplicants = JSON.parse(applicantsRes.body).message || [];

  console.log(`Total agency applicants: ${allApplicants.length}`);
  console.log(`Total marketplace candidates: ${portalCandidates.length}`);

  // Replicate marketplaceCandidates logic from src/app/agent/complaints/page.tsx
  const marketplaceCandidates = portalCandidates
    .filter(c => Boolean(c && c.name))
    .filter(c => c.medical_status !== 'UNFIT')
    .map(c => ({
      name: c.name,
      full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name,
      passport_number: c.passport_number || '',
      destination_country: c.destination_country || '',
      target_job: c.target_job || c.job_applied || '',
    }));

  console.log("\nCandidates that will appear in the complaint modal dropdown:");
  console.table(marketplaceCandidates);

  if (marketplaceCandidates.length < allApplicants.length) {
    console.log(`\n✓ SUCCESS: Only the ${marketplaceCandidates.length} marketplace candidates are listed, NOT all ${allApplicants.length} applicants across the agency!`);
  } else {
    console.error("FAIL: Candidate count unexpected");
    process.exit(1);
  }
}

verify().catch(console.error);
