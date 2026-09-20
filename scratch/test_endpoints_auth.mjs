import https from 'https';

const HOST = 'travelagency-production-b48d.up.railway.app';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise(resolve => {
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
    r.on('error', (err) => resolve({ error: err.message }));
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  console.log('Logging in as Administrator...');
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], {
    'Content-Type': 'application/json'
  });
  const cookies = loginRes.headers?.['set-cookie'] || [];
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;
  console.log('CSRF:', csrf ? 'Obtained' : 'Failed');

  const authHeaders = {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': csrf
  };

  // 1. Test list_my_todos
  console.log('\n--- 1. Testing list_my_todos ---');
  const todosRes = await req('/api/method/agency_tracking.clearance_api.list_my_todos', 'POST', JSON.stringify({ status: 'Open' }), cookies, authHeaders);
  console.log('list_my_todos status:', todosRes.status);
  console.log('list_my_todos data:', JSON.stringify(todosRes.body)?.slice(0, 300));

  // 2. Test list_batch_write_offs
  console.log('\n--- 2. Testing list_batch_write_offs ---');
  // First get a batch name
  const batchesRes = await req('/api/method/agency_tracking.finance_api.get_owed_commissions', 'POST', JSON.stringify({}), cookies, authHeaders);
  const writeOffsRes = await req('/api/method/agency_tracking.finance_api.list_batch_write_offs', 'POST', JSON.stringify({ batch_name: 'CBR-00001' }), cookies, authHeaders);
  console.log('list_batch_write_offs status:', writeOffsRes.status);
  console.log('list_batch_write_offs data:', JSON.stringify(writeOffsRes.body)?.slice(0, 300));

  // 3. Test enqueue_parse_passport_file & get_job_status
  console.log('\n--- 3. Testing enqueue_parse_passport_file & get_job_status ---');
  const enqueueRes = await req('/api/method/agency_tracking.passport_parser.enqueue_parse_passport_file', 'POST', JSON.stringify({ file_url: '/files/test.png' }), cookies, authHeaders);
  console.log('enqueue_parse_passport_file status:', enqueueRes.status);
  console.log('enqueue_parse_passport_file data:', JSON.stringify(enqueueRes.body)?.slice(0, 300));

  if (enqueueRes.body?.message?.job_id || enqueueRes.body?.job_id || typeof enqueueRes.body?.message === 'string') {
    const jobId = enqueueRes.body?.message?.job_id || enqueueRes.body?.job_id || enqueueRes.body?.message;
    console.log('Polling get_job_status for job:', jobId);
    const jobRes = await req('/api/method/agency_tracking.background_jobs.get_job_status', 'POST', JSON.stringify({ job_id: jobId }), cookies, authHeaders);
    console.log('get_job_status status:', jobRes.status);
    console.log('get_job_status data:', JSON.stringify(jobRes.body)?.slice(0, 300));
  }

  // 4. Test complaints listing with display_no
  console.log('\n--- 4. Testing complaints display_no ---');
  const complaintsRes = await req('/api/method/agency_tracking.complaint_api.list_complaints', 'POST', JSON.stringify({}), cookies, authHeaders);
  console.log('list_complaints status:', complaintsRes.status);
  const complaints = complaintsRes.body?.message || [];
  if (complaints.length > 0) {
    console.log('Sample complaint:', JSON.stringify(complaints[0]));
    console.log('display_no in complaint:', complaints[0].display_no, 'name:', complaints[0].name);
  }

  // 5. Test reopen_clearance_step
  console.log('\n--- 5. Testing reopen_clearance_step ---');
  const reopenRes = await req('/api/method/agency_tracking.clearance_api.reopen_clearance_step', 'POST', JSON.stringify({}), cookies, authHeaders);
  console.log('reopen_clearance_step status:', reopenRes.status, 'body:', JSON.stringify(reopenRes.body));
}

main().catch(console.error);
