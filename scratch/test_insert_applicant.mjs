async function testInsert() {
  const loginRes = await fetch('http://localhost:3000/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin123' })
  });
  const cookie = loginRes.headers.get('set-cookie');

  // Try creating draft applicant with Muslim and SECONDARY LEVEL
  const createRes = await fetch('http://localhost:3000/api/method/agency_tracking.applicant_api.create_applicant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      first_name: 'TEST',
      last_name: 'USER',
      gender: 'Female',
      religion: 'Muslim',
      education: 'SECONDARY LEVEL',
      marital_status: 'Single',
      destination_country: 'Saudi Arabia',
      nationality: 'Ethiopia'
    })
  });
  console.log('Create with SECONDARY LEVEL status:', createRes.status);
  const json = await createRes.json();
  console.log('Create response:', json);
}

testInsert().catch(console.error);
