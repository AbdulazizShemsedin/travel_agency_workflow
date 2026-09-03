import https from 'https';

const HOST = 'agencytracking-production.up.railway.app';

function req(path, method = 'GET', body = null, cookies = [], csrf = null) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(csrf ? { 'X-Frappe-CSRF-Token': csrf } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
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
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];

  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;

  const docRes = await req('/api/method/frappe.client.get', 'POST', {
    doctype: 'DocType',
    name: 'Commission Batch Request'
  }, cookies, csrf);
  console.log('DocType Status:', docRes.status);
  if (docRes.body?.docs?.[0]?.fields || docRes.body?.message?.fields) {
    const fields = (docRes.body?.docs?.[0]?.fields || docRes.body?.message?.fields).map(f => ({
      fieldname: f.fieldname,
      label: f.label,
      fieldtype: f.fieldtype
    }));
    console.log('All fields:', fields.filter(f => f.fieldname.includes('advance') || f.fieldname.includes('balance') || f.fieldname.includes('status')));
  }
}

main().catch(console.error);
