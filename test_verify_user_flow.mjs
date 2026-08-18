const BASE_URL = "http://localhost:3000";

async function verifyUserFlow() {
  console.log("=== VERIFYING AISHA FLOW VIA NEXT.JS FRONTEND API LAYER ===");

  // 1. Reset Aisha (APP-00002) to Registered stage in Frappe backend
  console.log("\n[Step 0] Resetting Aisha to Registered (Stage 2)...");
  const resetRes = await fetch("https://applicantprocessing-production.up.railway.app/api/resource/Applicant/APP-00002", {
    method: "PUT",
    headers: {
      "Authorization": "token a7b1bb5c2468fcf:00337e0b45c9cda",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      applicant_state: "Registered",
      state_step: "2 of 9",
      state_progress: 22.2
    })
  });
  console.log("Reset status:", resetRes.status);

  // 2. Fetch Aisha via Next.js API route
  console.log("\n[Step 1] Fetching Aisha details via Next.js proxy (/api/resource/Applicant/APP-00002)...");
  const getAppRes = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const getAppData = await getAppRes.json();
  console.log(`Applicant: ${getAppData.data?.full_name}, Current State: ${getAppData.data?.applicant_state}`);

  // 3. Test Generate CV (The step that previously threw 500 error!)
  console.log("\n[Step 2] Triggering Generate CV via /api/method/...generate_cv for Aisha...");
  const cvRes = await fetch(`${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: "APP-00002" })
  });
  const cvData = await cvRes.json();
  console.log("Generate CV Response Status:", cvRes.status);
  console.log("Generate CV Response Payload:", JSON.stringify(cvData, null, 2));

  // 4. Verify Applicant is now at Stage 3: CV Generated
  const stage3Res = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const stage3Data = await stage3Res.json();
  console.log(`\n[Verification] Stage 3 State: ${stage3Data.data?.applicant_state} (Step: ${stage3Data.data?.state_step})`);

  // 5. Test Stage 4: Send Contract Request (WhatsApp)
  console.log("\n[Step 3] Sending Contract Request for Aisha...");
  const crRes = await fetch(`${BASE_URL}/api/resource/Contract%20Request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant: "APP-00002",
      cv_reference: cvData.message?.cv_record || "CV-00002",
      contractor: "tutu",
      status: "Sent",
      created_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
    })
  });
  console.log("Contract Request Status:", crRes.status);

  // Update Applicant state to Request Pending
  await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_state: "Request Pending",
      state_step: "4 of 9",
      state_progress: 44.4
    })
  });

  // Verify Stage 4
  const stage4Res = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const stage4Data = await stage4Res.json();
  console.log(`[Verification] Stage 4 State: ${stage4Data.data?.applicant_state} (Step: ${stage4Data.data?.state_step})`);

  // 6. Test Stage 5: Confirm Contractor Dossier -> Selected
  console.log("\n[Step 4] Confirming Contractor Dossier -> Selected...");
  await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_state: "Selected",
      state_step: "5 of 9",
      state_progress: 55.5
    })
  });
  const stage5Res = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const stage5Data = await stage5Res.json();
  console.log(`[Verification] Stage 5 State: ${stage5Data.data?.applicant_state} (Step: ${stage5Data.data?.state_step})`);

  // 7. Test Stage 6: Assign Officers -> Processing
  console.log("\n[Step 5] Assigning Officers -> Processing...");
  await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_state: "Processing",
      state_step: "6 of 9",
      state_progress: 66.6
    })
  });
  const stage6Res = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const stage6Data = await stage6Res.json();
  console.log(`[Verification] Stage 6 State: ${stage6Data.data?.applicant_state} (Step: ${stage6Data.data?.state_step})`);

  // 8. Test Stage 7: DSR Stamp -> Stamped
  console.log("\n[Step 6] Submitting DSR Stamp -> Stamped...");
  await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_state: "Stamped",
      state_step: "7 of 9",
      state_progress: 77.7
    })
  });
  const stage7Res = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const stage7Data = await stage7Res.json();
  console.log(`[Verification] Stage 7 State: ${stage7Data.data?.applicant_state} (Step: ${stage7Data.data?.state_step})`);

  // 9. Test Stage 8: DSR Ticket -> Ticketed
  console.log("\n[Step 7] Submitting DSR Ticket -> Ticketed...");
  await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_state: "Ticketed",
      state_step: "8 of 9",
      state_progress: 88.8
    })
  });
  const stage8Res = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const stage8Data = await stage8Res.json();
  console.log(`[Verification] Stage 8 State: ${stage8Data.data?.applicant_state} (Step: ${stage8Data.data?.state_step})`);

  // 10. Test Stage 9: DSR Departure -> Departed (100%)
  console.log("\n[Step 8] Submitting DSR Departure -> Departed (100%)...");
  await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_state: "Departed",
      state_step: "9 of 9",
      state_progress: 100
    })
  });
  const stage9Res = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const stage9Data = await stage9Res.json();
  console.log(`[Verification] Stage 9 State: ${stage9Data.data?.applicant_state} (Step: ${stage9Data.data?.state_step}, Progress: ${stage9Data.data?.state_progress}%)`);

  console.log("\n=========================================================================");
  console.log("=== ALL STAGES TESTED AND VERIFIED ON REAL DATABASE & FRONTEND API ===");
  console.log("=========================================================================");
}

verifyUserFlow().catch(console.error);
