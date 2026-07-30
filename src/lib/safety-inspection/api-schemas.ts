import { z } from "zod";

const mutationFields = {
  clientMutationId: z.string().trim().min(8).max(160),
  expectedVersion: z.number().int().positive(),
};

export const constructionTypeSchema = z.enum([
  "BUILDING",
  "DRAINAGE_INFRASTRUCTURE",
  "OTHER",
]);
export const shiftSchema = z.enum(["MORNING", "AFTERNOON", "EVENING"]);

export const createSafetyPlanSchema = z.object({
  clientMutationId: z.string().trim().min(8).max(160),
  documentYear: z.number().int().min(2020).max(2200),
  sequenceNumber: z.number().int().positive().nullable().optional(),
  documentNumber: z.string().trim().max(100).nullable().optional(),
  weekStart: z.coerce.date(),
  weekEnd: z.coerce.date(),
  isWeekException: z.boolean().default(false),
  weekExceptionReason: z.string().trim().max(2000).nullable().optional(),
  createdDate: z.coerce.date(),
  legalBases: z.array(z.string().trim().min(1).max(2000)).default([]),
  purpose: z.string().trim().max(5000).nullable().optional(),
  recipients: z.array(z.string().trim().min(1).max(500)).default([]),
  note: z.string().trim().max(5000).nullable().optional(),
});

export const updateSafetyPlanSchema = z.object({
  ...mutationFields,
  documentNumber: z.string().trim().max(100).nullable().optional(),
  weekStart: z.coerce.date().optional(),
  weekEnd: z.coerce.date().optional(),
  isWeekException: z.boolean().optional(),
  weekExceptionReason: z.string().trim().max(2000).nullable().optional(),
  legalBases: z.array(z.string().trim().min(1).max(2000)).optional(),
  purpose: z.string().trim().max(5000).nullable().optional(),
  recipients: z.array(z.string().trim().min(1).max(500)).optional(),
  note: z.string().trim().max(5000).nullable().optional(),
});

export const safetyScheduleSchema = z.object({
  clientMutationId: z.string().trim().min(8).max(160),
  expectedPlanVersion: z.number().int().positive(),
  expectedScheduleVersion: z.number().int().positive().optional(),
  projectId: z.string().trim().min(1),
  scheduledDate: z.coerce.date(),
  shift: shiftSchema,
  kind: z.enum([
    "INSPECTION",
    "SURPRISE_INSPECTION",
    "WORKER_TRAINING",
    "REINSPECTION",
  ]),
  constructionType: constructionTypeSchema,
  location: z.string().trim().max(1000).nullable().optional(),
  plannedFreeText: z.string().trim().max(5000).nullable().optional(),
  trainingContent: z.string().trim().max(5000).nullable().optional(),
  startAt: z.coerce.date().nullable().optional(),
  expectedEndAt: z.coerce.date().nullable().optional(),
  changeNote: z.string().trim().max(5000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  collaboratorUserIds: z.array(z.string().trim().min(1)).default([]),
  checklistItemIds: z.array(z.string().trim().min(1)).default([]),
});

export const cancelSafetyScheduleSchema = z.object({
  ...mutationFields,
  expectedPlanVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(2000),
});

export const planDecisionSchema = z.object({
  ...mutationFields,
  decision: z.enum(["SUBMIT", "APPROVE", "RETURN"]),
  reason: z.string().trim().max(3000).nullable().optional(),
});

export const startSafetySessionSchema = z.object({
  ...mutationFields,
  occurredAt: z.coerce.date(),
  shift: shiftSchema,
  location: z.string().trim().max(1000).nullable().optional(),
});

export const unplannedSafetySessionSchema = z.object({
  clientMutationId: z.string().trim().min(8).max(160),
  projectId: z.string().trim().min(1),
  occurredAt: z.coerce.date(),
  shift: shiftSchema,
  location: z.string().trim().max(1000).nullable().optional(),
  constructionType: constructionTypeSchema,
  reason: z.string().trim().min(1).max(3000),
});

const safetyFindingInputSchema = z.object({
  localReference: z.string().trim().min(1).max(160).nullable().optional(),
  description: z.string().trim().min(1).max(10000),
  severity: z.enum([
    "REMINDER",
    "MEDIUM",
    "SERIOUS",
    "IMMEDIATE_DANGER",
  ]),
  violationGroup: z.string().trim().max(500).nullable().optional(),
  location: z.string().trim().max(1000).nullable().optional(),
  workSuspended: z.boolean().default(false),
  temporaryMeasure: z.string().trim().max(5000).nullable().optional(),
  responsibleUnit: z.string().trim().max(500).nullable().optional(),
  responsibleUserId: z.string().trim().min(1).nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
}).strict();

export const saveSafetyResultSchema = z.object({
  clientMutationId: z.string().trim().min(8).max(160),
  expectedSessionVersion: z.number().int().positive(),
  expectedResultVersion: z.number().int().positive().nullable(),
  checklistItemId: z.string().trim().min(1),
  status: z.enum(["PASS", "FAIL", "NOT_APPLICABLE", "NOT_INSPECTED"]),
  note: z.string().trim().max(10000).nullable().optional(),
  notApplicableReason: z.string().max(3000).nullable().optional(),
  inspectedAt: z.coerce.date(),
  findings: z.array(safetyFindingInputSchema).default([]),
});

export const completeSafetySessionSchema = z.object(mutationFields);

export const assignSafetyFindingSchema = z.object({
  ...mutationFields,
  assigneeUserId: z.string().trim().min(1).nullable().optional(),
  assigneeUnit: z.string().trim().min(1).max(500),
  requestText: z.string().trim().min(1).max(10000),
  requestedDueAt: z.coerce.date().nullable().optional(),
});

export const submitSafetyRemediationSchema = z.object({
  ...mutationFields,
  expectedActionVersion: z.number().int().positive(),
  actionId: z.string().trim().min(1),
  resultText: z.string().trim().min(1).max(10000),
});

export const reinspectionSchema = z.object({
  ...mutationFields,
  expectedActionVersion: z.number().int().positive(),
  actionId: z.string().trim().min(1),
  decision: z.enum([
    "ACCEPT_COMPLETION",
    "REJECT_REWORK",
    "EXTEND_DUE_DATE",
    "ESCALATE_SEVERITY",
    "SUSPEND_WORK",
  ]),
  conclusion: z.string().trim().max(10000).nullable().optional(),
  reason: z.string().trim().max(5000).nullable().optional(),
  newDueAt: z.coerce.date().nullable().optional(),
  newSeverity: z
    .enum(["REMINDER", "MEDIUM", "SERIOUS", "IMMEDIATE_DANGER"])
    .nullable()
    .optional(),
  suspensionReason: z.string().trim().max(5000).nullable().optional(),
  inspectedAt: z.coerce.date(),
});
