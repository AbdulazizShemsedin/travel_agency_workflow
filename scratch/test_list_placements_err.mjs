const BASE_URL = 'http://localhost:3000';

async function testListPlacementsError() {
  const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'audit-agency-alpha@example.com', pwd: 'AuditAgency123!' })
  });
  const cookie = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : loginRes.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  const csrfRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
    headers: { 'Cookie': cookie }
  });
  const csrf = (await csrfRes.json())?.message?.csrf_token;

  const res = await fetch(`${BASE_URL}/api/method/agency_tracking.placement_api.list_placements`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Error data:', JSON.stringify(data, null, 2));
}

testListPlacementsError().catch(console.error);
