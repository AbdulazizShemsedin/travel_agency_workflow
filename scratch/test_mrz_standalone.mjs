function parseMRZText(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  const cleanText = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .toUpperCase();

  const lines = cleanText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 10);

  let line1 = "";
  let line2 = "";

  if (lines.length >= 2) {
    line1 = lines.find((l) => l.startsWith("P<") || l.startsWith("P")) || lines[0];
    const otherLines = lines.filter((l) => l !== line1);
    line2 = otherLines.find((l) => /^[A-Z0-9<]{30,}/.test(l)) || otherLines[0] || "";
  } else if (lines.length === 1 && lines[0].length >= 70) {
    const single = lines[0];
    const pIdx = single.indexOf("P<");
    if (pIdx !== -1 && single.length - pIdx >= 80) {
      line1 = single.slice(pIdx, pIdx + 44);
      line2 = single.slice(pIdx + 44, pIdx + 88);
    }
  }

  const result = {
    first_name: "",
    middle_name: "",
    last_name: "",
    passport_number: "",
    nationality: "Ethiopia",
    date_of_birth: "",
    dob: "",
    gender: "Female",
    passport_expiry: "",
    passport_expiry_date: "",
    place_of_issue: "Addis Ababa",
  };

  if (line1) {
    const pTag = line1.startsWith("P<") ? 2 : line1.startsWith("P") ? 1 : 0;
    const rest1 = line1.slice(pTag);
    const countryCode = rest1.slice(0, 3).replace(/</g, "");
    if (countryCode === "ETH") result.nationality = "Ethiopia";

    const nameSection = rest1.slice(3);
    const nameParts = nameSection.split("<<");
    if (nameParts.length >= 1) {
      result.last_name = nameParts[0].replace(/</g, " ").trim();
      if (nameParts.length >= 2) {
        const givenParts = nameParts[1].split("<").filter(Boolean);
        result.first_name = givenParts[0] || "";
        result.middle_name = givenParts[1] || "";
      }
    }
  }

  if (line2) {
    const rawPass = line2.slice(0, 9).replace(/</g, "").trim();
    if (rawPass) result.passport_number = rawPass;

    const dobRaw = line2.slice(13, 19);
    if (/^\d{6}$/.test(dobRaw)) {
      const yy = parseInt(dobRaw.slice(0, 2), 10);
      const mm = dobRaw.slice(2, 4);
      const dd = dobRaw.slice(4, 6);
      const yyyy = yy > 50 ? `19${dobRaw.slice(0, 2)}` : `20${dobRaw.slice(0, 2)}`;
      result.date_of_birth = `${yyyy}-${mm}-${dd}`;
      result.dob = `${yyyy}-${mm}-${dd}`;
    }

    const sexChar = line2.charAt(20);
    if (sexChar === "F") result.gender = "Female";
    else if (sexChar === "M") result.gender = "Male";

    const expRaw = line2.slice(21, 27);
    if (/^\d{6}$/.test(expRaw)) {
      const yy = parseInt(expRaw.slice(0, 2), 10);
      const mm = expRaw.slice(2, 4);
      const dd = expRaw.slice(4, 6);
      const yyyy = yy > 60 ? `19${expRaw.slice(0, 2)}` : `20${expRaw.slice(0, 2)}`;
      result.passport_expiry = `${yyyy}-${mm}-${dd}`;
      result.passport_expiry_date = `${yyyy}-${mm}-${dd}`;
    }
  }

  return result;
}

const testMRZ = `P<ETHDESTA<<ALMAZ<<<<<<<<<<<<<<<<<<<<<<<<<<<
EP12345674ETH9501018F2812316<<<<<<<<<<<<<<04`;

const parsed = parseMRZText(testMRZ);
console.log("STANDALONE_MRZ_PARSED:", JSON.stringify(parsed, null, 2));

if (
  parsed.first_name === "ALMAZ" &&
  parsed.last_name === "DESTA" &&
  parsed.passport_number === "EP1234567" &&
  parsed.date_of_birth === "1995-01-01" &&
  parsed.passport_expiry === "2028-12-31" &&
  parsed.gender === "Female"
) {
  console.log("ALL_MRZ_ASSERTIONS_PASSED: SUCCESS!");
} else {
  console.error("ASSERTION_FAILED:", parsed);
  process.exit(1);
}
