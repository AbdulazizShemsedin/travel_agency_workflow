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

  console.log('\n--- 2. Fetch Placements & Clearance Steps ---');
  const opRes = await fetch(`${BASE}/api/method/agency_tracking.placement_api.list_placements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({}),
  });
  const opData = await opRes.json();
  const placements = opData.message || [];
  console.log(`Found ${placements.length} placements.`);

  const samplePlc = placements[0];
  console.log('Sample placement:', {
    name: samplePlc.name,
    applicant: samplePlc.applicant,
    status: samplePlc.status,
  });

  // Test ticketing on sample placement
  console.log('\n--- 3. Test record_ticket_details on Placement ---');
  const tktRes = await fetch(`${BASE}/api/method/agency_tracking.placement_api.record_ticket_details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      placement_name: samplePlc.name,
      ticket_number: 'TK-999888',
      flight_date: '2026-10-15',
    }),
  });
  const tktData = await tktRes.json();
  console.log('record_ticket_details status:', tktRes.status, 'message:', tktData.message ? 'SUCCESS' : tktData);

  // Test advancePlacement to Ticketed on non-stamped placement
  console.log('\n--- 4. Test advancePlacement to Ticketed on Selected placement ---');
  const advRes = await fetch(`${BASE}/api/method/agency_tracking.placement_api.advance_placement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      placement_name: samplePlc.name,
      target_status: 'Ticketed',
    }),
  });
  const advData = await advRes.json();
  console.log('advance_placement status:', advRes.status, 'advData:', advData);

  // Fetch clearance steps for this placement
  console.log('\n--- 5. Test Taeshir appointment update ---');
  const stepsRes = await fetch(`${BASE}/api/method/agency_tracking.clearance_api.list_clearance_steps_queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({}),
  });
  const stepsData = await stepsRes.json();
  const steps = stepsData.message || [];
  console.log(`Found ${steps.length} clearance steps in queue.`);
  const taeshirStep = steps.find(s => s.step_type === 'Taeshir');
  if (taeshirStep) {
    console.log('Found Taeshir step:', taeshirStep.name, 'current injaz:', taeshirStep.reference_no);
    const setAppRes = await fetch(`${BASE}/api/method/agency_tracking.clearance_api.set_taeshir_appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        clearance_step_name: taeshirStep.name,
        appointment_date: '2026-10-20',
        injaz_number: 'E-998877',
      }),
    });
    const setAppData = await setAppRes.json();
    console.log('set_taeshir_appointment status:', setAppRes.status, 'res:', setAppData);
  }

  // Test LMIS clearance fields on applicant
  console.log('\n--- 6. Test update_applicant_for_lmis with labor_id, national_id, coc_status ---');
  const lmisUpdateRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.update_applicant_for_lmis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      applicant_name: samplePlc.applicant,
      labor_id: 'LBR-12345',
      national_id: 'NAT-67890',
      coc_status: 'Issued',
      emergency_contact_name: 'Jane Doe',
      emergency_contact_phone: '+251911223344',
    }),
  });
  const lmisUpdateData = await lmisUpdateRes.json();
  console.log('update_applicant_for_lmis fields returned:', {
    labor_id: lmisUpdateData.message?.labor_id,
    national_id: lmisUpdateData.message?.national_id,
    coc_status: lmisUpdateData.message?.coc_status,
    emergency_contact_name: lmisUpdateData.message?.emergency_contact_name,
    emergency_contact_phone: lmisUpdateData.message?.emergency_contact_phone,
  });
}

run().catch(console.error);
