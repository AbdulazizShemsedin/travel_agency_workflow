import https from 'https';

const HOST = 'agencytracking-production.up.railway.app';

function req(path, method = 'GET', body = null, cookies = [], csrf = null) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(csrf ? { 'X-Frappe-CSRF-Token': csrf } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
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
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  console.log('Logging in as Administrator...');
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];
  console.log('Login status:', loginRes.status);

  console.log('Fetching CSRF token...');
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrfToken = csrfRes.body?.message?.csrf_token || csrfRes.body?.csrf_token;
  console.log('CSRF Token:', csrfToken);

  console.log('\n--- PROBING 1: get_vapid_public_key ---');
  const vapidRes = await req('/api/method/agency_tracking.notification_api.get_vapid_public_key', 'GET', null, cookies, csrfToken);
  console.log('Status:', vapidRes.status, 'Body:', JSON.stringify(vapidRes.body, null, 2));

  console.log('\n--- PROBING 2: test_storage_connection ---');
  const storageRes = await req('/api/method/agency_tracking.storage_engine.test_storage_connection', 'POST', {}, cookies, csrfToken);
  console.log('Status:', storageRes.status, 'Body:', JSON.stringify(storageRes.body, null, 2));

  console.log('\n--- PROBING 3: list_new_complaints ---');
  const newComplaintsRes = await req('/api/method/agency_tracking.complaint_api.list_new_complaints', 'GET', null, cookies, csrfToken);
  console.log('Status:', newComplaintsRes.status, 'Body:', JSON.stringify(newComplaintsRes.body, null, 2));

  console.log('\n--- PROBING 4: list_complaints ---');
  const allComplaintsRes = await req('/api/method/agency_tracking.complaint_api.list_complaints', 'GET', null, cookies, csrfToken);
  console.log('Status:', allComplaintsRes.status, 'Body:', JSON.stringify(allComplaintsRes.body, null, 2));

  console.log('\n--- PROBING 5: record_batch_advance (dry/validation probe) ---');
  const advanceRes = await req('/api/method/agency_tracking.finance_api.record_batch_advance', 'POST', { batch_name: 'NON_EXISTENT_PROBE', advance_amount: 100 }, cookies, csrfToken);
  console.log('Status:', advanceRes.status, 'Body:', JSON.stringify(advanceRes.body, null, 2));

  console.log('\n--- PROBING 6: check Commission Batch Request schema / fields ---');
  const listBatchesRes = await req('/api/method/agency_tracking.finance_api.list_batches', 'GET', null, cookies, csrfToken);
  console.log('List Batches Status:', listBatchesRes.status, 'Count:', listBatchesRes.body?.message?.length);
  if (listBatchesRes.body?.message?.length) {
    console.log('Sample batch keys:', Object.keys(listBatchesRes.body.message[0]));
    console.log('Sample batch:', JSON.stringify(listBatchesRes.body.message[0], null, 2));
  }
}

main().catch(console.error);
