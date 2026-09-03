const BASE_URL = 'https://agencytracking-production.up.railway.app';

async function inspectUser() {
  const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });

  const cookie = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : loginRes.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  const csrfRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
    headers: { 'Cookie': cookie }
  });
  const csrf = (await csrfRes.json())?.message?.csrf_token;

  // Let's inspect the User for qa-test-portal-agency@example.com
  const userDocRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=User&name=qa-test-portal-agency@example.com`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const userDoc = await userDocRes.json();
  console.log('qa-test-portal-agency@example.com User Doc:');
  if (userDoc.message) {
    console.log({
      name: userDoc.message.name,
      email: userDoc.message.email,
      first_name: userDoc.message.first_name,
      user_type: userDoc.message.user_type,
      enabled: userDoc.message.enabled,
      roles: userDoc.message.roles?.map(r => r.role)
    });
  } else {
    console.log('Error/No message:', userDoc);
  }

  // Also let's inspect agency_1788421123702@agency.com
  const user2DocRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=User&name=agency_1788421123702@agency.com`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const user2Doc = await user2DocRes.json();
  console.log('agency_1788421123702@agency.com User Doc:');
  if (user2Doc.message) {
    console.log({
      name: user2Doc.message.name,
      email: user2Doc.message.email,
      first_name: user2Doc.message.first_name,
      user_type: user2Doc.message.user_type,
      enabled: user2Doc.message.enabled,
      roles: user2Doc.message.roles?.map(r => r.role)
    });
  } else {
    console.log('Error/No message:', user2Doc);
  }

  // Also let's inspect Contractor doc for 'QA Portal Test Agency'
  const contDocRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Contractor&name=QA Portal Test Agency`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const contDoc = await contDocRes.json();
  console.log('QA Portal Test Agency Contractor Doc:');
  console.log(JSON.stringify(contDoc.message, null, 2));
}

inspectUser().catch(console.error);
