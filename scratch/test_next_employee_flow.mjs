async function testClientApi() {
  // Login as admin
  const loginRes = await fetch('http://localhost:3000/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status);

  // Get CSRF
  const csrfRes = await fetch('http://localhost:3000/api/method/agency_tracking.auth_api.get_csrf_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: '{}'
  });
  const csrfData = await csrfRes.json();
  const csrf = csrfData.message;
  console.log('CSRF token:', csrf ? 'got token' : 'none');

  const testEmail = `test.employee.${Date.now()}@agency.et`;
  console.log('Creating employee:', testEmail);

  // Insert user
  const insRes = await fetch('http://localhost:3000/api/method/frappe.client.insert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf
    },
    body: JSON.stringify({
      doc: {
        doctype: 'User',
        email: testEmail,
        first_name: 'Abebe',
        last_name: 'Kebede',
        send_welcome_email: 0,
        new_password: 'StaffPassword123!',
        phone: '+251911223344',
        mobile_no: '+251911223344',
        roles: [
          { doctype: 'Has Role', role: 'Registrar' },
          { doctype: 'Has Role', role: 'Saudi LMIS' }
        ]
      }
    })
  });
  console.log('Insert status:', insRes.status);
  const insJson = await insRes.json();
  console.log('Created user:', insJson.message?.email, insJson.message?.full_name);

  // List users
  const listRes = await fetch('http://localhost:3000/api/method/frappe.client.get_list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf
    },
    body: JSON.stringify({
      doctype: 'User',
      fields: ['name', 'email', 'full_name', 'first_name', 'last_name', 'enabled', 'creation', 'phone', 'mobile_no'],
      filters: [['User', 'user_type', '=', 'System User']],
      limit_page_length: 50
    })
  });
  const listData = await listRes.json();
  const found = listData.message?.find(u => u.email === testEmail);
  console.log('Found created user in list:', Boolean(found));

  // Get single user with roles
  const getRes = await fetch('http://localhost:3000/api/method/frappe.client.get', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf
    },
    body: JSON.stringify({
      doctype: 'User',
      name: testEmail
    })
  });
  const getData = await getRes.json();
  console.log('User roles in doc:', getData.message?.roles?.map(r => r.role));

  // Clean up
  const delRes = await fetch('http://localhost:3000/api/method/frappe.client.delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf
    },
    body: JSON.stringify({
      doctype: 'User',
      name: testEmail
    })
  });
  console.log('Cleanup delete status:', delRes.status);
}

testClientApi().catch(console.error);
