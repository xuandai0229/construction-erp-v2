import prisma from "@/lib/prisma";
import {
  DEFAULT_COMPANY_PROFILE,
  DEFAULT_DOCUMENT_POLICIES,
  DEFAULT_SYSTEM_SETTINGS,
  type CompanyProfileInput,
  type DocumentPolicyInput,
} from "@/lib/settings/settings-validation";

export type SettingsSnapshot = {
  id: string | null;
  version: number;
  company: CompanyProfileInput;
  documents: DocumentPolicyInput;
  updatedAt: Date | null;
  updatedBy: { id: string; name: string } | null;
  hasPersistedSettings: boolean;
};

export function toSettingsSnapshot(setting: (Awaited<ReturnType<typeof prisma.systemSetting.findFirst>> & { updatedBy?: { id: string; name: string } | null }) | null): SettingsSnapshot {
  if (!setting) {
    return {
      id: null,
      version: 0,
      company: { ...DEFAULT_COMPANY_PROFILE },
      documents: { ...DEFAULT_DOCUMENT_POLICIES },
      updatedAt: null,
      updatedBy: null,
      hasPersistedSettings: false,
    };
  }

  return {
    id: setting.id,
    version: setting.version,
    company: {
      companyName: setting.companyName,
      taxCode: setting.taxCode,
      hotline: setting.hotline,
    },
    documents: {
      maxUploadSizeMb: setting.maxUploadSizeMb,
      allowedExtensions: setting.allowedExtensions,
      enforceNamingConvention: setting.enforceNamingConvention,
      autoVersioning: setting.autoVersioning,
    },
    updatedAt: setting.updatedAt,
    updatedBy: setting.updatedBy ?? null,
    hasPersistedSettings: true,
  };
}

/** A read-only Settings query. It must not initialise or mutate the singleton row. */
export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  const setting = await prisma.systemSetting.findUnique({
    where: { singletonKey: "DEFAULT_SETTINGS" },
    include: { updatedBy: { select: { id: true, name: true } } },
  });
  return toSettingsSnapshot(setting);
}

/** Server-enforced document policy used by every upload request. */
export async function getEnforcedSystemSettings() {
  const setting = await prisma.systemSetting.findUnique({
    where: { singletonKey: "DEFAULT_SETTINGS" },
    select: {
      maxUploadSizeMb: true,
      allowedExtensions: true,
      enforceNamingConvention: true,
      autoVersioning: true,
    },
  });

  return setting ?? { ...DEFAULT_DOCUMENT_POLICIES };
}

export { DEFAULT_SYSTEM_SETTINGS };
