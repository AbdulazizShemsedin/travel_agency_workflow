const BASE_URL = 'http://localhost:3000';

async function testUploadContract() {
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

  console.log('1. Agency A (owner) uploads contract to PLM-00006...');
  const upA = await fetch(`${BASE_URL}/api/method/agency_tracking.placement_api.upload_contract`, {
    method: 'POST',
    headers: { 'Cookie': sessionA.cookie, 'X-Frappe-CSRF-Token': sessionA.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      placement_name: 'PLM-00006',
      file_url: '/files/ERAHMET YESUF ABRIE CONT.pdf'
    })
  });
  console.log('Agency A upload_contract status:', upA.status);
  const upAData = await upA.json();
  console.log('Agency A upload_contract response:', JSON.stringify(upAData, null, 2).substring(0, 300));

  console.log('\n2. Agency B (non-owner) attempts to upload contract to Agency A placement PLM-00006...');
  const upB = await fetch(`${BASE_URL}/api/method/agency_tracking.placement_api.upload_contract`, {
    method: 'POST',
    headers: { 'Cookie': sessionB.cookie, 'X-Frappe-CSRF-Token': sessionB.csrf, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      placement_name: 'PLM-00006',
      file_url: '/files/ERAHMET YESUF ABRIE CONT.pdf'
    })
  });
  console.log('Agency B upload_contract status:', upB.status);
  const upBData = await upB.json();
  console.log('Agency B upload_contract response:', JSON.stringify(upBData, null, 2));
}

testUploadContract().catch(console.error);
