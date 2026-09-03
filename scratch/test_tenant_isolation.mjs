const BASE_URL = 'http://localhost:3000';

async function setup() {
  console.log('=== STEP 0: SETUP TWO CONTRACTORS (Agency A = Saudi Arabia, Agency B = Kuwait) ===');
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

  // Create Agency Beta if not exists
  const createBetaRes = await fetch(`${BASE_URL}/api/method/agency_tracking.contractor_api.create_contractor`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractor_name: 'Audit Test Agency Beta',
      country: 'Kuwait',
      user_email: 'audit-agency-beta@example.com',
      user_first_name: 'Audit Beta'
    })
  });
  console.log('Create Agency Beta status:', createBetaRes.status);

  // Set password for Agency Beta
  await fetch(`${BASE_URL}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctype: 'User',
      name: 'audit-agency-beta@example.com',
      fieldname: 'new_password',
      value: 'AuditAgencyBeta123!'
    })
  });
  console.log('Password set for Agency Beta.');

  // Helper to login and get cookie + csrf
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

  console.log('\n=== TEST 1: CANDIDATE LISTING ISOLATION ===');
  // Agency A (Saudi Arabia) lists portal candidates
  const listA = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_portal_candidates`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const candidatesA = (await listA.json()).message || [];
  console.log(`Agency A (Saudi Arabia) sees ${candidatesA.length} candidates.`);

  // Agency B (Kuwait) lists portal candidates
  const listB = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_portal_candidates`, {
    method: 'POST',
    headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const candidatesB = (await listB.json()).message || [];
  console.log(`Agency B (Kuwait) sees ${candidatesB.length} candidates.`);

  // Check candidate overlap
  const idsA = new Set(candidatesA.map(c => c.name));
  const idsB = new Set(candidatesB.map(c => c.name));
  const overlap = [...idsA].filter(id => idsB.has(id));
  console.log('Candidate overlap between Agency A and Agency B:', overlap);

  console.log('\n=== TEST 2: PLACEMENT ACCESS / ISOLATION ===');
  // Try listing placements as Agency A via placement_api.list_placements
  const plListA = await fetch(`${BASE_URL}/api/method/agency_tracking.placement_api.list_placements`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('Agency A list_placements status:', plListA.status);
  const plListAData = await plListA.json();
  console.log('Agency A list_placements body:', JSON.stringify(plListAData).substring(0, 200));

  // Try listing placements via frappe.client.get_list
  const rawPlListA = await fetch(`${BASE_URL}/api/method/frappe.client.get_list`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctype: 'Placement' })
  });
  console.log('Agency A frappe.client.get_list(Placement) status:', rawPlListA.status);
  const rawPlAData = await rawPlListA.json();
  console.log('Agency A frappe.client.get_list(Placement) body:', JSON.stringify(rawPlAData).substring(0, 200));

  console.log('\n=== TEST 3: WAKALA REQUESTS ISOLATION ===');
  const wakalaA = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_my_wakala_requests`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('Agency A list_my_wakala_requests status:', wakalaA.status);
  const wakalaAData = await wakalaA.json();
  console.log('Agency A wakala count:', wakalaAData.message?.length ?? 0);

  const wakalaB = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_my_wakala_requests`, {
    method: 'POST',
    headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('Agency B list_my_wakala_requests status:', wakalaB.status);
  const wakalaBData = await wakalaB.json();
  console.log('Agency B wakala count:', wakalaBData.message?.length ?? 0);

  console.log('\n=== TEST 4: COMPLAINTS DESK ISOLATION ===');
  // Can Agency A list unresolved complaints?
  const compListA = await fetch(`${BASE_URL}/api/method/agency_tracking.complaint_api.list_unresolved_complaints`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('Agency A list_unresolved_complaints status:', compListA.status);
  const compListAData = await compListA.json();
  console.log('Agency A list_unresolved_complaints body:', JSON.stringify(compListAData).substring(0, 200));

  // Can Agency A read Complaint DocType via frappe.client.get_list?
  const rawCompListA = await fetch(`${BASE_URL}/api/method/frappe.client.get_list`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctype: 'Complaint' })
  });
  console.log('Agency A frappe.client.get_list(Complaint) status:', rawCompListA.status);
  const rawCompAData = await rawCompListA.json();
  console.log('Agency A frappe.client.get_list(Complaint) body:', JSON.stringify(rawCompAData).substring(0, 200));

  console.log('\n=== TEST 5: CHAT THREAD ISOLATION ===');
  // Agency A creates agency thread
  const threadA = await fetch(`${BASE_URL}/api/method/agency_tracking.chat_api.create_agency_thread`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const threadAData = await threadA.json();
  const threadAName = threadAData.message?.name;
  console.log('Agency A thread:', threadAName, 'contractor:', threadAData.message?.contractor);

  // Agency B creates agency thread
  const threadB = await fetch(`${BASE_URL}/api/method/agency_tracking.chat_api.create_agency_thread`, {
    method: 'POST',
    headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const threadBData = await threadB.json();
  const threadBName = threadBData.message?.name;
  console.log('Agency B thread:', threadBName, 'contractor:', threadBData.message?.contractor);

  // Can Agency A read Agency B's thread messages?
  console.log('Agency A trying to read Agency B thread messages:', threadBName);
  const readOtherThread = await fetch(`${BASE_URL}/api/method/agency_tracking.chat_api.get_thread_messages`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_name: threadBName })
  });
  console.log('Agency A reading Agency B thread status:', readOtherThread.status);
  const readOtherData = await readOtherThread.json();
  console.log('Agency A reading Agency B thread body:', JSON.stringify(readOtherData).substring(0, 200));

  // Can Agency A send message into Agency B's thread?
  console.log('Agency A trying to send message to Agency B thread:', threadBName);
  const sendOtherThread = await fetch(`${BASE_URL}/api/method/agency_tracking.chat_api.send_message`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_name: threadBName, content: 'Malicious cross-tenant message' })
  });
  console.log('Agency A sending to Agency B thread status:', sendOtherThread.status);
  const sendOtherData = await sendOtherThread.json();
  console.log('Agency A sending to Agency B thread body:', JSON.stringify(sendOtherData).substring(0, 200));
}

setup().catch(console.error);
