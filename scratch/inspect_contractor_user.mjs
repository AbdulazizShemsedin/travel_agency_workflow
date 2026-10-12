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

  const userRes = await req('/api/method/frappe.client.get', 'POST', { doctype: 'User', name: 'tihamat@gmail.com' }, cookies, { 'X-Frappe-CSRF-Token': csrf });
  const userDoc = JSON.parse(userRes.body)?.message || {};
  console.log('User doc keys:', Object.keys(userDoc));
  console.log('User first_name:', userDoc.first_name);
  console.log('User phone:', userDoc.phone);
  console.log('User mobile_no:', userDoc.mobile_no);
}

run();
