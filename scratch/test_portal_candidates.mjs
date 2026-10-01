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
  
  const portalPlm = await req('/api/method/agency_tracking.portal_api.list_my_placements', 'POST', {
    contractor: 'Gulf Star Manpower Kuwait (SEED-DEP)',
    contractor_name: 'Gulf Star Manpower Kuwait (SEED-DEP)'
  }, cookies);
  console.log('portal_api.list_my_placements Status:', portalPlm.status);
  const parsed = JSON.parse(portalPlm.body);
  const list = parsed.message || parsed;
  console.log('list_my_placements with contractor:', Array.isArray(list) ? list.length : list);
  if (Array.isArray(list)) {
    console.log(list.slice(0, 3));
  }
}

test().catch(console.error);
