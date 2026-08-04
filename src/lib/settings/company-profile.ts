import prisma from "@/lib/prisma";
import { DEFAULT_COMPANY_PROFILE, type CompanyProfileInput } from "./settings-validation";
import { DEFAULT_CANONICAL_COMPANY_NAME } from "./company-name-utils";

// Re-export pure client-safe utilities so existing server-side callers
// of company-profile.ts continue to work without import changes.
export { DEFAULT_CANONICAL_COMPANY_NAME, splitCompanyNameForDocument } from "./company-name-utils";

/**
 * Read-only source for company identity used by server-side report and document
 * generators. It deliberately does not initialise the SystemSetting row.
 */
export async function getCompanyProfile(): Promise<CompanyProfileInput> {
  const setting = await prisma.systemSetting.findUnique({
    where: { singletonKey: "DEFAULT_SETTINGS" },
    select: { companyName: true, taxCode: true, hotline: true },
  });

  const companyName = setting?.companyName?.trim() || DEFAULT_CANONICAL_COMPANY_NAME;

  return {
    companyName,
    taxCode: setting?.taxCode || DEFAULT_COMPANY_PROFILE.taxCode,
    hotline: setting?.hotline || DEFAULT_COMPANY_PROFILE.hotline,
  };
}
