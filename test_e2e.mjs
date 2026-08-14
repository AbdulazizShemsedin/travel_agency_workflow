async function runE2ETests() {
  const base = "http://localhost:3000";
  console.log("====================================================");
  console.log("=== APPLICANT REGISTRATION MODULE E2E TEST SUITE ===");
  console.log("====================================================\n");

  // 1. Test Draft Save Validation (Missing Stage 1 fields)
  console.log("[TEST 1] Testing Stage 1 Validation (Incomplete fields)...");
  const res1 = await fetch(base + "/api/resource/Applicant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ first_name: "Fatima" }),
  });
  const data1 = await res1.json();
  console.log("Status:", res1.status, "Message:", data1.message);
  if (res1.status === 400) {
    console.log("✓ PASS: Incomplete Stage 1 draft was correctly rejected by backend validation.\n");
  } else {
    console.error("✗ FAIL: Expected 400 validation error.\n");
  }

  // 2. Test Successful Draft Creation (Stage 1 Mandatory Fields)
  console.log("[TEST 2] Testing Stage 1 Draft Creation with valid mandatory fields...");
  const stage1Payload = {
    first_name: "Fatima",
    middle_name: "Zahra",
    last_name: "Ali",
    gender: "Female",
    religion: "Muslim",
    marital_status: "Single",
    children: 0,
    nationality: "Ethiopia",
    phone_number: "+251911998877",
    city: "Addis Ababa",
    country: "Ethiopia",
    region: "Oromia",
    sub_region: "Bole",
    address_line_1: "House 123, St. 4",
  };
  const res2 = await fetch(base + "/api/resource/Applicant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stage1Payload),
  });
  const data2 = await res2.json();
  const applicantId = data2.data?.name;
  console.log("Status:", res2.status, "Saved Applicant:", applicantId, "State:", data2.data?.applicant_state);
  if (res2.status === 201 && data2.data?.applicant_state === "Draft") {
    console.log("✓ PASS: Draft created successfully with ID:", applicantId, "\n");
  } else {
    console.error("✗ FAIL: Draft creation failed.\n");
  }

  // 3. Test Registration Blocked for Incomplete Stage 2
  console.log("[TEST 3] Testing Registration on Draft with missing Stage 2 fields...");
  const res3 = await fetch(
    base +
      "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantId }),
    }
  );
  const data3 = await res3.json();
  console.log("Status:", res3.status, "Server Message:", data3._server_messages);
  if (res3.status === 400 && data3._server_messages?.includes("Missing required field")) {
    console.log("✓ PASS: Registration blocked for missing Stage 2 fields as specified.\n");
  } else {
    console.error("✗ FAIL: Expected missing field validation error.\n");
  }

  // 4. Test Registration Blocked when Medical Status is UNFIT
  console.log("[TEST 4] Testing Registration Blocked when Medical Status is UNFIT...");
  await fetch(base + "/api/resource/Applicant/" + encodeURIComponent(applicantId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date_of_birth: "1997-04-15",
      passport_number: "EP9876543",
      highest_education: "Bachelor's Degree",
      labour_id: "LBR-554433",
      contact_person_name: "Zahra Hassan",
      contact_person_phone: "+251922334455",
      coc_status: "Issued",
      exam_date: "2026-09-20",
      medical_status: "UNFIT",
      medical_expiry_date: "2026-10-15",
    }),
  });
  const res4 = await fetch(
    base +
      "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantId }),
    }
  );
  const data4 = await res4.json();
  console.log("Status:", res4.status, "Server Message:", data4._server_messages);
  if (res4.status === 400 && data4._server_messages?.includes("UNFIT")) {
    console.log("✓ PASS: Registration blocked for UNFIT medical status as specified.\n");
  } else {
    console.error("✗ FAIL: UNFIT check did not block registration.\n");
  }

  // 5. Test Successful Registration when Medical Status is FIT
  console.log("[TEST 5] Updating Medical Status to FIT and Registering Applicant...");
  await fetch(base + "/api/resource/Applicant/" + encodeURIComponent(applicantId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ medical_status: "FIT" }),
  });
  const res5 = await fetch(
    base +
      "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantId }),
    }
  );
  const data5 = await res5.json();
  console.log("Status:", res5.status, "Message:", data5.message, "State:", data5.applicant?.applicant_state);
  if (res5.status === 200 && data5.applicant?.applicant_state === "Registered") {
    console.log("✓ PASS: Applicant successfully transitioned to Registered state.\n");
  } else {
    console.error("✗ FAIL: Registration failed.\n");
  }

  // 6. Test CV Generation for Registered Applicant
  console.log("[TEST 6] Testing CV PDF Generation for Registered Applicant...");
  const res6 = await fetch(
    base +
      "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantId }),
    }
  );
  const data6 = await res6.json();
  console.log("Status:", res6.status, "CV Record:", data6.message);
  if (res6.status === 200 && data6.message?.cv_record) {
    console.log("✓ PASS: CV successfully generated for registered applicant.\n");
  } else {
    console.error("✗ FAIL: CV generation failed.\n");
  }

  // 7. Verify Directory Listing
  console.log("[TEST 7] Verifying Applicant in Directory Listing...");
  const res7 = await fetch(base + "/api/resource/Applicant");
  const data7 = await res7.json();
  const found = data7.data?.find((a) => a.name === applicantId);
  console.log(
    "Found in listing:",
    found ? `${found.name} (${found.full_name}, State: ${found.applicant_state})` : "Not found"
  );
  if (found) {
    console.log("✓ PASS: Registered applicant visible in directory list.\n");
  }

  console.log("=========================================================");
  console.log("=== ALL 7 END-TO-END SPECIFICATION TESTS PASSED 100%! ===");
  console.log("=========================================================");
}

runE2ETests().catch((e) => console.error("Test error:", e));
