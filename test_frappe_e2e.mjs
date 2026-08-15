// test_frappe_e2e.mjs
// End-to-End Test Suite validating Frappe Framework v15 Backend API integration

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function runTest(name, fn) {
  try {
    process.stdout.write(`[TEST] ${name}... `);
    await fn();
    console.log("✓ PASS");
  } catch (err) {
    console.log("✗ FAILED");
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log("==========================================================================");
  console.log("=== FRAPPE v15 BACKEND INTEGRATION & CANONICAL 9-STAGE E2E TEST SUITE ===");
  console.log("==========================================================================\n");

  let createdApplicantId = "";

  // 1. Create Draft Applicant (Stage 1 Floor)
  await runTest("Stage 1: Create Draft Applicant (POST /api/resource/Applicant)", async () => {
    const res = await fetch(`${BASE_URL}/api/resource/Applicant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: "Yonas",
        middle_name: "Berhanu",
        last_name: "Assefa",
        gender: "Male",
        religion: "Orthodox",
        marital_status: "Single",
        children: 0,
        nationality: "Ethiopia",
        phone_number: "+251911223344",
        city: "Addis Ababa",
        country: "Ethiopia",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    createdApplicantId = json.data.name;
    if (json.data.applicant_state !== "Draft") throw new Error("Expected state to be Draft");
  });

  // 2. Register Applicant (Stage 2 KYC)
  await runTest("Stage 2: Register Applicant (POST /api/method/...register_applicant)", async () => {
    // Populate Stage 2 fields
    await fetch(`${BASE_URL}/api/resource/Applicant/${createdApplicantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date_of_birth: "1997-04-15",
        passport_number: "EP9988776",
        highest_education: "Bachelor's Degree",
        medical_status: "FIT",
        medical_expiry_date: "2026-12-31",
      }),
    });

    const res = await fetch(
      `${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_name: createdApplicantId }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.applicant.applicant_state !== "Registered") throw new Error("Expected state to be Registered");
  });

  // 3. Generate Bilateral CV PDF
  await runTest("Stage 3: Generate CV PDF (POST /api/method/...generate_cv)", async () => {
    const res = await fetch(
      `${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_name: createdApplicantId }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (!json.message.cv_record) throw new Error("Expected cv_record in response");
  });

  // 4. Send Contract Request (WhatsApp Cloud Dispatch)
  await runTest("Stage 4: Send Contract Request via WhatsApp (POST /api/method/...send_contract_request)", async () => {
    const res = await fetch(
      `${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.contract_request.contract_request.send_contract_request`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_request_name: `CR-${createdApplicantId.replace("APP-", "")}` }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (!json.message.whatsapp_url) throw new Error("Expected whatsapp_url in response");
  });

  // 5. Parse Dossier & Advance to Selected
  await runTest("Stage 5: Parse Dossier Document (POST /api/method/...parse_dossier_file)", async () => {
    const res = await fetch(
      `${BASE_URL}/api/method/applicant_processing.applicant_processing.doctype.applicant_dossier.applicant_dossier.parse_dossier_file`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossier_name: `DOSSIER-${createdApplicantId.replace("APP-", "")}` }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 6. Update Clearances (LMS, Wakala, Injaz) -> Processing
  await runTest("Stage 6: Update Clearances via Frappe REST PUT (/api/resource/* Clearance)", async () => {
    // LMS Clearance
    await fetch(`${BASE_URL}/api/resource/LMS Clearance/LMS-${createdApplicantId.replace("APP-", "")}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant: createdApplicantId, status: "Issued", employee: "sara@agency.et" }),
    });

    // Injaz Clearance
    await fetch(`${BASE_URL}/api/resource/Injaz Clearance/INJ-${createdApplicantId.replace("APP-", "")}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant: createdApplicantId, status: "Completed", employee: "dawit@agency.et" }),
    });

    // Wakala Clearance
    await fetch(`${BASE_URL}/api/resource/Wakala Clearance/WAK-${createdApplicantId.replace("APP-", "")}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant: createdApplicantId, status: "Completed", employee: "tigist@agency.et" }),
    });
  });

  // 7. Submit Visa Stamp (Stage 7: Stamped)
  await runTest("Stage 7: Submit Visa Stamp Guardrail (POST /api/resource/DSR Stamp)", async () => {
    const res = await fetch(`${BASE_URL}/api/resource/DSR Stamp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant: createdApplicantId,
        visa_number: "KSA-VISA-778844",
        stamped_date: "2026-08-15",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 8. Submit Flight Ticket (Stage 8: Ticketed)
  await runTest("Stage 8: Issue Flight Ticket (POST /api/resource/DSR Ticket)", async () => {
    const res = await fetch(`${BASE_URL}/api/resource/DSR Ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant: createdApplicantId,
        ticket_pnr: "ET-PNR-9921",
        flight_number: "ET-402",
        destination: "Riyadh (RUH)",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 9. Pre-Departure Medical 2 & Final Departure (Stage 9: Departed)
  await runTest("Stage 9: Medical 2 Check & Departure (POST /api/resource/DSR Departure)", async () => {
    const res = await fetch(`${BASE_URL}/api/resource/DSR Departure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant: createdApplicantId,
        destination_city: "Riyadh, Saudi Arabia",
        medical_2_result: "Pass",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 10. Accounting Summary RPC
  await runTest("Accounting: Get Summary Dashboard (GET /api/method/...get_accounting_summary)", async () => {
    const res = await fetch(
      `${BASE_URL}/api/method/applicant_processing.applicant_processing.api.get_accounting_summary`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.message.total_income === undefined) throw new Error("Expected total_income in accounting summary");
  });

  console.log("\n==========================================================================");
  console.log("=== ALL 10 FRAPPE v15 CANONICAL WORKFLOW TESTS PASSED 100%! ===");
  console.log("==========================================================================");
}

main();
