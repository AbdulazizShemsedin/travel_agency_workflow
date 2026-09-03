const BASE_URL = 'http://localhost:3000';

async function testSelectPlacedCandidate() {
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

  // Login as qqwqw's user: as@gmail.com
  // Wait, let's see if we can login as Agency B (Kuwait) or if Agency A can select it again
  const sessionA = await loginAs('audit-agency-alpha@example.com', 'AuditAgency123!');
  const sessionB = await loginAs('audit-agency-beta@example.com', 'AuditAgencyBeta123!');

  console.log('1. Agency B (Kuwait) attempts to select APP-00009 (which is placed with Agency A):');
  const selB = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.select_candidate`, {
    method: 'POST',
    headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant_name: 'APP-00009' })
  });
  console.log('Agency B select APP-00009 status:', selB.status);
  const selBData = await selB.json();
  console.log('Agency B select APP-00009 body:', JSON.stringify(selBData, null, 2));

  console.log('\n2. Agency A (owning agency) attempts to select APP-00009 again:');
  const selA = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.select_candidate`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicant_name: 'APP-00009' })
  });
  console.log('Agency A select APP-00009 again status:', selA.status);
  const selAData = await selA.json();
  console.log('Agency A select APP-00009 again body:', JSON.stringify(selAData, null, 2));

  console.log('\n3. Check if APP-00009 is still returned in list_portal_candidates:');
  const listA = await fetch(`${BASE_URL}/api/method/agency_tracking.portal_api.list_portal_candidates`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const candidatesA = (await listA.json()).message || [];
  const found = candidatesA.find(c => c.name === 'APP-00009');
  console.log('Is APP-00009 in portal list for Agency A?', !!found);
}

testSelectPlacedCandidate().catch(console.error);
