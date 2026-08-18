const BASE_URL = "https://applicantprocessing-production.up.railway.app";
const HEADERS = {
  "Authorization": "token a7b1bb5c2468fcf:00337e0b45c9cda",
  "Content-Type": "application/json",
  "Accept": "application/json"
};

async function testAllStagesEndToEnd() {
  console.log("=== TESTING ALL STAGES LIVE ON FRAPPE BACKEND ===");
  
  // 1. Check Aisha (APP-00002)
  console.log("\n[1] Fetching Aisha (APP-00002)...");
  const appRes = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, { headers: HEADERS });
  const appData = await appRes.json();
  const aisha = appData.data;
  console.log("Aisha Current State:", aisha.applicant_state);

  // 2. Test Creating/Updating CV Record for Aisha directly
  console.log("\n[2] Testing CV Record Creation for Aisha...");
  const cvPayload = {
    applicant: aisha.name,
    full_name: aisha.full_name || `${aisha.first_name} ${aisha.last_name}`,
    first_name: aisha.first_name,
    last_name: aisha.last_name,
    nationality: aisha.nationality || "Ethiopia",
    religion: aisha.religion || "Muslim",
    marital_status: aisha.marital_status || "Married",
    children: aisha.children || 0,
    age: aisha.age || 20,
    gender: aisha.gender || "Female",
    date_of_birth: aisha.date_of_birth,
    passport_number: aisha.passport_number,
    passport_issue_date: aisha.passport_issue_date,
    passport_expiry: aisha.passport_expiry,
    place_of_issue: aisha.place_of_issue,
    national_id: aisha.national_id,
    job_applied: aisha.job_applied || "House Maid",
    highest_education: aisha.highest_education || "High School",
    phone_number: aisha.phone_number,
    status: "Final",
    template: "cv_template.html"
  };

  const createCvRes = await fetch(`${BASE_URL}/api/resource/CV%20Record`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(cvPayload)
  });
  const createCvData = await createCvRes.json();
  console.log("CV Record Creation Result:", createCvRes.status, createCvData.data?.name || createCvData.exception || createCvData.message);

  // 3. Test Updating Applicant State to 'CV Generated'
  console.log("\n[3] Updating Aisha state to 'CV Generated'...");
  const updateStateRes = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({
      applicant_state: "CV Generated",
      state_step: "3 of 9",
      state_progress: 33.3
    })
  });
  const updateStateData = await updateStateRes.json();
  console.log("Applicant state update result:", updateStateRes.status, updateStateData.data?.applicant_state);

  // 4. Test Contractor fetching
  console.log("\n[4] Fetching Contractors...");
  const contractorRes = await fetch(`${BASE_URL}/api/resource/Contractor?fields=["*"]`, { headers: HEADERS });
  const contractorData = await contractorRes.json();
  console.log("Contractors count:", contractorData.data?.length, contractorData.data?.[0]?.name);
  const contractorName = contractorData.data?.[0]?.name || "Test Contractor";

  // 5. Test Contract Request Creation
  console.log("\n[5] Testing Contract Request creation for Aisha...");
  const crPayload = {
    applicant: "APP-00002",
    full_name: "Aisha Ahmed",
    cv_reference: createCvData.data?.name || "CV-00002",
    contractor: contractorName,
    status: "Draft",
    created_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };
  const crRes = await fetch(`${BASE_URL}/api/resource/Contract%20Request`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(crPayload)
  });
  const crData = await crRes.json();
  console.log("Contract Request creation result:", crRes.status, crData.data?.name || crData.exception || crData.message);

  // 6. Test Dossier creation
  console.log("\n[6] Testing Applicant Dossier creation...");
  const dossierPayload = {
    applicant: "APP-00002",
    full_name: "Aisha Ahmed",
    status: "Draft"
  };
  const dosRes = await fetch(`${BASE_URL}/api/resource/Applicant%20Dossier`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(dossierPayload)
  });
  const dosData = await dosRes.json();
  console.log("Applicant Dossier creation result:", dosRes.status, dosData.data?.name || dosData.exception || dosData.message);

  // 7. Test LMS / Injaz / Wakala Clearance
  console.log("\n[7] Testing LMS / Injaz / Wakala Clearance creation...");
  const lmsRes = await fetch(`${BASE_URL}/api/resource/LMS%20Clearance`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ applicant: "APP-00002", status: "Pending" })
  });
  const lmsData = await lmsRes.json();
  console.log("LMS Clearance result:", lmsRes.status, lmsData.data?.name || lmsData.exception || lmsData.message);

  // 8. Test DSR Stamp
  console.log("\n[8] Testing DSR Stamp creation...");
  const stampRes = await fetch(`${BASE_URL}/api/resource/DSR%20Stamp`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ applicant: "APP-00002", visa_number: "V-998877", stamp_date: "2026-08-16", status: "Stamped" })
  });
  const stampData = await stampRes.json();
  console.log("DSR Stamp result:", stampRes.status, stampData.data?.name || stampData.exception || stampData.message);

  // 9. Test DSR Ticket
  console.log("\n[9] Testing DSR Ticket creation...");
  const ticketRes = await fetch(`${BASE_URL}/api/resource/DSR%20Ticket`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ applicant: "APP-00002", ticket_pnr: "PNR123", flight_date: "2026-08-25", status: "Booked" })
  });
  const ticketData = await ticketRes.json();
  console.log("DSR Ticket result:", ticketRes.status, ticketData.data?.name || ticketData.exception || ticketData.message);

  // 10. Test DSR Departure
  console.log("\n[10] Testing DSR Departure creation...");
  const depRes = await fetch(`${BASE_URL}/api/resource/DSR%20Departure`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ applicant: "APP-00002", departure_status: "Departed", departure_date: "2026-08-25" })
  });
  const depData = await depRes.json();
  console.log("DSR Departure result:", depRes.status, depData.data?.name || depData.exception || depData.message);
}

testAllStagesEndToEnd().catch(console.error);
