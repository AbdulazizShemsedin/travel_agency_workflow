import http from 'http';

function req(path, method = 'GET', body = null, cookies = []) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    if (data) r.write(data);
    r.end();
  });
}

async function testFlow() {
  console.log('1. Calling login...');
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  console.log('Login Status:', loginRes.status);
  const cookies = loginRes.headers['set-cookie'] || [];
  console.log('Cookies received:', cookies.length);

  console.log('\n2. Calling get_csrf_token...');
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'POST', {}, cookies);
  console.log('CSRF Status:', csrfRes.status, 'Body:', csrfRes.body);

  console.log('\n3. Calling get_current_user with GET...');
  const userRes = await req('/api/method/agency_tracking.auth_api.get_current_user', 'GET', null, cookies);
  console.log('User Status:', userRes.status, 'Body:', userRes.body.substring(0, 120));
}

testFlow().catch(console.error);
