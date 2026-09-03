import http from 'http';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
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

async function main() {
  console.log('Testing proxy route with auth...');
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];

  // Even if proxy receives a call with NO X-Frappe-CSRF-Token on list_applicants:
  const res = await req('/api/method/agency_tracking.applicant_api.list_applicants', 'POST', {}, cookies);
  console.log('list_applicants status without client-side CSRF:', res.status);
}

main().catch(console.error);
