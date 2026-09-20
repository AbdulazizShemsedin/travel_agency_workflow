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
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], { 'Content-Type': 'application/json' });
  const cookies = loginRes.headers?.['set-cookie'] || [];
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;
  const authHeaders = { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': csrf };

  const metaRes = await req('/api/method/frappe.desk.form.load.getdoctype', 'POST', JSON.stringify({ doctype: 'Applicant' }), cookies, authHeaders);
  console.log('getdoctype status:', metaRes.status);
  const fields = metaRes.body?.docs?.[0]?.fields || [];
  console.log('Birth fields:', fields.filter(f => f.fieldname?.includes('birth')).map(f => ({ name: f.fieldname, label: f.label, type: f.fieldtype })));
  console.log('place_of_birth field exists:', fields.some(f => f.fieldname === 'place_of_birth'));
}

main().catch(console.error);
