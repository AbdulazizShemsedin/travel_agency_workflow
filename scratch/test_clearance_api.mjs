import assert from 'assert';

const BASE = 'http://localhost:3000';

async function login(usr, pwd) {
  const res = await fetch(`${BASE}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr, pwd }),
  });
  const cookie = res.headers.get('set-cookie') || '';
  const json = await res.json();
  return { status: res.status, cookie, body: json };
}

async function run() {
  const auth = await login('Administrator', 'admin123');
  const cookie = auth.cookie;

  const res = await fetch(`${BASE}/api/method/agency_tracking.clearance_api.list_my_clearance_steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({}),
  });
  const json = await res.json();
  const steps = json.message || [];
  const t = steps.find(s => s.name === 'CLR-00002');
  console.log('CLR-00002 in list_my_clearance_steps:', {
    name: t?.name,
    step_type: t?.step_type,
    reference_no: t?.reference_no,
    injaz_application_id: t?.injaz_application_id,
    appointment_date: t?.appointment_date,
    date_started: t?.date_started,
  });
}

run().catch(console.error);
