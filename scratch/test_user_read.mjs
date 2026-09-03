const BASE_URL = 'http://localhost:3000';

async function testUserRead() {
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

  const userListRes = await fetch(`${BASE_URL}/api/method/frappe.client.get_list`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctype: 'User',
      fields: ['name', 'email', 'full_name', 'user_type', 'phone', 'mobile_no']
    })
  });
  console.log('User list status:', userListRes.status);
  const userList = await userListRes.json();
  console.log('User list message count:', userList.message?.length);
  console.log('Sample user:', userList.message?.[0]);

  // Try to modify another user
  const setValRes = await fetch(`${BASE_URL}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctype: 'User',
      name: 'Administrator',
      fieldname: 'first_name',
      value: 'Hacked'
    })
  });
  console.log('Modify Administrator status:', setValRes.status);
  const setValData = await setValRes.json();
  console.log('Modify Administrator body:', JSON.stringify(setValData).substring(0, 200));
}

testUserRead().catch(console.error);
