const BASE_URL = 'https://agencytracking-production.up.railway.app';

async function testAgencyLogin() {
  console.log('1. Admin logs in to set password for test agency user...');
  const adminLogin = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });
  const adminCookie = adminLogin.headers.getSetCookie 
    ? adminLogin.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : adminLogin.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  const csrfRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
    headers: { 'Cookie': adminCookie }
  });
  const csrf = (await csrfRes.json())?.message?.csrf_token;

  // Set password for audit-agency-alpha@example.com
  const setPassRes = await fetch(`${BASE_URL}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers: {
      'Cookie': adminCookie,
      'X-Frappe-CSRF-Token': csrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      doctype: 'User',
      name: 'audit-agency-alpha@example.com',
      fieldname: 'new_password',
      value: 'AuditAgency123!'
    })
  });
  console.log('Set password status:', setPassRes.status);

  // Now test LOGIN as Foreign Agency user
  console.log('\n2. Testing POST /api/method/login as Foreign Agency user...');
  const agencyLoginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usr: 'audit-agency-alpha@example.com',
      pwd: 'AuditAgency123!'
    })
  });

  console.log('Agency login HTTP status:', agencyLoginRes.status);
  const agencyLoginBody = await agencyLoginRes.json();
  console.log('Agency login body:', agencyLoginBody);
  const agencySetCookie = agencyLoginRes.headers.get('set-cookie');
  console.log('Agency session cookie received?', !!agencySetCookie);

  const agencyCookie = agencyLoginRes.headers.getSetCookie 
    ? agencyLoginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : (agencySetCookie || '').split(',').map(c => c.split(';')[0].trim()).join('; ');

  // Now Section C: Call agency_tracking.auth_api.get_current_user
  console.log('\n3. Testing agency_tracking.auth_api.get_current_user as Foreign Agency user...');
  const currentUserRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_current_user`, {
    headers: { 'Cookie': agencyCookie }
  });
  console.log('get_current_user status:', currentUserRes.status);
  const currentUserBody = await currentUserRes.json();
  console.log('get_current_user exact response shape:');
  console.log(JSON.stringify(currentUserBody, null, 2));

  return { agencyCookie, currentUserBody };
}

testAgencyLogin().catch(console.error);
