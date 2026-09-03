const BASE_URL = 'http://localhost:3000';

async function testUnlinkedUser() {
  console.log('1. Admin logs in to create an unlinked Foreign Agency user...');
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

  // Create user directly via frappe.client.insert (NO contractor linked)
  const unlinkedEmail = 'audit-unlinked-agency@example.com';
  // Check if user already exists
  try {
    await fetch(`${BASE_URL}/api/method/frappe.client.insert`, {
      method: 'POST',
      headers: {
        'Cookie': adminCookie,
        'X-Frappe-CSRF-Token': csrf,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        doc: {
          doctype: 'User',
          email: unlinkedEmail,
          first_name: 'Unlinked',
          last_name: 'Agency',
          user_type: 'Website User',
          send_welcome_email: 0,
          new_password: 'UnlinkedPass123!',
          roles: [{ doctype: 'Has Role', role: 'Foreign Agency' }]
        }
      })
    });
  } catch (e) {
    console.log('User might already exist:', e);
  }

  // Ensure password is set
  await fetch(`${BASE_URL}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers: {
      'Cookie': adminCookie,
      'X-Frappe-CSRF-Token': csrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      doctype: 'User',
      name: unlinkedEmail,
      fieldname: 'new_password',
      value: 'UnlinkedPass123!'
    })
  });

  // Login as unlinked user
  console.log('2. Logging in as unlinked Foreign Agency user...');
  const unlinkedLogin = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: unlinkedEmail, pwd: 'UnlinkedPass123!' })
  });
  console.log('Unlinked login status:', unlinkedLogin.status);
  const unlinkedCookie = unlinkedLogin.headers.getSetCookie 
    ? unlinkedLogin.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : unlinkedLogin.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  const unlinkedCsrfRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
    headers: { 'Cookie': unlinkedCookie }
  });
  const unlinkedCsrf = (await unlinkedCsrfRes.json())?.message?.csrf_token;

  // Test calling list_portal_candidates
  console.log('3. Calling list_portal_candidates as unlinked user...');
  const candRes = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_portal_candidates`, {
    method: 'POST',
    headers: {
      'Cookie': unlinkedCookie,
      'X-Frappe-CSRF-Token': unlinkedCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('Unlinked list_portal_candidates status:', candRes.status);
  const candBody = await candRes.json();
  console.log('Unlinked list_portal_candidates body:', JSON.stringify(candBody, null, 2));

  // Test calling create_agency_thread
  console.log('4. Calling create_agency_thread as unlinked user...');
  const chatRes = await fetch(`${BASE_URL}/api/method/agency_tracking.chat_api.create_agency_thread`, {
    method: 'POST',
    headers: {
      'Cookie': unlinkedCookie,
      'X-Frappe-CSRF-Token': unlinkedCsrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('Unlinked create_agency_thread status:', chatRes.status);
  const chatBody = await chatRes.json();
  console.log('Unlinked create_agency_thread body:', JSON.stringify(chatBody, null, 2));
}

testUnlinkedUser().catch(console.error);
