import https from 'https';

const HOST = 'travel-agency-workflow-three.vercel.app';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...headers
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch (e) { parsed = d; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

async function main() {
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' }, [], {
    'Content-Type': 'application/json'
  });
  const cookies = loginRes.headers['set-cookie'] || [];
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token || csrfRes.body?.message;
  const headers = { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': csrf };

  // Check earliest Applicant
  const appRes = await req('/api/method/agency_tracking.applicant_api.list_applicants', 'POST', {
    order_by: 'creation asc',
    limit_page_length: 5
  }, cookies, headers);
  const apps = appRes.body?.message || appRes.body?.data || [];
  console.log('Earliest applicants creation:', apps.map(a => ({ name: a.name, creation: a.creation })));

  // Check earliest transaction
  const txnRes = await req('/api/method/agency_tracking.finance_api.list_transactions', 'POST', {
    order_by: 'creation asc',
    limit_page_length: 5
  }, cookies, headers);
  const txns = txnRes.body?.message || txnRes.body?.data || txnRes.body || [];
  console.log('Earliest transactions creation:', Array.isArray(txns) ? txns.map(t => ({ name: t.name, creation: t.creation, date: t.date || t.transaction_date })) : txns);
}

main().catch(console.error);
