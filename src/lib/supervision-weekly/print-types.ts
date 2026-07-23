import type { WeeklyDocumentType, WeeklyShift, WeeklyObservation, WeeklyTransition, WeeklyQuantity, WeeklyProgress } from "./editor-types";

export type PrintEntryDto = {
  id: string;
  documentType: WeeklyDocumentType;
  entryDate: string;
  shift: WeeklyShift;
  sortOrder: number;
  inspectionContent: string | null;
  result: string | null;
  commanderProposal: string | null;
  projectNameSnapshot: string | null;
  locationNameSnapshot: string | null;
  workItemNameSnapshot: string | null;
  manualText: string | null;
  manualLocation: string | null;
  manualProjectName: string | null;
  manualWorkItemName: string | null;
  categoryNameSnapshot: string | null;
  manualCategoryName: string | null;
};

export type SupervisionWeeklyPrintDto = {
  id: string;
  reportNumber: string | null;
  weekStart: string;
  weekEnd: string;
  nextWeekStart: string;
  nextWeekEnd: string;
  place: string | null;
  recipientName: string | null;
  recipientTitle: string | null;
  
  creator: {
    id: string;
    name: string;
  } | null;

  entries: PrintEntryDto[];
  observations: WeeklyObservation[];
  transitions: WeeklyTransition[];
  quantities: WeeklyQuantity[];
  progressRows: WeeklyProgress[];
};
