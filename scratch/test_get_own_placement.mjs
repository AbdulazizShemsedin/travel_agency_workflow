const BASE_URL = 'http://localhost:3000';

async function testGetOwnPlacement() {
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

  const res = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Placement&name=PLM-00006`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  console.log('Status of frappe.client.get on own placement:', res.status);
  const data = await res.json();
  console.log('Body:', JSON.stringify(data, null, 2));
}

testGetOwnPlacement().catch(console.error);
