import prisma from "@/lib/prisma";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/settings/settings-validation";

export async function getEnforcedSystemSettings() {
  const setting = await prisma.systemSetting.findFirst();
  if (!setting) {
    return DEFAULT_SYSTEM_SETTINGS;
  }
  return setting;
}
