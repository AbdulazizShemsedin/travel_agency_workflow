const BASE_URL = 'http://localhost:3000';

async function testDeskAccess() {
  const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'audit-agency-alpha@example.com', pwd: 'AuditAgency123!' })
  });

  const cookie = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : loginRes.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  console.log('Login response message:', (await loginRes.json()));

  // 1. Check GET /app
  const appRes = await fetch(`${BASE_URL}/app`, {
    headers: { 'Cookie': cookie },
    redirect: 'manual'
  });
  console.log('GET /app status:', appRes.status);
  console.log('GET /app location header:', appRes.headers.get('location'));

  // 2. Check frappe.desk.desktop.get_workspace_sidebar_items
  const deskSidebarRes = await fetch(`${BASE_URL}/api/method/frappe.desk.desktop.get_workspace_sidebar_items`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  });
  console.log('get_workspace_sidebar_items status:', deskSidebarRes.status);
  const deskSidebarData = await deskSidebarRes.json().catch(() => ({}));
  console.log('get_workspace_sidebar_items body:', JSON.stringify(deskSidebarData).substring(0, 200));

  // 3. Check frappe.boot.get_bootinfo
  const bootRes = await fetch(`${BASE_URL}/api/method/frappe.boot.get_bootinfo`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  });
  console.log('get_bootinfo status:', bootRes.status);
  const bootData = await bootRes.json().catch(() => ({}));
  console.log('get_bootinfo can_read / desk_user flag:');
  console.log('desk_theme:', bootData.message?.desk_theme);
  console.log('allowed_workspaces:', bootData.message?.allowed_workspaces);
}

testDeskAccess().catch(console.error);
