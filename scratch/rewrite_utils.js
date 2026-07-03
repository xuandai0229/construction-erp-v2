const fs = require("fs"); 
const code = `export type WeeklyGeneralNote = {
  version: 1;
  weeklyAssessment?: {
    progressStatus?: "ON_TRACK" | "DELAYED" | "AHEAD" | "WATCHING";
    qualityStatus?: "PASSED" | "FAILED" | "NEED_RECHECK";
    safetyStatus?: "SAFE" | "INCIDENT" | "RISK";
    overallNote?: string;
  };
  performedWorkOverrides?: {
    sourceLineId: string;
    resultStatus?: "PASSED" | "FAILED" | "WATCHING";
    reviewNote?: string;
    issueNote?: string;
  }[];
  nextWeekPlanRange?: {
    fromDate?: string;
    toDate?: string;
  };
  nextWeekPlanGroups?: {
    categoryId?: string;
    categoryName?: string;
    items: {
      workItemId?: string;
      workContent: string;
      plannedStartDate?: string;
      plannedEndDate?: string;
      plannedQuantity?: number;
      unit?: string;
      resources?: string;
      materials?: string;
      ownerName?: string;
      qualitySafetyRequirement?: string;
      acceptanceCriteria?: string;
      riskNote?: string;
      priority?: "HIGH" | "MEDIUM" | "LOW";
    }[];
  }[];
  legacyNote?: string;
};

export function getDefaultWeeklyGeneralNote(): WeeklyGeneralNote {
  return { version: 1 };
}

export function parseWeeklyGeneralNote(noteStr: string | null | undefined): WeeklyGeneralNote {
  if (!noteStr) return getDefaultWeeklyGeneralNote();
  try {
    const parsed = JSON.parse(noteStr);
    if (parsed && typeof parsed === "object" && parsed.version === 1) {
      return parsed as WeeklyGeneralNote;
    }
    // Handle legacy unstructured nextWeekPlans logic or plain string
    const fallback = getDefaultWeeklyGeneralNote();
    if (parsed && typeof parsed === "object") {
      fallback.legacyNote = noteStr;
      if (parsed.nextWeekPlans && Array.isArray(parsed.nextWeekPlans)) {
        fallback.nextWeekPlanGroups = [
          {
            categoryId: "default",
            categoryName: "Chua phân h?ng m?c",
            items: parsed.nextWeekPlans.map((p: any) => ({
              workItemId: p.wbsItemId || undefined,
              workContent: p.workContent || "Không rõ",
              plannedQuantity: p.plannedQuantity ? Number(p.plannedQuantity) : undefined,
              unit: p.unit || undefined,
              resources: p.resources || undefined,
            })),
          }
        ];
      }
      if (parsed.nextWeekStartDate || parsed.nextWeekEndDate) {
        fallback.nextWeekPlanRange = {
          fromDate: parsed.nextWeekStartDate,
          toDate: parsed.nextWeekEndDate
        };
      }
    } else {
      fallback.legacyNote = noteStr;
    }
    return fallback;
  } catch (e) {
    const fallback = getDefaultWeeklyGeneralNote();
    fallback.legacyNote = noteStr;
    return fallback;
  }
}

export function serializeWeeklyGeneralNote(note: WeeklyGeneralNote): string {
  return JSON.stringify(note);
}
`;
fs.writeFileSync("src/lib/reports/weekly-report-utils.ts", code, "utf8");

