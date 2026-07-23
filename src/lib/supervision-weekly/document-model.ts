import { addDays, format, parseISO } from "date-fns";
import type { SupervisionWeeklyPrintDto, PrintEntryDto } from "./print-types";
import { formatSupervisionSourceLines } from "./source-formatter";
import type { WeeklyObservation, WeeklyProgress, WeeklyQuantity, WeeklyTransition, WeeklyDocumentType, WeeklyShift } from "./editor-types";
import { calculateSupervisionQuantityVariance } from "./quantity";
import { formatReportNumber } from "./report-number";

export function isMeaningfulSupervisionRow(row: any) {
  if (row.projectId || row.projectNameSnapshot || row.manualProjectName) return true;
  if (row.workItemId || row.workItemNameSnapshot || row.manualWorkItemName) return true;
  if (row.categoryId || row.categoryNameSnapshot || row.manualCategoryName) return true;
  if (row.locationId || row.locationNameSnapshot || row.manualLocation) return true;
  if (row.inspectionContent?.trim() || row.result?.trim() || row.commanderProposal?.trim()) return true;
  if (row.reportedQuantity != null || row.verifiedQuantity != null || row.reportedText?.trim() || row.verifiedText?.trim()) return true;
  if (row.plannedProgress?.trim() || row.actualProgress?.trim() || row.delayReason?.trim() || row.varianceReason?.trim()) return true;
  return false;
}

export type WeeklyInspectionDocumentRow = {
  id: string;
  sourceText: string;
  content: string;
  result: string;
};

export type WeeklyResultDay = {
  date: string;
  weekdayLabel: string;
  shifts: {
    MORNING: WeeklyInspectionDocumentRow[];
    AFTERNOON: WeeklyInspectionDocumentRow[];
    EVENING: WeeklyInspectionDocumentRow[];
  };
};

export type WeeklyTransitionDocumentRow = {
  id: string;
  sourceText: string;
  reportedText: string;
  verifiedText: string;
  varianceText: string; // Calculated variance if needed, otherwise empty
  plannedProgress: string;
};

export type WeeklyQuantityDocumentRow = {
  id: string;
  sourceText: string;
  reportedText: string;
  verifiedText: string;
  varianceText: string;
};

export type WeeklyProgressDocumentRow = {
  id: string;
  sourceText: string;
  plannedProgress: string;
  actualProgress: string;
  delayReason: string;
};

export type FixedRecommendationSection = {
  order: number;
  key: string;
  title: string;
  content: string;
  isEmpty: boolean;
};

export type WeeklyDocumentModel = {
  metadata: {
    dossierId: string;
    companyName: string;
    companySubName: string;
    nationalMottoLine1: string;
    nationalMottoLine2: string;
    reportNumber: string;
    place: string;
    issueDate: string;
    weekStart: string;
    weekEnd: string;
    recipientName: string;
    recipientTitle: string;
    creatorName: string;
    title: string;
  };
  schedule: WeeklyResultDay[];
  transitionRows: WeeklyTransitionDocumentRow[];
  quantityRows: WeeklyQuantityDocumentRow[];
  progressRows: WeeklyProgressDocumentRow[];
  observations: WeeklyObservation[];
  followUps: FixedRecommendationSection[];
  recommendations: FixedRecommendationSection[];
};

