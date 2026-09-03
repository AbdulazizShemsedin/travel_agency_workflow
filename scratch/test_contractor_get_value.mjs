const BASE_URL = 'http://localhost:3000';

async function testGetContractorValue() {
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

  // Test frappe.client.get_value for Contractor
  const valRes = await fetch(`${BASE_URL}/api/method/frappe.client.get_value`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctype: 'Contractor',
      filters: { user: 'audit-agency-alpha@example.com' },
      fieldname: ['name', 'country', 'contractor_name']
    })
  });
  console.log('get_value status:', valRes.status);
  const valData = await valRes.json();
  console.log('get_value response:', JSON.stringify(valData, null, 2));
}

testGetContractorValue().catch(console.error);
