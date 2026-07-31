import { formatVnDate, formatVnPeriod, getWeekRange, formatIsoDateOnly, normalizeNfc } from './date-utils';
import { SAFETY_ASSESSMENT_OFFICIAL_CONTENT } from './safety-assessment-official-content';

export interface SafetyAssessmentEntryViewModel {
  id: string;
  inspectionDate: string; // YYYY-MM-DD
  shift: 'MORNING' | 'AFTERNOON' | 'EVENING';
  shiftLabel: string;
  projectId?: string | null;
  projectName: string;
  customProjectName?: string | null;
  inspectionContent: string;
  assessment: string;
  recommendation: string;
  implementationResult: string;
  sortOrder: number;
}

export interface SafetyAssessmentDayViewModel {
  dayName: string; // e.g. "Thứ Hai"
  dateIso: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. "27/07/2026"
  shifts: Array<{
    shiftKey: 'MORNING' | 'AFTERNOON' | 'EVENING';
    shiftLabel: string;
    entries: SafetyAssessmentEntryViewModel[];
  }>;
}

export interface SafetyAssessmentOutputModel {
  id: string;
  internalCode: string; // documentNumber or fallback
  officialDocumentNumber: string; // e.g. "……/……"
  documentPlace: string; // e.g. "Hà Nội"
  documentDate: Date;
  documentDateFormatted: string; // e.g. "ngày 31 tháng 07 năm 2026"
  periodStart: Date;
  periodEnd: Date;
  periodStartFormatted: string;
  periodEndFormatted: string;
  periodLabel: string;
  recipientText: string;
  recipientsList: string[];
  reporterName: string;
  reporterTitle: string;
  reporterDepartment: string;
  sourcePlanId?: string | null;
  sourcePlanNumber?: string | null;
  internalNote: string;
  
  // Section I & II
  previousWeekRemediation: string;
  reinspectionConfirmation: string;
  managementRecommendation: string;
  otherOpinion: string;
  
  // Structured Matrix Data (7 days, 3 shifts per day)
  days: SafetyAssessmentDayViewModel[];
  flatEntries: SafetyAssessmentEntryViewModel[];
  
  // Flat Physical Rows for 5-Column Table Rendering
  tableRows: Array<{
    id: string;
    dayName?: string;
    dateFormatted?: string;
    shiftLabel?: string;
    projectName: string;
    inspectionContent: string;
    assessment: string;
    recommendation: string;
    implementationResult: string;
    isFirstRowOfDay?: boolean;
    isFirstRowOfShift?: boolean;
  }>;
}

const SHIFT_LABELS: Record<string, string> = {
  MORNING: 'Sáng',
  AFTERNOON: 'Chiều',
  EVENING: 'Tối',
};

const DAY_NAMES = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

