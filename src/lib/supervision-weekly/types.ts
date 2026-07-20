import { z } from "zod";

const nullableText = z.string().trim().max(8000).optional().nullable();
const nullableNumber = z.number().finite().optional().nullable();

export const supervisionSourceSchema = z.object({
  id: z.string().optional().nullable(),
  clientKey: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  projectNameSnapshot: nullableText,
  locationId: z.string().optional().nullable(),
  locationNameSnapshot: nullableText,
  workItemId: z.string().optional().nullable(),
  workItemNameSnapshot: nullableText,
  manualText: nullableText,
  manualLocation: nullableText,
  manualProjectName: nullableText,
  manualWorkItemName: nullableText,
  categoryItemId: z.string().optional().nullable(),
  categoryNameSnapshot: nullableText,
  manualCategoryName: nullableText,
  displayText: z.string().trim().max(4000),
});

export const supervisionEntrySchema = supervisionSourceSchema.extend({
  id: z.string().optional(),
  documentType: z.enum(["RESULT", "NEXT_WEEK_PLAN"]),
  entryDate: z.string().date(),
  shift: z.enum(["MORNING", "AFTERNOON", "EVENING"]),
  sortOrder: z.number().int().min(0),
  inputMode: z.enum(["PROJECT_WORK_ITEM", "PROJECT_MANUAL_ITEM", "MANUAL_TEXT"]),
  inspectionWorkItemId: z.string().optional().nullable(),
  inspectionWorkNameSnapshot: nullableText,
  inspectionContent: nullableText,
  result: nullableText,
  commanderProposal: nullableText,
});

export const supervisionShiftSelectionSchema = z.object({
  documentType: z.enum(["RESULT", "NEXT_WEEK_PLAN"]),
  entryDate: z.string().date(),
  shift: z.enum(["MORNING", "AFTERNOON", "EVENING"]),
});

export const supervisionObservationSchema = supervisionSourceSchema.extend({
  id: z.string().optional(),
  documentType: z.enum(["RESULT", "NEXT_WEEK_PLAN"]),
  category: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0),
  content: z.string().trim().max(8000),
}).extend({ displayText: nullableText });

export const supervisionQuantitySchema = supervisionSourceSchema.extend({
  id: z.string().optional(),
  sortOrder: z.number().int().min(0),
  unit: z.string().trim().max(50).optional().nullable(),
  unitCode: z.string().trim().max(50).optional().nullable(),
  reportedRaw: nullableText,
  reportedText: nullableText,
  reportedUnit: z.string().trim().max(50).optional().nullable(),
  reportedUnitCode: z.string().trim().max(50).optional().nullable(),
  reportedQuantity: nullableNumber,
  verifiedRaw: nullableText,
  verifiedText: nullableText,
  verifiedUnit: z.string().trim().max(50).optional().nullable(),
  verifiedUnitCode: z.string().trim().max(50).optional().nullable(),
  verifiedQuantity: nullableNumber,
  verificationMode: z.string().trim().max(50).optional().nullable(),
  varianceReason: nullableText,
  plannedProgress: nullableText,
  conclusion: nullableText,
});

export const supervisionTransitionSchema = supervisionSourceSchema.extend({
  id: z.string().optional(),
  sortOrder: z.number().int().min(0),
  reportedQuantity: nullableNumber,
  reportedText: nullableText,
  reportedRaw: nullableText,
  reportedUnit: z.string().trim().max(50).optional().nullable(),
  reportedUnitCode: z.string().trim().max(50).optional().nullable(),
  verifiedQuantity: nullableNumber,
  verifiedText: nullableText,
  verifiedRaw: nullableText,
  verifiedUnit: z.string().trim().max(50).optional().nullable(),
  verifiedUnitCode: z.string().trim().max(50).optional().nullable(),
  verificationMode: z.string().trim().max(50).optional().nullable(),
  varianceReason: nullableText,
  plannedProgress: nullableText,
  currentStep: nullableText,
  proposedStep: nullableText,
  conclusion: nullableText,
});

export const supervisionProgressSchema = supervisionSourceSchema.extend({
  id: z.string().optional(),
  sortOrder: z.number().int().min(0),
  plannedProgress: nullableText,
  actualProgress: nullableText,
  delayValue: z.number().finite().min(0).optional().nullable(),
  delayType: z.enum(["DAY", "PERCENT"]).optional().nullable(),
  delayReason: nullableText,
});

export const supervisionDossierSaveSchema = z.object({
  expectedLockVersion: z.number().int().positive(),
  reportNumber: z.string().trim().max(100).optional().nullable(),
  place: z.string().trim().max(100).optional().nullable(),
  recipientName: z.string().trim().max(200).optional().nullable(),
  recipientTitle: z.string().trim().max(200).optional().nullable(),
  shiftSelections: z.array(supervisionShiftSelectionSchema).max(42),
  entries: z.array(supervisionEntrySchema).max(500),
  observations: z.array(supervisionObservationSchema).max(200),
  transitions: z.array(supervisionTransitionSchema).max(200),
  quantities: z.array(supervisionQuantitySchema).max(200),
  progressRows: z.array(supervisionProgressSchema).max(200),
});

export type SupervisionEntryInput = z.infer<typeof supervisionEntrySchema>;
export type SupervisionShiftSelectionInput = z.infer<typeof supervisionShiftSelectionSchema>;
export type SupervisionObservationInput = z.infer<typeof supervisionObservationSchema>;
export type SupervisionQuantityInput = z.infer<typeof supervisionQuantitySchema>;
export type SupervisionTransitionInput = z.infer<typeof supervisionTransitionSchema>;
export type SupervisionProgressInput = z.infer<typeof supervisionProgressSchema>;
export type SupervisionDossierSaveInput = z.infer<typeof supervisionDossierSaveSchema>;
