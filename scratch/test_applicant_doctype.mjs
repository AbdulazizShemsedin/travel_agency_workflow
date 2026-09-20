async function testEdu() {
  const loginRes = await fetch('http://localhost:3000/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });
  const cookie = loginRes.headers.get('set-cookie');

  const metaRes = await fetch('http://localhost:3000/api/method/frappe.client.get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ doctype: 'DocType', name: 'Applicant' })
  });
  const meta = await metaRes.json();
  const fields = meta.message.fields.filter(f => 
    f.fieldname.includes('edu') || 
    f.fieldname.includes('qual') || 
    f.fieldname.includes('relig') ||
    f.fieldname.includes('occup') ||
    f.fieldname.includes('job') ||
    f.fieldname.includes('issue') ||
    f.fieldname.includes('visa')
  );
  console.log('fields:', fields.map(f => ({ name: f.fieldname, type: f.fieldtype, options: f.options })));
}

testEdu().catch(console.error);
