import https from 'https';

const HOST = 'travelagency-production-b48d.up.railway.app';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise(resolve => {
    const r = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...headers
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch (e) { parsed = d; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    r.on('error', (err) => resolve({ error: err.message }));
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], {
    'Content-Type': 'application/json'
  });
  const cookies = loginRes.headers?.['set-cookie'] || [];

  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;

  console.log('Checking DocType System Settings field description for max_file_size...');
  const dtRes = await req('/api/method/frappe.client.get?doctype=DocType&name=System+Settings', 'GET', null, cookies, {
    'X-Frappe-CSRF-Token': csrf
  });
  const fields = dtRes.body?.message?.fields || [];
  const maxField = fields.find(f => f.fieldname === 'max_file_size');
  console.log('max_file_size field definition:', maxField);
}

main().catch(console.error);
