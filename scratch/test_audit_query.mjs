const BASE_URL = 'https://agencytracking-production.up.railway.app';

async function testAdmin() {
  console.log('Testing Admin login...');
  const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });

  console.log('Login status:', loginRes.status);
  const setCookies = loginRes.headers.get('set-cookie');
  console.log('Set-Cookie:', setCookies ? 'present' : 'none');

  const cookie = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (setCookies || '').split(',').map(c => c.split(';')[0].trim()).join('; ');

  // Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
    headers: { 'Cookie': cookie }
  });
  const csrfData = await csrfRes.json();
  const csrf = csrfData?.message?.csrf_token;
  console.log('CSRF:', csrf ? 'acquired' : 'none');

  // Get current user
  const userRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_current_user`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const userData = await userRes.json();
  console.log('Current user:', JSON.stringify(userData, null, 2));

  // List existing contractors
  const contRes = await fetch(`${BASE_URL}/api/method/agency_tracking.contractor_api.list_contractors`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const contData = await contRes.json();
  console.log('Existing contractors status:', contRes.status);
  console.log('Existing contractors:', JSON.stringify(contData, null, 2));
}

testAdmin().catch(console.error);
