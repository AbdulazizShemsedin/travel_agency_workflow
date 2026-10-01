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
  
  // Let's call list_placements
  const res = await req('/api/method/agency_tracking.placement_api.list_placements', 'POST', {}, cookies);
  console.log('list_placements Status:', res.status);
  try {
    const parsed = JSON.parse(res.body);
    const list = parsed.message || parsed;
    console.log('Placement count:', Array.isArray(list) ? list.length : 'not array');
    if (Array.isArray(list) && list.length > 0) {
      console.log('Sample placements:', list.slice(0, 5).map(p => ({ name: p.name, applicant: p.applicant, contractor: p.contractor, status: p.status })));
    }
  } catch (e) {
    console.log(res.body.substring(0, 300));
  }
}

test().catch(console.error);
