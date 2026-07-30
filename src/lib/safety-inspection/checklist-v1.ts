import { createHash } from "node:crypto";
import rawDefinition from "../../../prisma/reference-data/safety-checklist-company-v1.json";
import type { SafetyConstructionType } from "./types";

export type SafetyChecklistSourceDocument =
  | "WEEKLY_PLAN"
  | "WEEKLY_REPORT";

export type SafetyChecklistCanonicalItem = {
  code: string;
  sourceText: string;
  normalizedLabel: string;
  sortOrder: number;
  constructionTypes: SafetyConstructionType[];
  requiresFindingWhenFail: boolean;
  sourceDocument: SafetyChecklistSourceDocument;
  sourceReference: string;
  reportItemNumbers: number[];
};

export type SafetyChecklistCanonicalSection = {
  code: string;
  title: string;
  sortOrder: number;
  constructionTypes: SafetyConstructionType[];
  items: SafetyChecklistCanonicalItem[];
};

export type SafetyChecklistCanonicalDefinition = {
  code: string;
  version: number;
  name: string;
  effectiveFrom: string;
  sections: SafetyChecklistCanonicalSection[];
};

export const SAFETY_CHECKLIST_V1 =
  rawDefinition as SafetyChecklistCanonicalDefinition;

export const SAFETY_CHECKLIST_V1_HASH =
  "93d6ceb42aab613effe277aaf78b5552b3616609e70465d7364bd81c99554470";

export function hashSafetyChecklistDefinition(
  definition: SafetyChecklistCanonicalDefinition,
): string {
  return createHash("sha256")
    .update(JSON.stringify(definition), "utf8")
    .digest("hex");
}

export function assertSafetyChecklistV1Canonical(): void {
  const actualHash = hashSafetyChecklistDefinition(SAFETY_CHECKLIST_V1);
  if (actualHash !== SAFETY_CHECKLIST_V1_HASH) {
    throw new Error(
      "Dữ liệu checklist V1 không khớp SHA-256 canonical; đã dừng để tránh sửa âm thầm template khóa.",
    );
  }
}
