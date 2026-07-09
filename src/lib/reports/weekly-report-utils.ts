export type WeeklyGeneralNote = {
  version: 2;
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
  nextWeekPlan?: {
    fieldProgressItemId: string;
    workContent: string;
    unit?: string;
    remainingQuantity?: number;
    plannedQuantityNextWeek?: number;
    plannedStartDate?: string;
    plannedEndDate?: string;
    constructionCrew?: string;
    materialNeeds?: string;
    equipmentNeeds?: string;
    riskNote?: string;
    note?: string;
  }[];
  legacyNote?: string;
};

export function getDefaultWeeklyGeneralNote(): WeeklyGeneralNote {
  return { version: 2 };
}

export function parseWeeklyGeneralNote(noteStr: string | null | undefined): WeeklyGeneralNote {
  if (!noteStr) return getDefaultWeeklyGeneralNote();
  try {
    const parsed = JSON.parse(noteStr);
    if (parsed && typeof parsed === "object") {
      if (parsed.version === 2) {
        return parsed as WeeklyGeneralNote;
      }
      
      // Upgrade from version 1 or unstructured
      const fallback = getDefaultWeeklyGeneralNote();
      if (parsed.version === 1) {
        fallback.weeklyAssessment = parsed.weeklyAssessment;
        fallback.performedWorkOverrides = parsed.performedWorkOverrides;
        fallback.nextWeekPlanRange = parsed.nextWeekPlanRange;
        fallback.legacyNote = parsed.legacyNote;
        
        if (parsed.nextWeekPlanGroups && Array.isArray(parsed.nextWeekPlanGroups)) {
          const flatPlan: WeeklyGeneralNote['nextWeekPlan'] = [];
          for (const g of parsed.nextWeekPlanGroups) {
            if (g.items && Array.isArray(g.items)) {
              for (const i of g.items) {
                flatPlan.push({
                  fieldProgressItemId: i.workItemId || "",
                  workContent: i.workContent || "Không rõ",
                  unit: i.unit,
                  plannedQuantityNextWeek: Number(i.plannedQuantity || 0),
                  plannedStartDate: i.plannedStartDate,
                  plannedEndDate: i.plannedEndDate,
                  constructionCrew: i.ownerName,
                  materialNeeds: i.materials,
                  equipmentNeeds: i.resources,
                  riskNote: i.riskNote,
                });
              }
            }
          }
          fallback.nextWeekPlan = flatPlan;
        }
      } else {
        fallback.legacyNote = noteStr;
      }
      return fallback;
    }
    
    const fallback = getDefaultWeeklyGeneralNote();
    fallback.legacyNote = noteStr;
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

export function assertWeeklyResultDateAllowed(params: {
  weekStartDateStr?: string;
  hasActualLines: boolean;
}) {
  if (!params.weekStartDateStr) return;
  const tzOffset = 7 * 60 * 60 * 1000;
  const todayVnStr = new Date(Date.now() + tzOffset).toISOString().split("T")[0];
  const inputWeekStartStr = params.weekStartDateStr.split("T")[0];
  if (inputWeekStartStr > todayVnStr && params.hasActualLines) {
    throw new Error("Tuần này chưa xảy ra, chưa có báo cáo ngày để tổng hợp. Bạn chỉ có thể lập kế hoạch tuần tới.");
  }
}
