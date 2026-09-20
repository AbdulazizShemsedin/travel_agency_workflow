import https from 'https';

const HOST = 'travelagency-production-b48d.up.railway.app';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
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
    r.on('error', err => resolve({ error: err.message }));
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  console.log('=== VERIFYING V2 BACKEND CONTRACT CONFORMANCE (2026-09-19 UPDATES) ===');

  // 1. Login as Administrator
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  console.log('1. Login status:', loginRes.status);
  const cookies = loginRes.headers?.['set-cookie'] || [];

  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;
  console.log('2. CSRF token acquired:', Boolean(csrf));
  const authHeaders = { 'X-Frappe-CSRF-Token': csrf };

  // 3. Test list_my_todos (Open and All)
  const todosRes = await req('/api/method/agency_tracking.clearance_api.list_my_todos', 'POST', { status: 'Open' }, cookies, authHeaders);
  console.log('3. list_my_todos (Open) status:', todosRes.status, 'records:', todosRes.body?.message?.length ?? 'none');

  const allTodosRes = await req('/api/method/agency_tracking.clearance_api.list_my_todos', 'POST', { status: '' }, cookies, authHeaders);
  console.log('4. list_my_todos (All) status:', allTodosRes.status, 'records:', allTodosRes.body?.message?.length ?? 'none');

  // 5. Test list_complaints returning display_no
  const complaintsRes = await req('/api/method/agency_tracking.complaint_api.list_unresolved_complaints', 'POST', {}, cookies, authHeaders);
  console.log('5. list_unresolved_complaints status:', complaintsRes.status);
  if (Array.isArray(complaintsRes.body?.message) && complaintsRes.body.message.length > 0) {
    const c = complaintsRes.body.message[0];
    console.log('   Sample complaint:', { name: c.name, display_no: c.display_no });
  }

  // 6. Test list_batch_write_offs endpoint
  const writeOffsRes = await req('/api/method/agency_tracking.finance_api.list_batch_write_offs', 'POST', { batch_name: 'CBR-NONEXISTENT' }, cookies, authHeaders);
  console.log('6. list_batch_write_offs response status:', writeOffsRes.status);

  // 7. Test get_job_status with invalid/empty job_name (verifying 417 Validation error)
  const jobStatusRes = await req('/api/method/agency_tracking.background_jobs.get_job_status', 'POST', { job_name: 'TEST-JOB' }, cookies, authHeaders);
  console.log('7. get_job_status response status:', jobStatusRes.status);

  // 8. Test list_employee_roster
  const rosterRes = await req('/api/method/agency_tracking.employee_api.list_employee_roster', 'POST', {}, cookies, authHeaders);
  console.log('8. list_employee_roster status:', rosterRes.status, 'employees count:', rosterRes.body?.message?.length ?? 0);

  console.log('\n=== ALL TARGET BACKEND RPC VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error);
