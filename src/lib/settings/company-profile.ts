import prisma from "@/lib/prisma";
import { DEFAULT_COMPANY_PROFILE, type CompanyProfileInput } from "./settings-validation";

/**
 * Read-only source for company identity used by server-side report and document
 * generators. It deliberately does not initialise the SystemSetting row.
 */
export async function getCompanyProfile(): Promise<CompanyProfileInput> {
  const setting = await prisma.systemSetting.findUnique({
    where: { singletonKey: "DEFAULT_SETTINGS" },
    select: { companyName: true, taxCode: true, hotline: true },
  });

  return setting
    ? {
        companyName: setting.companyName,
        taxCode: setting.taxCode,
        hotline: setting.hotline,
      }
    : { ...DEFAULT_COMPANY_PROFILE };
}

export function splitCompanyNameForDocument(companyName: string): [string, string] {
  const normalized = companyName.trim();
  if (!normalized) return ["CHƯA CẤU HÌNH DOANH NGHIỆP", ""];

  const divider = normalized.toLocaleUpperCase("vi-VN").indexOf(" VÀ ");
  if (divider < 0) return [normalized, ""];
  return [normalized.slice(0, divider).trim(), normalized.slice(divider + 3).trim()];
}
