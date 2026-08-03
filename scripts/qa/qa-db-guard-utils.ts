export const FORBIDDEN_DB_NAMES = ["postgres", "template0", "template1"];
export const ALLOWED_E2E_KEYWORDS = ["qa", "test", "e2e", "sandbox"];

export function maskDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const dbName = url.pathname.replace(/^\//, "");
    return `${url.protocol}//***:***@${url.hostname}:${url.port || "5432"}/${dbName}`;
  } catch {
    return "[INVALID_URL]";
  }
}

export function extractDatabaseName(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return url.pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

export function validateCandidateDatabaseUrl(candidateUrlStr?: string): { valid: boolean; dbName: string; reason?: string } {
  if (!candidateUrlStr || typeof candidateUrlStr !== "string") {
    return { valid: false, dbName: "", reason: "CANDIDATE_DATABASE_URL is required." };
  }

  let url: URL;
  try {
    url = new URL(candidateUrlStr);
  } catch {
    return { valid: false, dbName: "", reason: "Invalid database URL format." };
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    return { valid: false, dbName: "", reason: "Protocol must be postgres: or postgresql:." };
  }

  const dbName = url.pathname.replace(/^\//, "").toLowerCase();
  if (!dbName) {
    return { valid: false, dbName: "", reason: "Database name cannot be empty." };
  }

  if (FORBIDDEN_DB_NAMES.includes(dbName)) {
    return { valid: false, dbName, reason: `Database name cannot be a system database (${dbName}).` };
  }

  const hasKeyword = ALLOWED_E2E_KEYWORDS.some((kw) => dbName.includes(kw));
  if (!hasKeyword) {
    return { valid: false, dbName, reason: `Database name '${dbName}' must contain at least one QA/E2E keyword (qa, test, e2e, sandbox).` };
  }

  const primaryDbUrl = process.env.DATABASE_URL;
  if (primaryDbUrl) {
    const primaryDbName = extractDatabaseName(primaryDbUrl).toLowerCase();
    if (primaryDbName && dbName === primaryDbName) {
      return { valid: false, dbName, reason: "Candidate database cannot match primary DATABASE_URL." };
    }
  }

  return { valid: true, dbName };
}

export function validateE2eDatabaseCreation(
  adminUrlStr?: string,
  targetDbName?: string,
  confirmCreate?: string | boolean
): { valid: boolean; dbName: string; reason?: string } {
  if (confirmCreate !== true && confirmCreate !== "true") {
    return { valid: false, dbName: "", reason: "CONFIRM_CREATE_E2E_DATABASE=true is required to proceed." };
  }

  if (!adminUrlStr || typeof adminUrlStr !== "string") {
    return { valid: false, dbName: "", reason: "E2E_DATABASE_ADMIN_URL is required." };
  }

  let adminUrl: URL;
  try {
    adminUrl = new URL(adminUrlStr);
  } catch {
    return { valid: false, dbName: "", reason: "Invalid admin database URL format." };
  }

  if (adminUrl.protocol !== "postgres:" && adminUrl.protocol !== "postgresql:") {
    return { valid: false, dbName: "", reason: "Protocol must be postgres: or postgresql:." };
  }

  if (!targetDbName || typeof targetDbName !== "string") {
    return { valid: false, dbName: "", reason: "E2E_DATABASE_NAME is required." };
  }

  const dbName = targetDbName.trim().toLowerCase();
  if (FORBIDDEN_DB_NAMES.includes(dbName)) {
    return { valid: false, dbName, reason: `Target database name cannot be a system database (${dbName}).` };
  }

  const hasKeyword = ALLOWED_E2E_KEYWORDS.some((kw) => dbName.includes(kw));
  if (!hasKeyword) {
    return { valid: false, dbName, reason: `Target database name '${dbName}' must contain at least one QA/E2E keyword (qa, test, e2e, sandbox).` };
  }

  const primaryDbUrl = process.env.DATABASE_URL;
  if (primaryDbUrl) {
    const primaryDbName = extractDatabaseName(primaryDbUrl).toLowerCase();
    if (primaryDbName && dbName === primaryDbName) {
      return { valid: false, dbName, reason: "Target E2E database cannot match primary DATABASE_URL." };
    }
  }

  return { valid: true, dbName };
}
