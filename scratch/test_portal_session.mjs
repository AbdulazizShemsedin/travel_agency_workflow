const BASE_URL = 'http://localhost:3000';

async function testPortalEndpoints() {
  // Login as audit-agency-alpha@example.com
  const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usr: 'audit-agency-alpha@example.com',
      pwd: 'AuditAgency123!'
    })
  });

  const cookie = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : loginRes.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  const csrfRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
    headers: { 'Cookie': cookie }
  });
  const csrf = (await csrfRes.json())?.message?.csrf_token;
  console.log('CSRF token:', csrf ? 'acquired' : 'none');

  console.log('\n--- Testing portal_api.list_portal_candidates (no parameters) ---');
  const listCandRes = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_portal_candidates`, {
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('list_portal_candidates status:', listCandRes.status);
  const listCandData = await listCandRes.json();
  console.log('list_portal_candidates response:', JSON.stringify(listCandData, null, 2));

  console.log('\n--- Testing portal_api.list_my_wakala_requests (no parameters) ---');
  const wakalaRes = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_my_wakala_requests`, {
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('list_my_wakala_requests status:', wakalaRes.status);
  const wakalaData = await wakalaRes.json();
  console.log('list_my_wakala_requests response:', JSON.stringify(wakalaData, null, 2));

  console.log('\n--- Testing chat_api.create_agency_thread (no parameters) ---');
  const threadRes = await fetch(`${BASE_URL}/api/method/agency_tracking.chat_api.create_agency_thread`, {
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('create_agency_thread status:', threadRes.status);
  const threadData = await threadRes.json();
  console.log('create_agency_thread response:', JSON.stringify(threadData, null, 2));
}

testPortalEndpoints().catch(console.error);
