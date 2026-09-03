const BASE_URL = 'https://agencytracking-production.up.railway.app';

async function testCreateContractor() {
  console.log('1. Logging in as Administrator...');
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

  console.log('2. Calling agency_tracking.contractor_api.create_contractor...');
  const createPayload = {
    contractor_name: 'Audit Test Agency Alpha',
    country: 'Saudi Arabia',
    user_email: 'audit-agency-alpha@example.com',
    user_first_name: 'Audit Alpha'
  };

  const createRes = await fetch(`${BASE_URL}/api/method/agency_tracking.contractor_api.create_contractor`, {
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'X-Frappe-CSRF-Token': csrf,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });

  console.log('create_contractor status:', createRes.status);
  const createData = await createRes.json();
  console.log('create_contractor response:', JSON.stringify(createData, null, 2));

  // Inspect the created Contractor record
  const contRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Contractor&name=Audit Test Agency Alpha`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const contDoc = await contRes.json();
  console.log('Created Contractor Doc:', JSON.stringify(contDoc.message, null, 2));

  // Inspect the created User record
  const userRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=User&name=audit-agency-alpha@example.com`, {
    headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const userDoc = await userRes.json();
  console.log('Created User Doc:');
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
    console.log('User Doc response:', userDoc);
  }
}

testCreateContractor().catch(console.error);
