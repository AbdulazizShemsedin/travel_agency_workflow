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
  const { cookies: adminCookies } = await login('Administrator', 'admin123');

  const testEmail = `test.staff.${Date.now()}@example.com`;
  console.log(`Creating user: ${testEmail}`);

  await req('/api/method/frappe.client.insert', 'POST', {
    doc: {
      doctype: 'User',
      email: testEmail,
      first_name: 'Test',
      last_name: 'Employee',
      send_welcome_email: 0,
      new_password: 'Password1!',
      roles: [
        { doctype: 'Has Role', role: 'Registrar' }
      ]
    }
  }, adminCookies);

  // 1. Test updating password via frappe.client.set_value
  console.log('1. Testing reset password to Password2! via set_value...');
  const setVal = await req('/api/method/frappe.client.set_value', 'POST', {
    doctype: 'User',
    name: testEmail,
    fieldname: 'new_password',
    value: 'Password2!'
  }, adminCookies);
  console.log('set_value status:', setVal.status);

  const loginWithPass2 = await login(testEmail, 'Password2!');
  console.log('Login with Password2! status:', loginWithPass2.status);

  // 2. Test fetching user doc with roles
  console.log('2. Testing get_doc...');
  const getDoc = await req('/api/method/frappe.client.get', 'POST', {
    doctype: 'User',
    name: testEmail
  }, adminCookies);
  console.log('User roles in doc:', getDoc.body?.message?.roles?.map(r => r.role));

  // 3. Test updating roles
  console.log('3. Updating roles...');
  const updatedDoc = {
    ...getDoc.body.message,
    roles: [
      { doctype: 'Has Role', role: 'Registrar' },
      { doctype: 'Has Role', role: 'Manager' }
    ]
  };
  const saveDoc = await req('/api/method/frappe.client.save', 'POST', {
    doc: updatedDoc
  }, adminCookies);
  console.log('Save doc status:', saveDoc.status);
  console.log('Updated roles:', saveDoc.body?.message?.roles?.map(r => r.role));

  // 4. Test disabling/enabling user
  console.log('4. Disabling user...');
  const disableRes = await req('/api/method/frappe.client.set_value', 'POST', {
    doctype: 'User',
    name: testEmail,
    fieldname: 'enabled',
    value: 0
  }, adminCookies);
  console.log('Disable status:', disableRes.status);
  const disabledLogin = await login(testEmail, 'Password2!');
  console.log('Disabled user login status (should fail):', disabledLogin.status);

  // Clean up
  await req('/api/method/frappe.client.delete', 'POST', {
    doctype: 'User',
    name: testEmail
  }, adminCookies);
  console.log('Cleaned up.');
}
run();
