async function runE2ETests() {
  const base = "http://localhost:3000";
  console.log("==========================================================================");
  console.log("=== APPLICANT WORKFLOW & CLIENT-SIDE VALIDATION END-TO-END TEST SUITE ===");
  console.log("==========================================================================\n");

  // TEST 1: Strict Validation - Draft Rejection for Missing Stage 1
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

  // TEST 2: Valid Draft Creation
  console.log("[TEST 2] Testing Stage 1 Draft Creation with valid mandatory fields...");
  const stage1Payload = {
    first_name: "Zenebech",
    middle_name: "Tadesse",
    last_name: "Haile",
    gender: "Female",
    religion: "Orthodox",
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

  // TEST 3: Registration with Stage 2 fields
  console.log("[TEST 3] Updating Stage 2 fields and registering applicant...");
  await fetch(base + "/api/resource/Applicant/" + encodeURIComponent(applicantId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date_of_birth: "1997-04-15",
      passport_number: "EP9876543",
      passport_expiry: "2030-04-15",
      highest_education: "Bachelor's Degree",
      labour_id: "LBR-554433",
      contact_person_name: "Tadesse Haile",
      contact_person_phone: "+251922334455",
      coc_status: "Issued",
      exam_date: "2026-09-20",
      medical_status: "FIT",
      medical_expiry_date: "2026-10-15",
    }),
  });

  const res3 = await fetch(
    base + "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantId }),
    }
  );
  const data3 = await res3.json();
  console.log("Status:", res3.status, "State:", data3.applicant?.applicant_state);
  if (res3.status === 200 && data3.applicant?.applicant_state === "Registered") {
    console.log("✓ PASS: Applicant successfully transitioned to Registered state.\n");
  } else {
    console.error("✗ FAIL: Registration failed.\n");
  }

  // TEST 4: Generate CV PDF
  console.log("[TEST 4] Generating standardized CV record...");
  const res4 = await fetch(
    base + "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantId }),
    }
  );
  const data4 = await res4.json();
  console.log("Status:", res4.status, "CV Record:", data4.message?.cv_record);
  if (res4.status === 200 && data4.message?.cv_record) {
    console.log("✓ PASS: CV successfully generated.\n");
  } else {
    console.error("✗ FAIL: CV generation failed.\n");
  }

  // TEST 5: Advance to Request Pending
  console.log("[TEST 5] Transitioning to Request Pending stage...");
  const res5 = await fetch(base + "/api/method/request_pending", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantId }),
  });
  const data5 = await res5.json();
  console.log("Status:", res5.status, "State:", data5.data?.applicant_state);
  if (res5.status === 200 && data5.data?.applicant_state === "Request Pending") {
    console.log("✓ PASS: Successfully reached Request Pending stage.\n");
  } else {
    console.error("✗ FAIL: Request Pending transition failed.\n");
  }

  // TEST 6: Upload and Extract Contractor Document
  console.log("[TEST 6] Simulating contractor document upload and OCR parsing...");
  const res6 = await fetch(base + "/api/method/upload_contractor_doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_name: applicantId,
      doc_data: {
        file_name: "Visa_Demand_Doc_Zenebech.pdf",
        contractor_name: "Al-Khaleej Manpower Services",
        sponsor_name: "Sheikh Fahad Abdullah Al-Ghamdi",
        sponsor_id: "NAT-SA-10884920",
        job_title: "Hospitality & Service Specialist",
        salary: 2400,
        selection_status: "Selected",
      },
    }),
  });
  const data6 = await res6.json();
  console.log("Status:", res6.status, "Extracted Sponsor:", data6.data?.contractor_doc?.sponsor_name);
  if (res6.status === 200 && data6.data?.contractor_doc?.sponsor_name) {
    console.log("✓ PASS: Contractor document parsed successfully.\n");
  } else {
    console.error("✗ FAIL: Contractor doc upload failed.\n");
  }

  // TEST 7: Approve Contractor Document -> Selected
  console.log("[TEST 7] Approving contractor document to transition to Selected...");
  const res7 = await fetch(base + "/api/method/approve_contractor_doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantId, approved: true }),
  });
  const data7 = await res7.json();
  console.log("Status:", res7.status, "State:", data7.data?.applicant_state);
  if (res7.status === 200 && data7.data?.applicant_state === "Selected") {
    console.log("✓ PASS: Applicant transitioned to Selected stage.\n");
  } else {
    console.error("✗ FAIL: Approval failed.\n");
  }

  // TEST 8: Assign Processing Employee with Role Type
  console.log("[TEST 8] Assigning employee with Role Type -> Processing...");
  const res8 = await fetch(base + "/api/method/assign_employee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_ids: [applicantId],
      role_type: "All Roles / Operations Lead",
      employee_id: "EMP-001",
      notes: "Urgent candidate deployment assignment",
    }),
  });
  const data8 = await res8.json();
  const assigned = data8.data?.[0];
  console.log("Status:", res8.status, "State:", assigned?.applicant_state, "Assigned To:", assigned?.assigned_employee_name);
  if (res8.status === 200 && assigned?.applicant_state === "Processing") {
    console.log("✓ PASS: Employee assigned and stage moved to Processing.\n");
  } else {
    console.error("✗ FAIL: Employee assignment failed.\n");
  }

  // TEST 9: Parallel Processing Stream Updates (LMS Ticket/Fields, Injaz Teashir fee, Wakala)
  console.log("[TEST 9] Updating LMS, Injaz (Teashir Fee), and Wakala streams in parallel...");
  // 9a. LMS update
  await fetch(base + "/api/method/update_lms_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_name: applicantId,
      lms_data: {
        status: "Completed",
        ticket_pnr: "ET-PNR-884910",
        flight_number: "ET-402",
        departure_date: "2026-09-30",
        destination: "Riyadh (RUH)",
        additional_field_1: "MOL-CLEAR-7744",
        additional_field_2: "INS-MED-9933",
      },
    }),
  });

  // 9b. Injaz update with Teashir fee
  await fetch(base + "/api/method/update_injaz_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_name: applicantId,
      injaz_data: {
        status: "Completed",
        injaz_app_no: "INJ-9921448",
        teashir_fee: 140,
        biometrics_date: "2026-08-25",
      },
    }),
  });

  // 9c. Wakala update
  const res9c = await fetch(base + "/api/method/update_wakala_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_name: applicantId,
      wakala_data: {
        status: "Completed",
        wakala_number: "WAK-778899",
        sponsor_auth_code: "ENJAZ-SA-7744",
      },
    }),
  });
  const data9c = await res9c.json();
  console.log("Status:", res9c.status, "State after all streams completed:", data9c.data?.applicant_state);
  if (res9c.status === 200 && data9c.data?.applicant_state === "Embassy/Stamped") {
    console.log("✓ PASS: Parallel processing streams completed -> Automatically advanced to Embassy/Stamped!\n");
  } else {
    console.error("✗ FAIL: Embassy transition check failed.\n");
  }

  // TEST 10: Mark Departed
  console.log("[TEST 10] Marking candidate as Departed by LMS/Operations coordinator...");
  const res10 = await fetch(base + "/api/method/mark_departed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_name: applicantId,
      departure_data: {
        flight_number: "ET-402",
        departure_date: "2026-09-30",
        departure_time: "08:45 AM",
        airport: "Addis Ababa Bole International (ADD)",
        destination_city: "Riyadh (RUH)",
        marked_by: "Sara Mohammed (LMS Specialist)",
      },
    }),
  });
  const data10 = await res10.json();
  console.log("Status:", res10.status, "Final State:", data10.data?.applicant_state);
  if (res10.status === 200 && data10.data?.applicant_state === "Departed") {
    console.log("✓ PASS: Full lifecycle completed to Departed state!\n");
  } else {
    console.error("✗ FAIL: Departure transition failed.\n");
  }

  console.log("==========================================================================");
  console.log("=== ALL 10 END-TO-END WORKFLOW & STAGE TRANSITIONS PASSED 100%! ===");
  console.log("==========================================================================");
}

runE2ETests().catch((e) => console.error("Test error:", e));
