const BASE_URL = 'http://localhost:3000';

async function testInternalIsolation() {
  const loginRes = await fetch(`${BASE_URL}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'audit-agency-alpha@example.com', pwd: 'AuditAgency123!' })
  });

  const cookie = loginRes.headers.getSetCookie 
    ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    : loginRes.headers.get('set-cookie').split(',').map(c => c.split(';')[0].trim()).join('; ');

  const csrfRes = await fetch(`${BASE_URL}/api/method/agency_tracking.auth_api.get_csrf_token`, {
    headers: { 'Cookie': cookie }
  });
  const csrf = (await csrfRes.json())?.message?.csrf_token;

  async function checkEndpoint(name, url, payload = {}) {
    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Cookie': cookie, 'X-Frappe-CSRF-Token': csrf, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, exc: data.exc_type || data.exception || null };
    } catch (e) {
      return { error: e.message };
    }
  }

  console.log('=== TESTING INTERNAL ENDPOINTS ACCESS AS FOREIGN AGENCY ===');
  const results = {};

  // 1. Applicant Endpoints
  results['list_applicants'] = await checkEndpoint('list_applicants', '/api/method/agency_tracking.applicant_api.list_applicants');
  results['create_applicant'] = await checkEndpoint('create_applicant', '/api/method/agency_tracking.applicant_api.create_applicant', { full_name: 'Hacker', entry_track: 'Standard', gender: 'Female', nationality: 'Ethiopia' });
  results['register_applicant'] = await checkEndpoint('register_applicant', '/api/method/agency_tracking.applicant_api.register_applicant', { applicant_name: 'APP-00001' });

  // 2. Finance / Commission Endpoints
  results['get_financial_overview'] = await checkEndpoint('get_financial_overview', '/api/method/agency_tracking.finance_api.get_financial_overview');
  results['list_applicant_transactions'] = await checkEndpoint('list_applicant_transactions', '/api/method/agency_tracking.finance_api.list_applicant_transactions');
  results['list_commission_transactions'] = await checkEndpoint('list_commission_transactions', '/api/method/agency_tracking.finance_api.list_commission_transactions');
  results['create_commission_batch'] = await checkEndpoint('create_commission_batch', '/api/method/agency_tracking.finance_api.create_commission_batch', { contractor: 'Audit Test Agency Alpha', destination_country: 'Saudi Arabia' });

  // 3. Reports Endpoints
  results['get_status_funnel_report'] = await checkEndpoint('get_status_funnel_report', '/api/method/agency_tracking.reports_api.get_status_funnel_report');
  results['get_cycle_time_report'] = await checkEndpoint('get_cycle_time_report', '/api/method/agency_tracking.reports_api.get_cycle_time_report');
  results['get_country_distribution_report'] = await checkEndpoint('get_country_distribution_report', '/api/method/agency_tracking.reports_api.get_country_distribution_report');

  // 4. Employees / Contractor Management
  results['list_contractors'] = await checkEndpoint('list_contractors', '/api/method/agency_tracking.contractor_api.list_contractors');
  results['create_contractor'] = await checkEndpoint('create_contractor', '/api/method/agency_tracking.contractor_api.create_contractor', { contractor_name: 'Rogue', country: 'Kuwait', user_email: 'rogue@example.com', user_first_name: 'Rogue' });
  results['raw_get_list_User'] = await checkEndpoint('raw_get_list_User', '/api/method/frappe.client.get_list', { doctype: 'User', filters: [['User', 'user_type', '=', 'System User']] });

  // 5. Internal Chat
  results['create_internal_thread'] = await checkEndpoint('create_internal_thread', '/api/method/agency_tracking.chat_api.create_internal_thread', { participant: 'Administrator' });

  // 6. Clearance Steps
  results['list_my_clearance_steps'] = await checkEndpoint('list_my_clearance_steps', '/api/method/agency_tracking.clearance_api.list_my_clearance_steps');
  results['start_clearance_step'] = await checkEndpoint('start_clearance_step', '/api/method/agency_tracking.clearance_api.start_clearance_step', { step_name: 'STEP-00001' });

  console.log(JSON.stringify(results, null, 2));
}

testInternalIsolation().catch(console.error);
