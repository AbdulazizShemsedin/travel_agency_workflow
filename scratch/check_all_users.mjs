import http from 'http';

function req(path, method = 'GET', body = null, cookies = []) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    if (data) r.write(data);
    r.end();
  });
}

async function check() {
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];
  
  const usersRes = await req('/api/method/frappe.client.get_list', 'POST', {
    doctype: 'User',
    fields: ['name', 'email', 'full_name', 'enabled', 'user_type'],
    limit_page_length: 50
  }, cookies);
  const parsed = JSON.parse(usersRes.body);
  const users = parsed.message || parsed;
  console.log(`All Frappe Users count:`, users.length);
  for (const u of users) {
    // get user roles
    const userDocRes = await req('/api/method/frappe.client.get', 'POST', {
      doctype: 'User',
      name: u.name
    }, cookies);
    const doc = JSON.parse(userDocRes.body).message;
    const roles = (doc?.roles || []).map(r => r.role);
    console.log(`- ${u.name} (${u.full_name}):`, roles.filter(r => !['All', 'Guest'].includes(r)));
  }
}

check().catch(console.error);
