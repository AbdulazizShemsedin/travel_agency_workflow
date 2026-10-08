/**
 * Display ID Utilities
 * 
 * Strict Client Rule: Never display raw system record numbers (APP-*, PLM-*, CLR-*, TXN-*, CBR-*, CMP-*).
 * Show a person as full name + passport number.
 * Show records without natural names using shortRef (#19).
 */

/**
 * Shortens record IDs like "CBR-00019" or "TXN-00042" into human-friendly numbers like "#19".
 */
export function shortRef(id?: string | null): string {
  if (!id || typeof id !== "string") return "";
  const trimmed = id.trim();
  const match = trimmed.match(/^[A-Z]{2,4}-(?:20\d{2}-)?0*(\d+)$/i);
  if (match) {
    return `#${match[1]}`;
  }
  if (trimmed.startsWith("#")) return trimmed;
  return trimmed;
}

/**
 * Removes internal record numbers injected into text strings by the backend.
 * Example: "LMIS Fee -- LMIS Clearance [CLR-00385] for PLM-00169" -> "LMIS Fee -- LMIS Clearance"
 */
export function stripRecordIds(text?: string | null): string {
  if (!text || typeof text !== "string") return "";
  return text
    // Remove bracketed record IDs like [CLR-00385] or [PLM-00169]
    .replace(/\s*\[[A-Z]{2,4}-(?:20\d{2}-)?\d+\]/gi, "")
    // Remove contextual references like "for PLM-00169"
    .replace(/\s*(?:for|on)\s+[A-Z]{2,4}-(?:20\d{2}-)?\d+/gi, "")
    // Remove standalone IDs
    .replace(/\b[A-Z]{2,4}-(?:20\d{2}-)?\d+\b/gi, "")
    // Clean whitespace and trailing punctuation
    .replace(/\s{2,}/g, " ")
    .replace(/\s*--\s*$/, "")
    .replace(/\s*-\s*$/, "")
    .trim();
}

/**
 * Returns true if a string is a raw record identifier (e.g. APP-00001, PLM-00020).
 * Used to detect when a name lookup fell back to its database primary key.
 */
export function isRecordId(text?: string | null): boolean {
  if (!text || typeof text !== "string") return false;
  return /^[A-Z]{2,4}-(?:20\d{2}-)?\d+$/i.test(text.trim());
}

/**
 * Formats a person display name with optional passport number.
 * Never prints a raw record ID.
 */
export function formatPerson(fullName?: string | null, passportNumber?: string | null): string {
  const cleanName = fullName && !isRecordId(fullName) ? fullName.trim() : "";
  const cleanPassport = passportNumber && !isRecordId(passportNumber) ? passportNumber.trim() : "";
  
  if (cleanName && cleanPassport) {
    return `${cleanName} (${cleanPassport})`;
  }
  if (cleanName) {
    return cleanName;
  }
  if (cleanPassport) {
    return cleanPassport;
  }
  return "Unknown";
}
