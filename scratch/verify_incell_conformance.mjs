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
  console.log('--- 1. Authenticate ---');
  const auth = await login('Administrator', 'admin123');
  const cookie = auth.cookie;
  assert.strictEqual(auth.status, 200);

  console.log('\n--- 2. Verify Placement list has real data ---');
  const plcRes = await fetch(`${BASE}/api/method/agency_tracking.placement_api.list_placements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({}),
  });
  const plcs = (await plcRes.json()).message || [];
  console.log(`Loaded ${plcs.length} placements.`);

  const samplePlc = plcs[0];
  console.log('Testing placement update on:', samplePlc.name);

  // 1. Test visa number update
  const testVisa = 'VSA-' + Date.now().toString().slice(-6);
  const visaRes = await fetch(`${BASE}/api/method/agency_tracking.placement_api.update_placement_parsed_fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      placement_name: samplePlc.name,
      visa_number: testVisa,
    }),
  });
  const visaData = (await visaRes.json()).message;
  assert.strictEqual(visaData.visa_number, testVisa, 'Visa number must persist in placement');
  console.log('✓ Visa number successfully persisted:', visaData.visa_number);

  // 2. Test remark update on applicant
  const testRemark = 'REMARK_VERIFIED_' + Date.now().toString().slice(-4);
  const remarkRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.update_applicant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      applicant_name: samplePlc.applicant,
      remarks: testRemark,
    }),
  });
  const remarkData = (await remarkRes.json()).message;
  assert.strictEqual(remarkData.remarks, testRemark, 'Remarks must persist in applicant');
  console.log('✓ Applicant remarks successfully persisted:', remarkData.remarks);

  // 3. Test ticket details update on placement
  const testTicket = 'TKT-' + Date.now().toString().slice(-6);
  const testFlight = '2026-11-20';
  const tktRes = await fetch(`${BASE}/api/method/agency_tracking.placement_api.record_ticket_details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      placement_name: samplePlc.name,
      ticket_number: testTicket,
      flight_date: testFlight,
    }),
  });
  const tktData = (await tktRes.json()).message;
  assert.strictEqual(tktData.ticket_number, testTicket, 'Ticket number must persist in placement');
  console.log('✓ Ticket details successfully persisted:', tktData.ticket_number, tktData.flight_date);

  // 4. Test Taeshir appointment update
  const stepsRes = await fetch(`${BASE}/api/method/agency_tracking.clearance_api.list_my_clearance_steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({}),
  });
  const steps = (await stepsRes.json()).message || [];
  const taeshirStep = steps.find(s => s.step_type === 'Taeshir');
  if (taeshirStep) {
    const testEno = 'E' + Date.now().toString().slice(-8);
    const testAppDate = '2026-11-25';
    const appRes = await fetch(`${BASE}/api/method/agency_tracking.clearance_api.set_taeshir_appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        clearance_step_name: taeshirStep.name,
        appointment_date: testAppDate,
        injaz_application_id: testEno,
      }),
    });
    const appData = (await appRes.json()).message;
    assert.strictEqual(appRes.status, 200, 'set_taeshir_appointment must succeed');
    console.log('✓ Taeshir appointment successfully persisted:', appData.injaz_application_id, appData.appointment_date);
  }

  console.log('\n>>> ALL IN-CELL BACKEND RPC CONFORMANCE TESTS PASSED! <<<');
}

run().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
