import { demoStore } from '../src/lib/demo/store.js';
import { generateCvV2 } from '../src/lib/api/v2/cv.ts';
import { registerApplicantV2, createApplicantV2 } from '../src/lib/api/v2/applicants.ts';

async function testCvGenerationFlow() {
  console.log("=== TESTING CV GENERATION AND REGISTRATION FLOW ===");
  
  // 1. Create candidate
  const candidate = demoStore.createApplicant({
    first_name: "Almaz",
    middle_name: "Tesfaye",
    last_name: "Kebede",
    destination_country: "Saudi Arabia",
    target_job: "Housemaid",
    gender: "Female",
  });
  console.log("1. Created Candidate:", candidate.name, "State:", candidate.applicant_state);

  // 2. Register candidate
  const registered = demoStore.registerApplicant(candidate.name);
  console.log("2. Registered Candidate:", registered.name, "State:", registered.applicant_state);

  // 3. Generate CV via generateCvV2
  const cvRes = await generateCvV2(candidate.name);
  console.log("3. generateCvV2 Result:", JSON.stringify(cvRes));

  const updatedCandidate = demoStore.getApplicant(candidate.name);
  console.log("4. Updated Candidate State:", updatedCandidate.applicant_state, "CV URL:", updatedCandidate.cv_url);

  if (cvRes.status === "CV Generated" && updatedCandidate.applicant_state === "CV Generated") {
    console.log("\n>>> CV GENERATION FLOW: PASS (0 ERRORS)");
  } else {
    console.error("\n>>> CV GENERATION FLOW: FAIL");
    process.exit(1);
  }
}

testCvGenerationFlow().catch(console.error);
