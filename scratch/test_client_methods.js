const https = require('https');
const HOST = 'agencytracking-production.up.railway.app';

function login(usr, pwd) {
  return new Promise(res => {
    const data = JSON.stringify({ usr, pwd });
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/method/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => res({ status: resp.statusCode, cookies: resp.headers['set-cookie'] || [], body: d }));
    });
    r.write(data);
    r.end();
  });
}

function req(path, method, body, cookies) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try {
          resolve({ status: resp.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: resp.statusCode, raw: d });
        }
      });
    });
    r.on('error', e => resolve({ error: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const { cookies } = await login('Administrator', 'admin123');

  const testEmail = `test.staff.${Date.now()}@example.com`;
  console.log(`Creating user: ${testEmail}`);

  // Insert user
  const ins = await req('/api/method/frappe.client.insert', 'POST', {
    doc: {
      doctype: 'User',
      email: testEmail,
      first_name: 'Test',
      last_name: 'Staff',
      send_welcome_email: 0,
      new_password: 'InitialPassword123!',
      roles: [
        { doctype: 'Has Role', role: 'Registrar' }
      ]
    }
  }, cookies);
  console.log('Insert status:', ins.status);

  // 1. Get user doc
  const getRes = await req('/api/method/frappe.client.get', 'POST', {
    doctype: 'User',
    name: testEmail
  }, cookies);
  console.log('Get doc status:', getRes.status, 'email:', getRes.body?.message?.email);
  console.log('Roles:', getRes.body?.message?.roles?.map(r => r.role));

  // 2. Update doc (add role and change first_name)
  const userDoc = getRes.body.message;
  userDoc.first_name = 'UpdatedTest';
  userDoc.roles.push({ doctype: 'Has Role', role: 'Saudi LMIS' });
  const saveRes = await req('/api/method/frappe.client.save', 'POST', {
    doc: userDoc
  }, cookies);
  console.log('Save doc status:', saveRes.status, 'name:', saveRes.body?.message?.first_name);
  console.log('Roles after save:', saveRes.body?.message?.roles?.map(r => r.role));

  // 3. Set value (e.g. enabled = 0)
  const setValRes = await req('/api/method/frappe.client.set_value', 'POST', {
    doctype: 'User',
    name: testEmail,
    fieldname: 'enabled',
    value: 0
  }, cookies);
  console.log('Set value (enabled=0) status:', setValRes.status, 'body:', setValRes.body?.message);

  // 4. Update password via set_value or save
  const setPwdRes = await req('/api/method/frappe.client.set_value', 'POST', {
    doctype: 'User',
    name: testEmail,
    fieldname: 'new_password',
    value: 'NewPassword123!'
  }, cookies);
  console.log('Set value (new_password) status:', setPwdRes.status);

  // Re-enable and test login with new password
  await req('/api/method/frappe.client.set_value', 'POST', {
    doctype: 'User',
    name: testEmail,
    fieldname: 'enabled',
    value: 1
  }, cookies);

  const loginRes = await login(testEmail, 'NewPassword123!');
  console.log('Login with NewPassword123! status:', loginRes.status, loginRes.body);

  // Clean up
  const delRes = await req('/api/method/frappe.client.delete', 'POST', {
    doctype: 'User',
    name: testEmail
  }, cookies);
  console.log('Delete status:', delRes.status);
}
run();
