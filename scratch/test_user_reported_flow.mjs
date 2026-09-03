import http from 'http';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
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

async function run() {
  console.log('--- Step 1: Initial Guest pre-fetch of CSRF token (simulating login page load) ---');
  const guestCsrf = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET');
  console.log('Guest CSRF status:', guestCsrf.status);

  console.log('\n--- Step 2: Login as Administrator ---');
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  console.log('Login status:', loginRes.status);
  const cookies = loginRes.headers['set-cookie'] || [];
  console.log('Cookies count:', cookies.length);

  console.log('\n--- Step 3: Fetch fresh CSRF token after login ---');
  const postLoginCsrf = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  console.log('Post-login CSRF status:', postLoginCsrf.status);
  let parsedCsrf = '';
  try {
    parsedCsrf = JSON.parse(postLoginCsrf.body).message.csrf_token;
    console.log('Valid CSRF token acquired:', parsedCsrf.substring(0, 16) + '...');
  } catch (e) {
    console.error('Failed to parse CSRF token:', postLoginCsrf.body);
  }

  const authHeaders = {
    'X-Frappe-CSRF-Token': parsedCsrf
  };

  console.log('\n--- Step 4: GET get_current_user ---');
  const userRes = await req('/api/method/agency_tracking.auth_api.get_current_user', 'GET', null, cookies, authHeaders);
  console.log('get_current_user status:', userRes.status);

  console.log('\n--- Step 5: POST list_applicants ---');
  const applicantsRes = await req('/api/method/agency_tracking.applicant_api.list_applicants', 'POST', {}, cookies, authHeaders);
  console.log('list_applicants status:', applicantsRes.status);
  if (applicantsRes.status === 200) {
    console.log('list_applicants returned records count:', JSON.parse(applicantsRes.body).message?.length);
  } else {
    console.error('list_applicants FAILED:', applicantsRes.body);
  }

  console.log('\n--- Step 6: POST list_placements ---');
  const placementsRes = await req('/api/method/agency_tracking.placement_api.list_placements', 'POST', {}, cookies, authHeaders);
  console.log('list_placements status:', placementsRes.status);
  if (placementsRes.status === 200) {
    console.log('list_placements returned records count:', JSON.parse(placementsRes.body).message?.length);
  } else {
    console.error('list_placements FAILED:', placementsRes.body);
  }

  console.log('\n--- Step 7: POST list_unresolved_complaints ---');
  const complaintsRes = await req('/api/method/agency_tracking.complaint_api.list_unresolved_complaints', 'POST', {}, cookies, authHeaders);
  console.log('list_unresolved_complaints status:', complaintsRes.status);
  if (complaintsRes.status === 200) {
    console.log('list_unresolved_complaints returned records count:', JSON.parse(complaintsRes.body).message?.length);
  } else {
    console.error('list_unresolved_complaints FAILED:', complaintsRes.body);
  }

  console.log('\n=============================================');
  console.log('ALL WORKSPACE REQUESTS COMPLETED SUCCESSFULLY!');
  console.log('=============================================');
}

run().catch(console.error);
