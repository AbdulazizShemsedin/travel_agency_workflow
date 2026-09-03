const BASE_URL = 'http://localhost:3000';

async function testSelectUnlockedCandidate() {
  async function loginAs(usr, pwd) {
    const res = await fetch(`${BASE_URL}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usr, pwd })
    });
    const cookie = res.headers.getSetCookie 
      ? res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
      : res.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');
    const cRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
      headers: { 'Cookie': cookie }
    });
    const token = (await cRes.json())?.message?.csrf_token;
    return { cookie, csrf: token };
  }

  const sessionA = await loginAs('audit-agency-alpha@example.com', 'AuditAgency123!');
  const sessionB = await loginAs('audit-agency-beta@example.com', 'AuditAgencyBeta123!');

  console.log('1. Agency A selects UNLOCKED candidate APP-00009...');
  const selRes = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.select_candidate`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant_name: 'APP-00009' })
  });

  console.log('select_candidate status:', selRes.status);
  const selData = await selRes.json();
  console.log('select_candidate response:');
  console.log({
    name: selData.message?.name,
    applicant: selData.message?.applicant,
    contractor: selData.message?.contractor,
    owner: selData.message?.owner,
    status: selData.message?.status,
    destination_country: selData.message?.destination_country
  });

  const newPlacementName = selData.message?.name;

  if (newPlacementName) {
    console.log('\n2. Agency A creates a complaint on ITS OWN NEW PLACEMENT:', newPlacementName);
    const compOwn = await fetch(`${BASE_URL}/api/method/agency_tracking.complaint_api.create_complaint`, {
      method: 'POST',
      headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placement: newPlacementName,
        description: 'Test complaint on newly selected placement',
        worker_status_at_complaint: 'Runaway'
      })
    });
    console.log('Agency A create complaint on OWN placement status:', compOwn.status);
    const compOwnData = await compOwn.json();
    console.log('Agency A create complaint on OWN placement:', JSON.stringify(compOwnData, null, 2));

    console.log('\n3. Agency B attempts to create a complaint on Agency A newly created placement:', newPlacementName);
    const compOther = await fetch(`${BASE_URL}/api/method/agency_tracking.complaint_api.create_complaint`, {
      method: 'POST',
      headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placement: newPlacementName,
        description: 'Agency B cross-tenant attack on Agency A placement',
        worker_status_at_complaint: 'Runaway'
      })
    });
    console.log('Agency B cross-tenant complaint status:', compOther.status);
    const compOtherData = await compOther.json();
    console.log('Agency B cross-tenant complaint response:', JSON.stringify(compOtherData, null, 2));
  }
}

testSelectUnlockedCandidate().catch(console.error);
