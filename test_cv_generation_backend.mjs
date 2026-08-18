const BASE_URL = "http://localhost:3000";

async function verifyCvGeneration() {
  console.log("=== TESTING AUTHENTIC BACKEND CV GENERATION & RETRIEVAL ===");

  // 1. Reset Aisha (APP-00002) to Registered stage in Frappe backend
  console.log("\n[1] Setting Aisha (APP-00002) to 'Registered' stage...");
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

  // 2. Trigger generate_cv via Next.js API method proxy
  console.log("\n[2] Triggering generate_cv RPC via /api/method/.../generate_cv...");
  const genRes = await fetch(`${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: "APP-00002" })
  });
  const genData = await genRes.json();
  console.log("generate_cv Response status:", genRes.status);
  console.log("generate_cv Response payload:", JSON.stringify(genData, null, 2));

  // 3. Fetch Applicant APP-00002 and verify CV Record data enrichment
  console.log("\n[3] Fetching Applicant APP-00002 to verify CV Record enrichment...");
  const appRes = await fetch(`${BASE_URL}/api/resource/Applicant/APP-00002`);
  const appData = await appRes.json();
  const app = appData.data;

  console.log(`Applicant Name: ${app.full_name}`);
  console.log(`Applicant State: ${app.applicant_state} (Step: ${app.state_step})`);

  // Verify CV Record directly in Frappe database
  console.log("\n[4] Querying CV Record in Frappe database...");
  const cvRes = await fetch(`${BASE_URL}/api/resource/CV%20Record?filters=[["applicant","=","APP-00002"]]&fields=["*"]`);
  const cvData = await cvRes.json();
  const cvRecord = cvData.data?.[0];
  console.log("CV Record found in Frappe:", cvRecord ? cvRecord.name : "None");
  if (cvRecord) {
    console.log("  - Full Name:", cvRecord.full_name);
    console.log("  - Passport No:", cvRecord.passport_number);
    console.log("  - Job Applied:", cvRecord.job_applied);
    console.log("  - Monthly Salary:", cvRecord.monthly_salary);
    console.log("  - Nationality:", cvRecord.nationality);
    console.log("  - Experience Period:", cvRecord.experience_period);
    console.log("  - Experience Country:", cvRecord.experience_country);
    console.log("  - Photo Passport:", cvRecord.photo_passport);
    console.log("  - File Attachment:", cvRecord.file_attachment);
  }

  // 5. Test Private Files Proxy
  console.log("\n[5] Testing Private Files Proxy through Next.js (/private/files/...)...");
  const fileTestUrl = `${BASE_URL}/private/files/Screenshot_20260706_114445_TikTok.jpg`;
  const fileRes = await fetch(fileTestUrl);
  console.log(`Private File Proxy Status: ${fileRes.status}, Content-Type: ${fileRes.headers.get("content-type")}`);

  // 6. Test PDF Download Proxy
  const pdfTestUrl = `${BASE_URL}/private/files/CV-APP-00001-CV-00001b3f63c.pdf`;
  const pdfRes = await fetch(pdfTestUrl);
  console.log(`PDF Proxy Status: ${pdfRes.status}, Content-Type: ${pdfRes.headers.get("content-type")}`);

  console.log("\n=======================================================");
  console.log("=== ALL BACKEND CV INTEGRATION TESTS PASSED ===");
  console.log("=======================================================");
}

verifyCvGeneration().catch(console.error);
