const BASE_URL = 'http://localhost:3000';

async function testPrivateFileAccess() {
  const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'audit-agency-alpha@example.com', pwd: 'AuditAgency123!' })
  });
  const cookie = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : loginRes.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  const res = await fetch(`${BASE_URL}/private/files/photo_cropped.jpg`, {
    headers: { 'Cookie': cookie }
  });
  console.log('GET /private/files/photo_cropped.jpg status:', res.status);
}

testPrivateFileAccess().catch(console.error);
