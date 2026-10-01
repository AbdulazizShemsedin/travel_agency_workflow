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
  
  // Let's check placements for the 3 portal candidates: APP-00026, APP-00050, APP-00051
  const plmRes = await req('/api/method/agency_tracking.placement_api.list_placements', 'POST', {}, cookies);
  const parsedPlm = JSON.parse(plmRes.body);
  const plmList = parsedPlm.message || parsedPlm;
  
  const portalCandidates = ['APP-00026', 'APP-00050', 'APP-00051'];
  for (const candId of portalCandidates) {
    const matched = plmList.filter(p => p.applicant === candId);
    console.log(`Placements for ${candId}:`, matched.map(m => ({ name: m.name, contractor: m.contractor, status: m.status })));
  }
}

test().catch(console.error);