export function buildSafetyAssessmentOutputModel(report: any): SafetyAssessmentOutputModel {
  const periodStart = report.periodStart ? new Date(report.periodStart) : new Date();
  const { weekStart, weekEnd } = getWeekRange(periodStart);
  
  const officialDocumentNumber = normalizeNfc(report.officialDocumentNumber || '');
  const internalCode = report.documentNumber || `BC-ATLD-${periodStart.getFullYear()}-0001`;
  const documentPlace = normalizeNfc(report.documentPlace || 'Hà Nội');
  const docDate = report.documentDate ? new Date(report.documentDate) : (report.createdDate ? new Date(report.createdDate) : new Date());
  
  const recipientText = normalizeNfc(report.recipientText || 'Ban Giám đốc Công ty; Phòng kỹ thuật');
  const recipientsList = recipientText.split(';').map(r => r.trim()).filter(Boolean);

  const reporterName = normalizeNfc(report.reporterName || report.createdBy?.name || SAFETY_ASSESSMENT_OFFICIAL_CONTENT.defaultReporter.name);
  const reporterTitle = normalizeNfc(report.reporterTitle || SAFETY_ASSESSMENT_OFFICIAL_CONTENT.defaultReporter.title);
  const reporterDepartment = normalizeNfc(report.reporterDepartment || SAFETY_ASSESSMENT_OFFICIAL_CONTENT.defaultReporter.department);

  const rawEntries = report.entries || [];
  
  // Build 7 days (Mon -> Sun)
  const days: SafetyAssessmentDayViewModel[] = DAY_NAMES.map((dayName, index) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    const dateIso = formatIsoDateOnly(d);
    const dateFormatted = formatVnDate(d);

    const shifts = (['MORNING', 'AFTERNOON', 'EVENING'] as const).map((shiftKey) => {
      const shiftEntries = rawEntries
        .filter((e: any) => formatIsoDateOnly(new Date(e.inspectionDate)) === dateIso && e.shift === shiftKey)
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((e: any) => {
          const projName = e.customProjectName || e.projectNameSnapshot || e.project?.name || '';
          return {
            id: e.id,
            inspectionDate: dateIso,
            shift: shiftKey,
            shiftLabel: SHIFT_LABELS[shiftKey],
            projectId: e.projectId || null,
            projectName: normalizeNfc(projName),
            customProjectName: e.customProjectName ? normalizeNfc(e.customProjectName) : null,
            inspectionContent: normalizeNfc(e.inspectionContent || ''),
            assessment: normalizeNfc(e.assessment || ''),
            recommendation: normalizeNfc(e.recommendation || ''),
            implementationResult: normalizeNfc(e.implementationResult || ''),
            sortOrder: e.sortOrder ?? 0,
          };
        });

      return {
        shiftKey,
        shiftLabel: SHIFT_LABELS[shiftKey],
        entries: shiftEntries,
      };
    });

    return {
      dayName,
      dateIso,
      dateFormatted,
      shifts,
    };
  });

  const flatEntries: SafetyAssessmentEntryViewModel[] = days.flatMap(d => d.shifts.flatMap(s => s.entries));

  // Build physical table rows for official 5-column table
  const tableRows: SafetyAssessmentOutputModel['tableRows'] = [];

  days.forEach((day) => {
    let dayRowIndex = 0;
    day.shifts.forEach((shift) => {
      if (shift.entries.length === 0) {
        // Render empty shift row to preserve Mon-Sun Sáng/Chiều/Tối structure
        tableRows.push({
          id: `empty-${day.dateIso}-${shift.shiftKey}`,
          dayName: dayRowIndex === 0 ? day.dayName : undefined,
          dateFormatted: dayRowIndex === 0 ? day.dateFormatted : undefined,
          shiftLabel: shift.shiftLabel,
          projectName: '',
          inspectionContent: '',
          assessment: '',
          recommendation: '',
          implementationResult: '',
          isFirstRowOfDay: dayRowIndex === 0,
          isFirstRowOfShift: true,
        });
        dayRowIndex++;
      } else {
        shift.entries.forEach((entry, entryIndex) => {
          tableRows.push({
            id: entry.id,
            dayName: dayRowIndex === 0 ? day.dayName : undefined,
            dateFormatted: dayRowIndex === 0 ? day.dateFormatted : undefined,
            shiftLabel: entryIndex === 0 ? shift.shiftLabel : undefined,
            projectName: entry.projectName,
            inspectionContent: entry.inspectionContent,
            assessment: entry.assessment,
            recommendation: entry.recommendation,
            implementationResult: entry.implementationResult,
            isFirstRowOfDay: dayRowIndex === 0,
            isFirstRowOfShift: entryIndex === 0,
          });
          dayRowIndex++;
        });
      }
    });
  });

  return {
    id: report.id,
    internalCode,
    officialDocumentNumber,
    documentPlace,
    documentDate: docDate,
    documentDateFormatted: `ngày ${docDate.getDate()} tháng ${docDate.getMonth() + 1} năm ${docDate.getFullYear()}`,
    periodStart: weekStart,
    periodEnd: weekEnd,
    periodStartFormatted: formatVnDate(weekStart),
    periodEndFormatted: formatVnDate(weekEnd),
    periodLabel: formatVnPeriod(weekStart, weekEnd),
    recipientText,
    recipientsList,
    reporterName,
    reporterTitle,
    reporterDepartment,
    sourcePlanId: report.sourcePlanId || null,
    sourcePlanNumber: report.sourcePlan?.documentNumber || report.sourcePlan?.title || null,
    internalNote: normalizeNfc(report.internalNote || ''),
    previousWeekRemediation: normalizeNfc(report.previousWeekRemediation || ''),
    reinspectionConfirmation: normalizeNfc(report.reinspectionConfirmation || ''),
    managementRecommendation: normalizeNfc(report.managementRecommendation || report.managementResourceRecommendation || ''),
    otherOpinion: normalizeNfc(report.otherOpinion || report.otherRecommendation || ''),
    days,
    flatEntries,
    tableRows,
  };
}
