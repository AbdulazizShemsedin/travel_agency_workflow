const BASE_URL = 'http://localhost:3000';

async function inspectApplicantsAndPlacements() {
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

  // Let's inspect APP-00011
  const appRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Applicant&name=APP-00011`, {
    headers: { 'Cookie': adminCookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const appData = await appRes.json();
  console.log('APP-00011:');
  console.log({
    name: appData.message?.name,
    status: appData.message?.status,
    active_placement: appData.message?.active_placement,
    destination_country: appData.message?.destination_country,
    entry_track: appData.message?.entry_track
  });

  // Let's inspect PLM-00005
  const plRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Placement&name=PLM-00005`, {
    headers: { 'Cookie': adminCookie, 'X-Frappe-CSRF-Token': csrf }
  });
  const plData = await plRes.json();
  console.log('\nPLM-00005:');
  console.log({
    name: plData.message?.name,
    applicant: plData.message?.applicant,
    contractor: plData.message?.contractor,
    status: plData.message?.status,
    owner: plData.message?.owner
  });

  // Let's inspect all Placements in the database!
  const allPlRes = await fetch(`${BASE_URL}/api/method/agency_tracking.placement_api.list_placements`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const allPlData = await allPlRes.json();
  console.log('\nAll Placements in database:');
  console.log(allPlData.message?.map(p => ({
    name: p.name,
    applicant: p.applicant,
    contractor: p.contractor,
    status: p.status,
    destination_country: p.destination_country
  })));

  // Let's inspect all candidates currently in list_portal_candidates for Saudi Arabia
  // and see which ones already have a placement!
  const appList = ['APP-00011', 'APP-00012', 'APP-00009', 'APP-00003', 'APP-00001'];
  for (const id of appList) {
    const aRes = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Applicant&name=${id}`, {
      headers: { 'Cookie': adminCookie, 'X-Frappe-CSRF-Token': csrf }
    });
    const a = (await aRes.json()).message;
    console.log(`Applicant ${id}: status=${a?.status}, active_placement=${a?.active_placement}, destination_country=${a?.destination_country}`);
  }
}

inspectApplicantsAndPlacements().catch(console.error);
