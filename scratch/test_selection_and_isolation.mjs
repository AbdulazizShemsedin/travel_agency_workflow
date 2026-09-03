const BASE_URL = 'http://localhost:3000';

async function testSelectionAndIsolation() {
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

  console.log('=== TEST A: CANDIDATE DETAIL ACCESS ===');
  // Can Agency A call get_applicant for APP-00011?
  const getAppResA = await fetch(`${BASE_URL}/api/method/agency_tracking.applicant_api.get_applicant`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant_name: 'APP-00011' })
  });
  console.log('Agency A get_applicant status:', getAppResA.status);
  const getAppAData = await getAppResA.json();
  console.log('Agency A get_applicant body:', JSON.stringify(getAppAData).substring(0, 200));

  // Can Agency A call frappe.client.get for Applicant APP-00011?
  const rawAppResA = await fetch(`${BASE_URL}/api/method/frappe.client.get?doctype=Applicant&name=APP-00011`, {
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf }
  });
  console.log('Agency A frappe.client.get(Applicant) status:', rawAppResA.status);
  const rawAppAData = await rawAppResA.json();
  console.log('Agency A frappe.client.get(Applicant) body:', JSON.stringify(rawAppAData).substring(0, 200));

  console.log('\n=== TEST B: CANDIDATE SELECTION CROSS-COUNTRY (Agency B = Kuwait selecting Saudi candidate APP-00011) ===');
  const selCrossRes = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.select_candidate`, {
    method: 'POST',
    headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant_name: 'APP-00011' })
  });
  console.log('Agency B (Kuwait) select Saudi candidate status:', selCrossRes.status);
  const selCrossData = await selCrossRes.json();
  console.log('Agency B select Saudi candidate response:', JSON.stringify(selCrossData, null, 2));

  console.log('\n=== TEST C: ATOMIC SELECTION BY OWNING COUNTRY (Agency A selecting APP-00011) ===');
  // Let's test Agency A selecting candidate APP-00011
  const selResA = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.select_candidate`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant_name: 'APP-00011' })
  });
  console.log('Agency A select_candidate status:', selResA.status);
  const selDataA = await selResA.json();
  console.log('Agency A select_candidate response:', JSON.stringify(selDataA, null, 2));
  const createdPlacementName = selDataA.message?.name;

  if (createdPlacementName) {
    console.log('\n=== TEST D: DOUBLE SELECTION PREVENTION (Agency A trying to select same candidate again) ===');
    const doubleSel = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.select_candidate`, {
      method: 'POST',
      headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicant_name: 'APP-00011' })
    });
    console.log('Double selection status:', doubleSel.status);
    const doubleSelData = await doubleSel.json();
    console.log('Double selection response:', JSON.stringify(doubleSelData, null, 2));

    console.log('\n=== TEST E: POOL EXCLUSION AFTER SELECTION ===');
    const listAfterSel = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_portal_candidates`, {
      method: 'POST',
      headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const poolAfter = (await listAfterSel.json()).message || [];
    const isAppInPool = poolAfter.some(c => c.name === 'APP-00011');
    console.log('Is APP-00011 still in portal candidate pool?', isAppInPool);

    console.log('\n=== TEST F: COMPLAINT CREATION ON OWN PLACEMENT VS OTHER PLACEMENT ===');
    // Agency A creating complaint on its own placement
    const compOwn = await fetch(`${BASE_URL}/api/method/agency_tracking.complaint_api.create_complaint`, {
      method: 'POST',
      headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placement: createdPlacementName,
        description: 'Audit test complaint by owning agency',
        worker_status_at_complaint: 'Runaway'
      })
    });
    console.log('Agency A create complaint on OWN placement status:', compOwn.status);
    const compOwnData = await compOwn.json();
    console.log('Agency A create complaint on OWN placement:', JSON.stringify(compOwnData, null, 2));

    // Agency B trying to create complaint on Agency A's placement!
    console.log('Agency B trying to create complaint on Agency A placement:', createdPlacementName);
    const compOther = await fetch(`${BASE_URL}/api/method/agency_tracking.complaint_api.create_complaint`, {
      method: 'POST',
      headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placement: createdPlacementName,
        description: 'Agency B cross-tenant attack complaint',
        worker_status_at_complaint: 'Runaway'
      })
    });
    console.log('Agency B create complaint on Agency A placement status:', compOther.status);
    const compOtherData = await compOther.json();
    console.log('Agency B create complaint on Agency A placement:', JSON.stringify(compOtherData, null, 2));
  }
}

testSelectionAndIsolation().catch(console.error);
