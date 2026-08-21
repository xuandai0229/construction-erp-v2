import path from "node:path";

export const DATASET_ID = "COMPLETE_REAL_PROJECTS_TEST_DATA_V1";
export const ID_PREFIX = "tdv1-";
export const BUSINESS_PREFIX = "TDV1";
export const TEST_EMAIL_DOMAIN = "complete-test.local";
export const SEQUENCE_YEAR = 2099;
export const REFERENCE_DATE = new Date("2026-08-21T00:00:00.000Z");
export const CLEANUP_CONFIRMATION = "DELETE_COMPLETE_TEST_DATA_V1";

export const STORAGE_RELATIVE_ROOT = path.posix.join(
  "test-fixtures",
  "complete-real-projects-v1",
);
export const MANIFEST_FILE_NAME = "manifest.json";

export const TEST_USER_KEYS = [
  "admin",
  "director",
  "deputy",
  "commander",
  "manager",
  "engineer",
  "staff",
  "supervision-head",
  "construction-supervisor",
] as const;

export type TestUserKey = (typeof TEST_USER_KEYS)[number];

export function makeId(...parts: Array<string | number>): string {
  const suffix = parts
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${ID_PREFIX}${suffix}`;
}

export function projectKey(index: number): string {
  return `p${String(index + 1).padStart(2, "0")}`;
}

export function businessCode(projectCode: string, suffix: string): string {
  const projectNumber = projectCode.match(/(\d{4})$/)?.[1] ?? projectCode;
  return `${BUSINESS_PREFIX}-${projectNumber}-${suffix}`;
}

export function daysFromReference(days: number): Date {
  return new Date(REFERENCE_DATE.getTime() + days * 86_400_000);
}

