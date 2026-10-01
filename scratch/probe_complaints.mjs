import http from 'http';
import https from 'https';

const BACKEND_URL = 'https://agencytracking-production-2a06.up.railway.app';

async function req(path, method = 'GET', body = null, cookie = '', csrf = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const headers = { 'Accept': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;
    let bodyData = null;
    if (body) {
      bodyData = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    request.on('error', reject);
    if (bodyData) request.write(bodyData);
    request.end();
  });
}

async function run() {
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const rawCookies = loginRes.headers['set-cookie'];
  const cookies = (rawCookies || []).map(c => c.split(';')[0]).join('; ');
  const csrfRes = await req('/api/method/agency_tracking.auth.get_current_user_roles', 'GET', null, cookies);
  const csrfToken = csrfRes.body?.message?.csrf_token || csrfRes.body?.csrf_token;

  const contractorsRes = await req('/api/method/agency_tracking.contractor_api.list_contractors', 'GET', null, cookies, csrfToken);
  console.log('Contractors count:', contractorsRes.body?.message?.length);
  if (contractorsRes.body?.message?.length) {
    console.log('Contractor sample:', contractorsRes.body.message.map(c => ({ name: c.name, company_name: c.company_name, user: c.user, email: c.user_email })));
  }
}

run().catch(console.error);
