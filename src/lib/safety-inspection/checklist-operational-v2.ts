import { createHash } from "node:crypto";
import rawDefinition from "../../../prisma/reference-data/safety-checklist-company-operational-v2.json";
import {
  SAFETY_CHECKLIST_V1,
  SAFETY_CHECKLIST_V1_HASH,
} from "./checklist-v1";
import type { SafetyConstructionType } from "./types";

export type SafetyOperationalChecklistItem = {
  code: string;
  normalizedLabel: string;
  sortOrder: number;
  constructionTypes: SafetyConstructionType[];
  requiresFindingWhenFail: boolean;
  isRequired: boolean;
  isScored: boolean;
  sourceItemCodes: string[];
  reportCategoryCodes: string[];
};

export type SafetyReportCategoryDefinition = {
  code: string;
  sourceNumber: number;
  sourceText: string;
  normalizedLabel: string;
  sortOrder: number;
  requiresBusinessClarification: boolean;
  blocksCompletion: boolean;
  isScored: boolean;
  mappingItemCodes: string[];
};

export type SafetyOperationalChecklistDefinition = {
  code: string;
  version: number;
  name: string;
  effectiveFrom: string;
  sourceChecklistHash: string;
  sections: Array<{
    code: string;
    title: string;
    sortOrder: number;
    items: SafetyOperationalChecklistItem[];
  }>;
  reportCategories: SafetyReportCategoryDefinition[];
};

export const SAFETY_OPERATIONAL_CHECKLIST_V2 =
  rawDefinition as SafetyOperationalChecklistDefinition;

export const SAFETY_OPERATIONAL_CHECKLIST_V2_HASH =
  "30d9e389f74677bfc9592b2fc32799f6fccd80ceca397a98d0e90cf937d18c54";

export function hashSafetyOperationalChecklistDefinition(
  definition: SafetyOperationalChecklistDefinition,
): string {
  return createHash("sha256")
    .update(JSON.stringify(definition), "utf8")
    .digest("hex");
}

const V1_ITEMS = SAFETY_CHECKLIST_V1.sections.flatMap((section) =>
  section.items.map((item) => ({ ...item, sectionCode: section.code })),
);

export function getSafetyV1SourceItem(code: string) {
  return V1_ITEMS.find((item) => item.code === code) ?? null;
}

export function analyzeOperationalChecklistV2(): {
  planSourceCount: number;
  missingPlanSourceCodes: string[];
  unknownSourceCodes: string[];
  reportCategoryNumbers: number[];
  duplicateOperationalConcepts: string[];
} {
  const operationalItems =
    SAFETY_OPERATIONAL_CHECKLIST_V2.sections.flatMap(
      (section) => section.items,
    );
  const sourceCodes = new Set(
    operationalItems.flatMap((item) => item.sourceItemCodes),
  );
  const knownCodes = new Set(V1_ITEMS.map((item) => item.code));
  const planCodes = V1_ITEMS.filter(
    (item) => item.sourceDocument === "WEEKLY_PLAN",
  ).map((item) => item.code);
  const labels = new Map<string, number>();
  for (const item of operationalItems) {
    const key = item.normalizedLabel.trim().toLocaleLowerCase("vi");
    labels.set(key, (labels.get(key) ?? 0) + 1);
  }
  return {
    planSourceCount: planCodes.length,
    missingPlanSourceCodes: planCodes.filter((code) => !sourceCodes.has(code)),
    unknownSourceCodes: [...sourceCodes].filter(
      (code) => !knownCodes.has(code),
    ),
    reportCategoryNumbers: SAFETY_OPERATIONAL_CHECKLIST_V2.reportCategories
      .map((category) => category.sourceNumber)
      .sort((a, b) => a - b),
    duplicateOperationalConcepts: [...labels.entries()]
      .filter(([, count]) => count > 1)
      .map(([label]) => label),
  };
}

export function assertSafetyOperationalChecklistV2Canonical(): void {
  if (
    SAFETY_OPERATIONAL_CHECKLIST_V2.sourceChecklistHash !==
    SAFETY_CHECKLIST_V1_HASH
  ) {
    throw new Error(
      "Checklist operational V2 không còn truy nguyên đúng checklist nguồn V1 đã khóa.",
    );
  }
  if (
    hashSafetyOperationalChecklistDefinition(
      SAFETY_OPERATIONAL_CHECKLIST_V2,
    ) !== SAFETY_OPERATIONAL_CHECKLIST_V2_HASH
  ) {
    throw new Error(
      "Checklist operational V2 không khớp SHA-256 canonical.",
    );
  }
  const analysis = analyzeOperationalChecklistV2();
  if (
    analysis.planSourceCount !== 55 ||
    analysis.missingPlanSourceCodes.length > 0 ||
    analysis.unknownSourceCodes.length > 0 ||
    analysis.duplicateOperationalConcepts.length > 0 ||
    analysis.reportCategoryNumbers.join(",") !==
      Array.from({ length: 20 }, (_, index) => index + 1).join(",")
  ) {
    throw new Error(
      "Checklist operational V2 không bảo toàn đầy đủ nguồn hoặc còn trùng ngữ nghĩa.",
    );
  }
}