function formatVietnameseDate(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const WEEKDAY_LABELS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export const NEXT_WEEK_PLAN_GROUP_2_CATEGORIES = [
  { order: 1 as const, key: "FOLLOW_UP_PENDING" as const, title: "Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng", category: "Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng" },
  { order: 2 as const, key: "RECHECK_COMPLETED" as const, title: "Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành", category: "Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành" },
];

export const NEXT_WEEK_PLAN_GROUP_3_CATEGORIES = [
  { order: 1 as const, key: "RESOURCE_REPLACEMENT" as const, title: "Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật", category: "Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật" },
  { order: 2 as const, key: "PROGRESS_DIRECTION" as const, title: "Chỉ đạo tiến độ các đội chưa đạt yêu cầu, chậm tiến độ, thi công chưa đạt chất lượng", category: "Chỉ đạo tiến độ các đội chưa đạt yêu cầu, chậm tiến độ, thi công chưa đạt chất lượng" },
  { order: 3 as const, key: "TECHNICAL_MATERIAL" as const, title: "Xử lý phát sinh kỹ thuật, phát sinh vật liệu", category: "Xử lý phát sinh kỹ thuật, phát sinh vật liệu" },
  { order: 4 as const, key: "OTHER" as const, title: "Ý kiến khác", category: "Ý kiến khác" },
];

export function buildWeeklyDocumentModel(dossier: SupervisionWeeklyPrintDto, documentType: WeeklyDocumentType): WeeklyDocumentModel {
  const isResult = documentType === "RESULT";
  
  // Safe extraction
  const creatorName = dossier.creator?.name?.trim() || "........................";
  const start = isResult ? dossier.weekStart : dossier.nextWeekStart;
  const end = isResult ? dossier.weekEnd : dossier.nextWeekEnd;
  const parseLocalDate = (dateStr?: string) => {
    if (!dateStr || !dateStr.includes("-")) return new Date();
    const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const parsedStart = parseLocalDate(start);
  const model: WeeklyDocumentModel = {
    metadata: {
      dossierId: dossier.id,
      companyName: "CÔNG TY CỔ PHẦN XÂY DỰNG",
      companySubName: "VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI",
      nationalMottoLine1: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      nationalMottoLine2: "Độc lập - Tự do - Hạnh phúc",
      reportNumber: formatReportNumber(dossier.reportNumber),
      place: dossier.place || "Hà Nội",
      issueDate: formatVietnameseDate(new Date().toISOString()),
      weekStart: formatVietnameseDate(start),
      weekEnd: formatVietnameseDate(end),
      recipientName: dossier.recipientName || "Ban lãnh đạo công ty",
      recipientTitle: dossier.recipientTitle || "Tổng Giám đốc",
      creatorName: creatorName,
      title: isResult ? "BÁO CÁO KẾT QUẢ TUẦN" : "KẾ HOẠCH TUẦN TIẾP THEO",
    },
    schedule: [],
    transitionRows: [],
    quantityRows: [],
    progressRows: [],
    observations: (Array.isArray(dossier.observations) ? dossier.observations : []).filter(o => o.documentType === documentType),
    followUps: [],
    recommendations: [],
  };

  // Build Schedule: Generate exactly 7 days
  const activeEntries = (Array.isArray(dossier.entries) ? dossier.entries : []).filter(e => e.documentType === documentType);
  
  for (let i = 0; i < 7; i++) {
    const currentDay = addDays(parsedStart, i);
    const dateStr = format(currentDay, "yyyy-MM-dd");
    const label = WEEKDAY_LABELS[currentDay.getDay()];

    const dayEntries = activeEntries.filter(e => e.entryDate.startsWith(dateStr));
    
    const parseShift = (shiftType: WeeklyShift): WeeklyInspectionDocumentRow[] => {
      const shiftEntries = dayEntries.filter(e => e.shift === shiftType).sort((a, b) => {
        if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (a.id && b.id) return a.id.localeCompare(b.id);
        return 0;
      });
      const validRows: WeeklyInspectionDocumentRow[] = [];
      
      for (const e of shiftEntries) {
        const source = formatSupervisionSourceLines(e);
        let sourceText = "";
        if (source.projectLine) {
          sourceText += `Công trình: ${source.projectLine}`;
        }
        if (source.categoryLine) {
          if (sourceText) sourceText += "\n";
          sourceText += `Hạng mục: ${source.categoryLine}`;
        }
        
        // If entirely empty row, skip rendering it as a data row
        if (!isMeaningfulSupervisionRow(e)) {
          continue;
        }

        validRows.push({
          id: e.id || Math.random().toString(),
          sourceText: sourceText,
          content: (isResult ? e.inspectionContent : e.commanderProposal) || "",
          result: (isResult ? e.result : (e.inspectionContent || e.result)) || "",
        });
      }
      return validRows;
    };

    model.schedule.push({
      date: dateStr,
      weekdayLabel: label,
      shifts: {
        MORNING: parseShift("MORNING"),
        AFTERNOON: parseShift("AFTERNOON"),
        EVENING: parseShift("EVENING"),
      }
    });
  }

  // Helper for source text formatting
  const getSourceText = (row: any) => {
    const source = formatSupervisionSourceLines(row);
    let sourceText = "";
    if (source.projectLine) sourceText += `Công trình: ${source.projectLine}`;
    if (source.categoryLine) {
      if (sourceText) sourceText += "\n";
      sourceText += `Hạng mục: ${source.categoryLine}`;
    }
    return sourceText;
  };

  if (isResult) {
    const progressSource = Array.isArray(dossier.progressRows) ? dossier.progressRows.filter(isMeaningfulSupervisionRow) : [];
    model.progressRows = progressSource.map(r => {
      const isDelayed = r.delayValue != null || r.delayType != null;
      let actualText = r.actualProgress || "";
      if (isDelayed) {
         const delayTypeLabel = r.delayType === "PERCENT" ? "%" : "ngày";
         if (actualText) actualText += "\n";
         actualText += `Trạng thái: Chậm tiến độ\nMức chậm: ${r.delayValue || 0} ${delayTypeLabel}`;
      } else if (r.actualProgress || r.plannedProgress) { // show status if there is progress recorded
         if (actualText) actualText += "\n";
         actualText += `Trạng thái: Đúng tiến độ`;
      }
      return {
        id: r.id || Math.random().toString(),
        sourceText: getSourceText(r),
        plannedProgress: r.plannedProgress || "",
        actualProgress: actualText,
        delayReason: r.delayReason || "",
      };
    });

    const transitionSource = Array.isArray(dossier.transitions) ? dossier.transitions.filter(isMeaningfulSupervisionRow) : [];
    model.transitionRows = transitionSource.map(r => {
      const reportedUnit = r.reportedUnit || "";
      const reportedCode = r.reportedUnitCode || "";
      const reportedTextVal = `${r.reportedQuantity ?? ""} ${reportedUnit}`.trim();
      const verifiedTextVal = `${r.verifiedQuantity ?? ""} ${r.verifiedUnit || ""}`.trim();
      const varResult = calculateSupervisionQuantityVariance(r.reportedQuantity, r.verifiedQuantity, reportedTextVal, verifiedTextVal, reportedCode, reportedUnit, r.varianceReason);
      return {
        id: r.id || Math.random().toString(),
        sourceText: getSourceText(r),
        reportedText: reportedTextVal,
        verifiedText: verifiedTextVal,
        varianceText: varResult.displayText,
        plannedProgress: r.plannedProgress || "",
      };
    });

    const quantitySource = Array.isArray(dossier.quantities) ? dossier.quantities.filter(isMeaningfulSupervisionRow) : [];
    model.quantityRows = quantitySource.map(r => {
      const reportedUnit = r.reportedUnit || r.unit || "";
      const reportedCode = r.reportedUnitCode || r.unitCode || "";
      const reportedTextVal = `${r.reportedQuantity ?? ""} ${reportedUnit}`.trim();
      const verifiedTextVal = `${r.verifiedQuantity ?? ""} ${r.verifiedUnit || r.unit || ""}`.trim();
      const varResult = calculateSupervisionQuantityVariance(r.reportedQuantity, r.verifiedQuantity, reportedTextVal, verifiedTextVal, reportedCode, reportedUnit, r.varianceReason);
      return {
        id: r.id || Math.random().toString(),
        sourceText: getSourceText(r),
        reportedText: reportedTextVal,
        verifiedText: verifiedTextVal,
        varianceText: varResult.displayText,
      };
    });
  }

  // Map Follow Ups (Mục II)
  model.followUps = NEXT_WEEK_PLAN_GROUP_2_CATEGORIES.map(g => {
    const note = model.observations.find(o => o.category === g.category);
    const content = note?.content?.trim() || "";
    return {
      order: g.order,
      key: g.key,
      title: g.title,
      content,
      isEmpty: !content,
    };
  });

  // Map FixedRecommendationSection (Mục III)
  model.recommendations = NEXT_WEEK_PLAN_GROUP_3_CATEGORIES.map(g => {
    const note = model.observations.find(o => o.category === g.category);
    const content = note?.content?.trim() || "";
    return {
      order: g.order,
      key: g.key,
      title: g.title,
      content,
      isEmpty: !content,
    };
  });

  return model;
}
