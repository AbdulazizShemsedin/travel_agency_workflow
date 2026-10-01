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

async function test() {
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];
  
  const contRes = await req('/api/method/agency_tracking.contractor_api.list_contractors', 'POST', {}, cookies);
  const parsed = JSON.parse(contRes.body);
  const list = parsed.message || parsed;
  console.log('Contractor sample:', list.slice(0, 3));
}

test().catch(console.error);
