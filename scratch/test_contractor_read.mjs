const BASE_URL = 'http://localhost:3000';

async function testContractorAccess() {
  // Login as audit-agency-alpha@example.com
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

  console.log('1. Testing contractor_api.list_contractors as Foreign Agency...');
  const listContRes = await fetch(`${BASE_URL}/api/method/agency_tracking.contractor_api.list_contractors`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('list_contractors status:', listContRes.status);
  const listContData = await listContRes.json();
  console.log('list_contractors response:', JSON.stringify(listContData, null, 2));

  console.log('\n2. Testing frappe.client.get_list for Contractor as Foreign Agency...');
  const clientListRes = await fetch(`${BASE_URL}/api/method/frappe.client.get_list`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctype: 'Contractor' })
  });
  console.log('frappe.client.get_list status:', clientListRes.status);
  const clientListData = await clientListRes.json();
  console.log('frappe.client.get_list response:', JSON.stringify(clientListData, null, 2));

  console.log('\n3. Testing frappe.client.get for own Contractor (Audit Test Agency Alpha)...');
  const clientGetOwnRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Contractor&name=Audit Test Agency Alpha`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  console.log('frappe.client.get own status:', clientGetOwnRes.status);
  const clientGetOwnData = await clientGetOwnRes.json();
  console.log('frappe.client.get own response:', JSON.stringify(clientGetOwnData, null, 2));

  console.log('\n4. Testing frappe.client.get for OTHER Contractor (QA Portal Test Agency)...');
  const clientGetOtherRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Contractor&name=QA Portal Test Agency`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  console.log('frappe.client.get other status:', clientGetOtherRes.status);
  const clientGetOtherData = await clientGetOtherRes.json();
  console.log('frappe.client.get other response:', JSON.stringify(clientGetOtherData, null, 2));
}

testContractorAccess().catch(console.error);
