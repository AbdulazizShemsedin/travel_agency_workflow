// Comprehensive Live Frappe E2E Full Workflow Test
const BASE_URL = "https://applicantprocessing-production.up.railway.app";
const HEADERS = {
  "Authorization": "token a7b1bb5c2468fcf:00337e0b45c9cda",
  "Content-Type": "application/json",
  "Accept": "application/json"
};

async function testLiveFlow() {
  console.log("==========================================================================");
  console.log("=== EXECUTING FULL APPLICANT LIFECYCLE ON LIVE FRAPPE RAILWAY BACKEND ===");
  console.log("==========================================================================\n");

  const timestamp = Date.now().toString().slice(-4);
  let applicantId = "";

  // 1. Stage 1: Create Draft
  console.log("[STEP 1] Creating Draft Applicant on live Frappe...");
  const draftRes = await fetch(`${BASE_URL}/api/resource/Applicant`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      first_name: "Fatima",
      last_name: `Ali-${timestamp}`,
      gender: "Female",
      religion: "Muslim",
      marital_status: "Single",
      children: 0,
      nationality: "Ethiopia",
      phone_number: "+251911223344",
      city: "Addis Ababa",
      country: "Ethiopia"
    })
  });
  const draftData = await draftRes.json();
  if (!draftRes.ok || draftData.exception) {
    throw new Error(`Draft creation failed: ${JSON.stringify(draftData)}`);
  }
  applicantId = draftData.data.name;
  console.log(`✓ Draft Created: ${applicantId} (State: ${draftData.data.applicant_state})\n`);

  // 2. Stage 2: Populate KYC & Register
  console.log("[STEP 2] Updating KYC details & Registering Applicant...");
  const updateRes = await fetch(`${BASE_URL}/api/resource/Applicant/${applicantId}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({
      date_of_birth: "2000-05-15",
      passport_number: `EP${timestamp}88`,
      passport_issue_date: "2024-01-10",
      passport_expiry: "2029-01-10",
      place_of_issue: "Addis Ababa",
      job_applied: "Housemaid",
      highest_education: "High School",
      photo_passport: "/files/sample_passport.jpg",
      photo_full_body: "/files/sample_full_body.jpg",
      passport_scan: "/files/sample_passport_scan.pdf",
      medical_status: "FIT",
      medical_expiry_date: "2027-08-30"
    })
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok || updateData.exception) {
    throw new Error(`KYC update failed: ${JSON.stringify(updateData)}`);
  }

  const regRes = await fetch(`${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ applicant_name: applicantId })
  });
  const regData = await regRes.json();
  if (!regRes.ok || regData.exception) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  console.log(`✓ Applicant Registered: ${applicantId}\n`);

  // 3. Stage 3: Generate CV
  console.log("[STEP 3] Generating Bilateral CV PDF...");
  const cvRes = await fetch(`${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ applicant_name: applicantId })
  });
  const cvData = await cvRes.json();
  if (!cvRes.ok || cvData.exception) {
    throw new Error(`CV generation failed: ${JSON.stringify(cvData)}`);
  }
  console.log(`✓ CV Generated successfully\n`);

  // 4. Verify Applicant State
  const checkRes = await fetch(`${BASE_URL}/api/resource/Applicant/${applicantId}`, { headers: HEADERS });
  const checkData = await checkRes.json();
  console.log(`[VERIFICATION] Current State: ${checkData.data.applicant_state}, Step: ${checkData.data.state_step}, Progress: ${checkData.data.state_progress}%`);

  console.log("\n==========================================================================");
  console.log("=== FULL LIFECYCLE TEST COMPLETED SUCCESSFULLY ON LIVE BACKEND! ===");
  console.log("==========================================================================");
}

testLiveFlow().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
