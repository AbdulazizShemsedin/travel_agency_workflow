async function testFullSuite() {
  const loginRes = await fetch('http://localhost:3000/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });
  const cookie = loginRes.headers.get('set-cookie');

  const testEmail = `test.staff.${Date.now()}@agency.et`;
  console.log('1. Creating employee:', testEmail);

  // 1. Insert
  const ins = await fetch('http://localhost:3000/api/method/frappe.client.insert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doc: {
        doctype: 'User',
        email: testEmail,
        first_name: 'Sara',
        last_name: 'Mekonnen',
        send_welcome_email: 0,
        new_password: 'Pass123!Initial',
        phone: '+251922334455',
        mobile_no: '+251922334455',
        roles: [{ doctype: 'Has Role', role: 'Registrar' }]
      }
    })
  });
  console.log('Insert status:', ins.status);

  // 2. Update roles to Registrar + Saudi LMIS + Recruiter
  console.log('2. Updating roles...');
  const getRes = await fetch('http://localhost:3000/api/method/frappe.client.get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ doctype: 'User', name: testEmail })
  });
  const userDoc = (await getRes.json()).message;
  userDoc.roles = [
    { doctype: 'Has Role', role: 'Registrar' },
    { doctype: 'Has Role', role: 'Saudi LMIS' },
    { doctype: 'Has Role', role: 'Recruiter' }
  ];
  const saveRes = await fetch('http://localhost:3000/api/method/frappe.client.save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ doc: userDoc })
  });
  console.log('Save roles status:', saveRes.status);
  const updatedRoles = (await saveRes.json()).message?.roles?.map(r => r.role);
  console.log('Updated roles:', updatedRoles);

  // 3. Reset password to Pass456!Reset
  console.log('3. Resetting password...');
  const resetRes = await fetch('http://localhost:3000/api/method/frappe.client.set_value', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doctype: 'User',
      name: testEmail,
      fieldname: 'new_password',
      value: 'Pass456!Reset'
    })
  });
  console.log('Reset password status:', resetRes.status);

  // 4. Test login with new password
  const testLogin = await fetch('http://localhost:3000/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: testEmail, pwd: 'Pass456!Reset' })
  });
  console.log('Login with new password status:', testLogin.status, (await testLogin.json()).message);

  // 5. Toggle status (Deactivate)
  console.log('5. Deactivating employee...');
  const deactRes = await fetch('http://localhost:3000/api/method/frappe.client.set_value', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      doctype: 'User',
      name: testEmail,
      fieldname: 'enabled',
      value: 0
    })
  });
  console.log('Deactivate status:', deactRes.status);

  // 6. Clean up
  console.log('6. Deleting test employee...');
  const del = await fetch('http://localhost:3000/api/method/frappe.client.delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ doctype: 'User', name: testEmail })
  });
  console.log('Delete status:', del.status);
}

testFullSuite().catch(console.error);
