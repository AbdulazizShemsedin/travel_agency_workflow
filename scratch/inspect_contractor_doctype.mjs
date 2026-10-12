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

  // 1. list_contractors
  const listRes = await req('/api/method/agency_tracking.contractor_api.list_contractors', 'POST', {}, cookies, { 'X-Frappe-CSRF-Token': csrf });
  console.log('list_contractors status:', listRes.status);
  const listData = JSON.parse(listRes.body);
  const sample = (listData.message || listData)[0];
  console.log('Sample contractor from list_contractors:', JSON.stringify(sample, null, 2));

  // 2. frappe.client.get doctype Contractor
  if (sample?.name) {
    const getRes = await req('/api/method/frappe.client.get', 'POST', { doctype: 'Contractor', name: sample.name }, cookies, { 'X-Frappe-CSRF-Token': csrf });
    console.log('frappe.client.get Contractor status:', getRes.status);
    console.log('Full Contractor doc keys:', Object.keys(JSON.parse(getRes.body)?.message || {}));
    console.log('Full Contractor doc:', JSON.stringify(JSON.parse(getRes.body)?.message, null, 2));
  }
}

run();
