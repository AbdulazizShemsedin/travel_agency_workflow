async function bench() {
  const t0 = Date.now();
  const loginRes = await fetch('http://localhost:3000/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });
  const cookie = loginRes.headers.get('set-cookie');

  const listRes = await fetch('http://localhost:3000/api/method/frappe.client.get_list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doctype: 'User',
      fields: ['name', 'email', 'full_name', 'first_name', 'last_name', 'enabled', 'creation', 'phone', 'mobile_no'],
      filters: [['User', 'user_type', '=', 'System User']],
      limit_page_length: 50
    })
  });
  const users = (await listRes.json()).message || [];
  console.log(`Fetched ${users.length} users in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const userDocs = await Promise.all(users.map(async (u) => {
    try {
      const res = await fetch('http://localhost:3000/api/method/frappe.client.get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ doctype: 'User', name: u.name })
      });
      const data = await res.json();
      const roles = (data.message?.roles || []).map(r => r.role);
      return { ...u, roles };
    } catch {
      return { ...u, roles: [] };
    }
  }));
  console.log(`Enriched all ${userDocs.length} users with roles in ${Date.now() - t1}ms`);
  console.log('Sample enriched user:', userDocs[0].full_name, userDocs[0].roles);
}
bench();
