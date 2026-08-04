/**
 * Pure utility functions for company name formatting.
 * This file has NO server-side dependencies (no prisma, no fs, no pg)
 * and is safe to import in both server and client components.
 */

export const DEFAULT_CANONICAL_COMPANY_NAME = "CÔNG TY CỔ PHẦN XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI";

export function splitCompanyNameForDocument(companyName?: string | null): [string, string] {
  const normalized = (companyName || "").trim() || DEFAULT_CANONICAL_COMPANY_NAME;

  const divider = normalized.toLocaleUpperCase("vi-VN").indexOf(" VÀ ");
  if (divider < 0) return [normalized, ""];
  return [normalized.slice(0, divider).trim(), normalized.slice(divider + 1).trim()];
}
