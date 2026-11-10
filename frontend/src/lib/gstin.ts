const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function sanitizeGstin(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
}

export function validateGstin(value: string): string | null {
  const gstin = sanitizeGstin(value);
  if (!gstin) return "GSTIN is required";
  if (gstin.length !== 15) return "GSTIN must be exactly 15 characters";
  if (!/^\d{2}/.test(gstin)) return "GSTIN must begin with a 2-digit state code";
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(gstin.slice(2, 12))) {
    return "Characters 3–12 must be a valid PAN format (e.g. ABCDE1234F)";
  }
  if (!/^[1-9A-Z]$/.test(gstin[12] ?? "")) return "Character 13 must be an entity code";
  if (gstin[13] !== "Z") return "Character 14 must be Z (e.g. 29ABCDE1234F1Z5)";
  if (!GSTIN_PATTERN.test(gstin)) return "Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)";
  return null;
}
