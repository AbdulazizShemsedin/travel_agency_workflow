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
  
  // Let's test if create_complaint works if placement is applicant that HAS a placement
  // Earlier we saw PLM-00050 has applicant APP-00054
  const res = await req('/api/method/agency_tracking.complaint_api.create_complaint', 'POST', {
    placement: 'APP-00054',
    description: 'Test complaint description for APP-00054',
    worker_status_at_complaint: 'Working Abroad',
  }, cookies);
  console.log('Result with applicant ID APP-00054:', res.status, res.body.substring(0, 300));
}

test().catch(console.error);
