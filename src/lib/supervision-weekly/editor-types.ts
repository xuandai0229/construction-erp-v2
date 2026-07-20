export type WeeklyDocumentType = "RESULT" | "NEXT_WEEK_PLAN";
export type WeeklyShift = "MORNING" | "AFTERNOON" | "EVENING";
export type WeeklyInputMode = "PROJECT_WORK_ITEM" | "PROJECT_MANUAL_ITEM" | "MANUAL_TEXT";

export type WeeklyProject = { id: string; code: string; name: string; location: string | null; status: string };
export type WeeklySource = {
  id?: string;
  clientKey?: string;
  projectId: string | null;
  projectNameSnapshot: string | null;
  locationId: string | null;
  locationNameSnapshot: string | null;
  workItemId: string | null;
  workItemNameSnapshot: string | null;
  manualText: string | null;
  manualLocation: string | null;
  manualProjectName: string | null;
  manualWorkItemName: string | null;
  categoryItemId: string | null;
  categoryNameSnapshot: string | null;
  manualCategoryName: string | null;
  displayText: string;
};

export type WeeklyEntry = WeeklySource & {
  id?: string;
  documentType: WeeklyDocumentType;
  entryDate: string;
  shift: WeeklyShift;
  sortOrder: number;
  inputMode: WeeklyInputMode;
  inspectionWorkItemId: string | null;
  inspectionWorkNameSnapshot: string | null;
  inspectionContent: string | null;
  result: string | null;
  commanderProposal: string | null;
};

export type WeeklyShiftSelection = {
  documentType: WeeklyDocumentType;
  entryDate: string;
  shift: WeeklyShift;
};

export type WeeklyObservation = Omit<WeeklySource, "displayText"> & {
  id?: string;
  displayText: string | null;
  documentType: WeeklyDocumentType;
  category: string;
  sortOrder: number;
  content: string;
};

export type WeeklyTransition = WeeklySource & {
  id?: string;
  sortOrder: number;
  reportedQuantity: number | null;
  reportedText: string | null;
  reportedRaw: string | null;
  reportedUnit: string | null;
  reportedUnitCode: string | null;
  verifiedQuantity: number | null;
  verifiedText: string | null;
  verifiedRaw: string | null;
  verifiedUnit: string | null;
  verifiedUnitCode: string | null;
  verificationMode: string | null;
  varianceReason: string | null;
  plannedProgress: string | null;
  currentStep: string | null;
  proposedStep: string | null;
  conclusion: string | null;
};

export type WeeklyQuantity = WeeklySource & {
  id?: string;
  sortOrder: number;
  unit: string | null;
  unitCode: string | null;
  reportedRaw: string | null;
  reportedText: string | null;
  reportedUnit: string | null;
  reportedUnitCode: string | null;
  reportedQuantity: number | null;
  verifiedRaw: string | null;
  verifiedText: string | null;
  verifiedUnit: string | null;
  verifiedUnitCode: string | null;
  verifiedQuantity: number | null;
  verificationMode: string | null;
  varianceReason: string | null;
  plannedProgress: string | null;
  conclusion: string | null;
};

export type WeeklyProgress = WeeklySource & {
  id?: string;
  sortOrder: number;
  plannedProgress: string | null;
  actualProgress: string | null;
  delayValue: number | null;
  delayType: "DAY" | "PERCENT" | null;
  delayReason: string | null;
};

export type WeeklyEditorDossier = {
  id: string;
  reportNumber: string | null;
  weekStart: string;
  weekEnd: string;
  nextWeekStart: string;
  nextWeekEnd: string;
  place: string | null;
  recipientName: string | null;
  recipientTitle: string | null;
  authorName: string;
  status: string;
  version: number;
  lockVersion: number;
  entries: WeeklyEntry[];
  shiftSelections: WeeklyShiftSelection[];
  observations: WeeklyObservation[];
  transitions: WeeklyTransition[];
  quantities: WeeklyQuantity[];
  progressRows: WeeklyProgress[];
};
