import http from 'http';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
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

async function run() {
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = JSON.parse(csrfRes.body)?.message?.csrf_token || '';

  // Update Contractor telephone
  await req('/api/method/frappe.client.set_value', 'POST', {
    doctype: 'Contractor',
    name: 'Tihamat Foreign Agency',
    fieldname: { telephone: '+966 50 111 2222' }
  }, cookies, { 'X-Frappe-CSRF-Token': csrf });

  // Update User phone & mobile_no
  await req('/api/method/frappe.client.set_value', 'POST', {
    doctype: 'User',
    name: 'tihamat@gmail.com',
    fieldname: { phone: '+966 50 111 2222', mobile_no: '+966 50 333 4444' }
  }, cookies, { 'X-Frappe-CSRF-Token': csrf });

  // Now list_contractors
  const listRes = await req('/api/method/agency_tracking.contractor_api.list_contractors', 'POST', {}, cookies, { 'X-Frappe-CSRF-Token': csrf });
  const listData = JSON.parse(listRes.body);
  const sample = (listData.message || listData).find(c => c.name === 'Tihamat Foreign Agency');
  console.log('Tihamat after update in list_contractors:', JSON.stringify(sample, null, 2));
}

run();
