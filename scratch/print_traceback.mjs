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
  
  const res = await req('/api/method/agency_tracking.complaint_api.create_complaint', 'POST', {
    placement: 'APP-00026',
    description: 'Test complaint description',
    worker_status_at_complaint: 'Working Abroad',
  }, cookies);
  const parsed = JSON.parse(res.body);
  console.log('Traceback:');
  if (parsed.exc) {
    console.log(JSON.parse(parsed.exc).join('\n'));
  } else {
    console.log(parsed);
  }
}

test().catch(console.error);
