import assert from 'assert';

const BASE = 'http://localhost:3000';

async function login(usr, pwd) {
  const res = await fetch(`${BASE}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr, pwd }),
  });
  const cookie = res.headers.get('set-cookie') || '';
  const json = await res.json();
  return { status: res.status, cookie, body: json };
}

async function run() {
  console.log('--- 1. Admin Authentication ---');
  const adminLogin = await login('Administrator', 'admin123');
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const cookie = adminLogin.cookie;
  console.log('Admin logged in successfully:', adminLogin.body.full_name);

  console.log('\n--- 2. Fetch Employee Directory List ---');
  const listRes = await fetch(`${BASE}/api/method/frappe.client.get_list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doctype: 'User',
      fields: ['name', 'email', 'full_name', 'first_name', 'last_name', 'enabled', 'user_type', 'creation', 'phone', 'mobile_no'],
      filters: [['User', 'user_type', '=', 'System User'], ['User', 'name', '!=', 'Guest']],
      limit_page_length: 50,
    }),
  });
  assert.strictEqual(listRes.status, 200, 'Failed to fetch user list');
  const initialUsers = (await listRes.json()).message || [];
  console.log(`Successfully listed ${initialUsers.length} existing employees.`);

  console.log('\n--- 3. Create New Employee on Frontend ---');
  const testEmail = `qa.staff.${Date.now()}@agency.et`;
  const insertRes = await fetch(`${BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doc: {
        doctype: 'User',
        email: testEmail,
        first_name: 'Almaz',
        last_name: 'Tesfaye',
        phone: '+251912345678',
        mobile_no: '+251912345678',
        new_password: 'StaffInitialPass123!',
        send_welcome_email: 0,
        roles: [
          { doctype: 'Has Role', role: 'Desk User' },
          { doctype: 'Has Role', role: 'Registrar' },
          { doctype: 'Has Role', role: 'Ticketer' },
          { doctype: 'Has Role', role: 'Saudi LMIS' },
        ],
      },
    }),
  });
  assert.strictEqual(insertRes.status, 200, 'Failed to insert new employee');
  const createdDoc = (await insertRes.json()).message;
  console.log(`Created employee: ${createdDoc.full_name} (${createdDoc.email})`);

  console.log('\n--- 4. Verify Roles on Created Employee ---');
  const getRes = await fetch(`${BASE}/api/method/frappe.client.get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ doctype: 'User', name: testEmail }),
  });
  assert.strictEqual(getRes.status, 200, 'Failed to get employee record');
  const userDoc = (await getRes.json()).message;
  const initialRoles = (userDoc.roles || []).map((r) => r.role);
  console.log('Assigned roles:', initialRoles);
  assert(initialRoles.includes('Registrar'), 'Missing Registrar role');
  assert(initialRoles.includes('Ticketer'), 'Missing Ticketer role');
  assert(initialRoles.includes('Saudi LMIS'), 'Missing Saudi LMIS role');

  console.log('\n--- 5. Synchronize Security Roles (Add Kuwait Telesign, Remove Registrar) ---');
  userDoc.roles = [
    { doctype: 'Has Role', role: 'Desk User' },
    { doctype: 'Has Role', role: 'Ticketer' },
    { doctype: 'Has Role', role: 'Saudi LMIS' },
    { doctype: 'Has Role', role: 'Kuwait Telesign' },
  ];
  const saveRes = await fetch(`${BASE}/api/method/frappe.client.save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ doc: userDoc }),
  });
  assert.strictEqual(saveRes.status, 200, 'Failed to update roles');
  const updatedRoles = (await saveRes.json()).message?.roles?.map((r) => r.role);
  console.log('Updated roles:', updatedRoles);
  assert(updatedRoles.includes('Kuwait Telesign'), 'Missing Kuwait Telesign role');
  assert(!updatedRoles.includes('Registrar'), 'Registrar role was not removed');

  console.log('\n--- 6. Reset Staff Password ---');
  const resetRes = await fetch(`${BASE}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doctype: 'User',
      name: testEmail,
      fieldname: 'new_password',
      value: 'StaffNewSecurePass456!',
    }),
  });
  assert.strictEqual(resetRes.status, 200, 'Failed to reset password');
  console.log('Password reset successfully.');

  console.log('\n--- 7. Authenticate As Newly Created Employee ---');
  const empLogin = await login(testEmail, 'StaffNewSecurePass456!');
  assert.strictEqual(empLogin.status, 200, 'New employee login failed');
  console.log(`Employee logged in successfully as: ${empLogin.body.full_name}`);

  console.log('\n--- 8. Deactivate Employee Account ---');
  const deactRes = await fetch(`${BASE}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doctype: 'User',
      name: testEmail,
      fieldname: 'enabled',
      value: 0,
    }),
  });
  assert.strictEqual(deactRes.status, 200, 'Failed to deactivate employee');
  console.log('Employee account deactivated.');

  const deactLogin = await login(testEmail, 'StaffNewSecurePass456!');
  assert.strictEqual(deactLogin.status, 401, 'Deactivated employee was able to log in');
  console.log('Verified: Deactivated employee cannot log in (HTTP 401).');

  console.log('\n--- 9. Cleanup Test Employee ---');
  const delRes = await fetch(`${BASE}/api/method/frappe.client.delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ doctype: 'User', name: testEmail }),
  });
  assert.strictEqual(delRes.status, 200, 'Failed to delete test employee');
  console.log('Test employee deleted successfully.');

  console.log('\n>>> ALL 9 END-TO-END EMPLOYEE VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
