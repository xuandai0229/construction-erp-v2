-- Lát 1/1.5 ATLĐ, PCCC, VSMT: migration additive chưa phát hành.

-- Không thay đổi bảng legacy hoặc dữ liệu hiện hữu.



-- CreateEnum
CREATE TYPE "SafetyPlanStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'LOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetyScheduleStatus" AS ENUM ('PLANNED', 'CHANGED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SafetyScheduleKind" AS ENUM ('INSPECTION', 'SURPRISE_INSPECTION', 'WORKER_TRAINING', 'REINSPECTION');

-- CreateEnum
CREATE TYPE "SafetyShift" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "SafetyConstructionType" AS ENUM ('BUILDING', 'DRAINAGE_INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "SafetyInspectionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetyResultStatus" AS ENUM ('PASS', 'FAIL', 'NOT_APPLICABLE', 'NOT_INSPECTED');

-- CreateEnum
CREATE TYPE "SafetySeverity" AS ENUM ('REMINDER', 'MEDIUM', 'SERIOUS', 'IMMEDIATE_DANGER');

-- CreateEnum
CREATE TYPE "SafetyFindingStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_REMEDIATION', 'WAITING_REINSPECTION', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetyCorrectiveActionStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REWORK_REQUIRED', 'EXTENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetyEvidenceKind" AS ENUM ('PHOTO', 'VIDEO', 'FILE');

-- CreateEnum
CREATE TYPE "SafetyReinspectionDecision" AS ENUM ('ACCEPT_COMPLETION', 'REJECT_REWORK', 'EXTEND_DUE_DATE', 'ESCALATE_SEVERITY', 'SUSPEND_WORK');

-- CreateEnum
CREATE TYPE "SafetyReportStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'LOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetyDocumentTemplateType" AS ENUM ('WEEKLY_PLAN', 'WEEKLY_SELF_ASSESSMENT_REPORT');

-- CreateEnum
CREATE TYPE "SafetyAggregateType" AS ENUM ('PLAN', 'SCHEDULE', 'SESSION', 'RESULT', 'FINDING', 'CORRECTIVE_ACTION', 'REINSPECTION', 'WEEKLY_REPORT', 'CHECKLIST_TEMPLATE', 'DOCUMENT_TEMPLATE', 'EVIDENCE');

-- CreateTable
CREATE TABLE "SafetyInspectionPlan" (
    "id" TEXT NOT NULL,
    "documentYear" INTEGER NOT NULL,
    "sequenceNumber" INTEGER,
    "documentNumber" TEXT,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "isWeekException" BOOLEAN NOT NULL DEFAULT false,
    "weekExceptionReason" TEXT,
    "createdDate" DATE NOT NULL,
    "legalBases" JSONB,
    "purpose" TEXT,
    "recipients" JSONB,
    "note" TEXT,
    "status" "SafetyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyInspectionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyInspectionPlanProject" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT NOT NULL,

    CONSTRAINT "SafetyInspectionPlanProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyInspectionSchedule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "shift" "SafetyShift" NOT NULL,
    "kind" "SafetyScheduleKind" NOT NULL DEFAULT 'INSPECTION',
    "constructionType" "SafetyConstructionType" NOT NULL,
    "location" TEXT,
    "plannedFreeText" TEXT,
    "trainingContent" TEXT,
    "startAt" TIMESTAMP(3),
    "expectedEndAt" TIMESTAMP(3),
    "changeNote" TEXT,
    "status" "SafetyScheduleStatus" NOT NULL DEFAULT 'PLANNED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyInspectionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyInspectionScheduleCollaborator" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayNameSnapshot" TEXT NOT NULL,
    "roleSnapshot" TEXT NOT NULL,

    CONSTRAINT "SafetyInspectionScheduleCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyInspectionScheduleChecklistItem" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SafetyInspectionScheduleChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyInspectionSession" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "planId" TEXT,
    "projectId" TEXT NOT NULL,
    "checklistTemplateId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "shift" "SafetyShift" NOT NULL,
    "location" TEXT,
    "constructionType" "SafetyConstructionType" NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "status" "SafetyInspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "unplannedReason" TEXT,
    "collaboratorSnapshot" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyInspectionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyChecklistTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyChecklistSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "constructionTypes" "SafetyConstructionType"[],

    CONSTRAINT "SafetyChecklistSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyChecklistItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "normalizedLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "requiresFindingWhenFail" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SafetyChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyInspectionResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "status" "SafetyResultStatus" NOT NULL DEFAULT 'NOT_INSPECTED',
    "note" TEXT,
    "notApplicableReason" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "inspectedById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyInspectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyFinding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inspectionResultId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "SafetySeverity" NOT NULL,
    "violationGroup" TEXT,
    "location" TEXT,
    "workSuspended" BOOLEAN NOT NULL DEFAULT false,
    "temporaryMeasure" TEXT,
    "responsibleUnit" TEXT,
    "responsibleUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "originalDueAt" TIMESTAMP(3),
    "effectiveDueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "status" "SafetyFindingStatus" NOT NULL DEFAULT 'NEW',
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyCorrectiveAction" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestText" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "assigneeUnit" TEXT,
    "requestedDueAtSnapshot" TIMESTAMP(3),
    "submittedResult" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "status" "SafetyCorrectiveActionStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdById" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyCorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyCorrectiveEvidence" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "actionId" TEXT,
    "documentId" TEXT,
    "kind" "SafetyEvidenceKind" NOT NULL,
    "caption" TEXT,
    "capturedAt" TIMESTAMP(3),
    "geoLat" DECIMAL(10,7),
    "geoLng" DECIMAL(10,7),
    "uploadedById" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancelledById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyCorrectiveEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReinspection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "decision" "SafetyReinspectionDecision" NOT NULL,
    "conclusion" TEXT NOT NULL,
    "reason" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL,
    "previousDueAt" TIMESTAMP(3),
    "newDueAt" TIMESTAMP(3),
    "extensionReason" TEXT,
    "previousSeverity" "SafetySeverity",
    "newSeverity" "SafetySeverity",
    "suspensionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyReinspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyWeeklyReport" (
    "id" TEXT NOT NULL,
    "documentYear" INTEGER NOT NULL,
    "sequenceNumber" INTEGER,
    "documentNumber" TEXT,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "status" "SafetyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "legalBases" JSONB,
    "recipients" JSONB,
    "sourceSnapshotAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyWeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyWeeklyReportProject" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "SafetyWeeklyReportProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyWeeklyReportEntry" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inspectionDate" DATE NOT NULL,
    "shift" "SafetyShift" NOT NULL,
    "projectSnapshot" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "assessment" TEXT,
    "request" TEXT,
    "implementationResult" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyWeeklyReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyWeeklyReportNarrative" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "systemContent" TEXT NOT NULL,
    "editedContent" TEXT,
    "editedById" TEXT,
    "editedAt" TIMESTAMP(3),
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyWeeklyReportNarrative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyDocumentTemplate" (
    "id" TEXT NOT NULL,
    "templateType" "SafetyDocumentTemplateType" NOT NULL,
    "version" INTEGER NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "sourceSizeBytes" INTEGER NOT NULL,
    "exportDocxFileName" TEXT NOT NULL,
    "exportDocxSha256" TEXT NOT NULL,
    "exportDocxSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "baselinePageCount" INTEGER NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "snapshotCreatedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "preservesSourceText" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "documentId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyApprovalHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "aggregateType" "SafetyAggregateType" NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "approvalRequestId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyAuditLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "aggregateType" "SafetyAggregateType" NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT NOT NULL,

    CONSTRAINT "SafetyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIdempotency" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "aggregateType" "SafetyAggregateType" NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultData" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SafetyInspectionPlan_status_weekStart_idx" ON "SafetyInspectionPlan"("status", "weekStart");

-- CreateIndex
CREATE INDEX "SafetyInspectionPlan_createdById_weekStart_idx" ON "SafetyInspectionPlan"("createdById", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyInspectionPlan_documentYear_sequenceNumber_key" ON "SafetyInspectionPlan"("documentYear", "sequenceNumber");

-- CreateIndex
CREATE INDEX "SafetyInspectionPlanProject_projectId_planId_idx" ON "SafetyInspectionPlanProject"("projectId", "planId");

-- CreateIndex
CREATE INDEX "SafetyInspectionPlanProject_addedById_idx" ON "SafetyInspectionPlanProject"("addedById");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyInspectionPlanProject_planId_projectId_key" ON "SafetyInspectionPlanProject"("planId", "projectId");

-- CreateIndex
CREATE INDEX "SafetyInspectionSchedule_planId_scheduledDate_shift_idx" ON "SafetyInspectionSchedule"("planId", "scheduledDate", "shift");

-- CreateIndex
CREATE INDEX "SafetyInspectionSchedule_projectId_scheduledDate_status_idx" ON "SafetyInspectionSchedule"("projectId", "scheduledDate", "status");

-- CreateIndex
CREATE INDEX "SafetyInspectionScheduleCollaborator_userId_scheduleId_idx" ON "SafetyInspectionScheduleCollaborator"("userId", "scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyInspectionScheduleCollaborator_scheduleId_userId_key" ON "SafetyInspectionScheduleCollaborator"("scheduleId", "userId");

-- CreateIndex
CREATE INDEX "SafetyInspectionScheduleChecklistItem_checklistItemId_sched_idx" ON "SafetyInspectionScheduleChecklistItem"("checklistItemId", "scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyInspectionScheduleChecklistItem_scheduleId_checklistI_key" ON "SafetyInspectionScheduleChecklistItem"("scheduleId", "checklistItemId");

-- CreateIndex
CREATE INDEX "SafetyInspectionSession_planId_occurredAt_idx" ON "SafetyInspectionSession"("planId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyInspectionSession_projectId_occurredAt_status_idx" ON "SafetyInspectionSession"("projectId", "occurredAt", "status");

-- CreateIndex
CREATE INDEX "SafetyInspectionSession_scheduleId_idx" ON "SafetyInspectionSession"("scheduleId");

-- CreateIndex
CREATE INDEX "SafetyInspectionSession_checklistTemplateId_idx" ON "SafetyInspectionSession"("checklistTemplateId");

-- CreateIndex
CREATE INDEX "SafetyInspectionSession_inspectorId_occurredAt_idx" ON "SafetyInspectionSession"("inspectorId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyChecklistTemplate_isActive_effectiveFrom_idx" ON "SafetyChecklistTemplate"("isActive", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyChecklistTemplate_code_version_key" ON "SafetyChecklistTemplate"("code", "version");

-- CreateIndex
CREATE INDEX "SafetyChecklistSection_templateId_sortOrder_idx" ON "SafetyChecklistSection"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyChecklistSection_templateId_code_key" ON "SafetyChecklistSection"("templateId", "code");

-- CreateIndex
CREATE INDEX "SafetyChecklistItem_sectionId_sortOrder_idx" ON "SafetyChecklistItem"("sectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyChecklistItem_sectionId_code_key" ON "SafetyChecklistItem"("sectionId", "code");

-- CreateIndex
CREATE INDEX "SafetyInspectionResult_projectId_status_inspectedAt_idx" ON "SafetyInspectionResult"("projectId", "status", "inspectedAt");

-- CreateIndex
CREATE INDEX "SafetyInspectionResult_checklistItemId_idx" ON "SafetyInspectionResult"("checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyInspectionResult_sessionId_checklistItemId_key" ON "SafetyInspectionResult"("sessionId", "checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyFinding_code_key" ON "SafetyFinding"("code");

-- CreateIndex
CREATE INDEX "SafetyFinding_projectId_status_effectiveDueAt_idx" ON "SafetyFinding"("projectId", "status", "effectiveDueAt");

-- CreateIndex
CREATE INDEX "SafetyFinding_sessionId_idx" ON "SafetyFinding"("sessionId");

-- CreateIndex
CREATE INDEX "SafetyFinding_inspectionResultId_idx" ON "SafetyFinding"("inspectionResultId");

-- CreateIndex
CREATE INDEX "SafetyFinding_responsibleUserId_status_idx" ON "SafetyFinding"("responsibleUserId", "status");

-- CreateIndex
CREATE INDEX "SafetyCorrectiveAction_projectId_status_requestedDueAtSnaps_idx" ON "SafetyCorrectiveAction"("projectId", "status", "requestedDueAtSnapshot");

-- CreateIndex
CREATE INDEX "SafetyCorrectiveAction_findingId_createdAt_idx" ON "SafetyCorrectiveAction"("findingId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyCorrectiveAction_assigneeUserId_status_idx" ON "SafetyCorrectiveAction"("assigneeUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyCorrectiveEvidence_documentId_key" ON "SafetyCorrectiveEvidence"("documentId");

-- CreateIndex
CREATE INDEX "SafetyCorrectiveEvidence_projectId_findingId_idx" ON "SafetyCorrectiveEvidence"("projectId", "findingId");

-- CreateIndex
CREATE INDEX "SafetyCorrectiveEvidence_actionId_idx" ON "SafetyCorrectiveEvidence"("actionId");

-- CreateIndex
CREATE INDEX "SafetyCorrectiveEvidence_uploadedById_createdAt_idx" ON "SafetyCorrectiveEvidence"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyCorrectiveEvidence_cancelledById_cancelledAt_idx" ON "SafetyCorrectiveEvidence"("cancelledById", "cancelledAt");

-- CreateIndex
CREATE INDEX "SafetyReinspection_projectId_inspectedAt_idx" ON "SafetyReinspection"("projectId", "inspectedAt");

-- CreateIndex
CREATE INDEX "SafetyReinspection_findingId_inspectedAt_idx" ON "SafetyReinspection"("findingId", "inspectedAt");

-- CreateIndex
CREATE INDEX "SafetyReinspection_actionId_idx" ON "SafetyReinspection"("actionId");

-- CreateIndex
CREATE INDEX "SafetyReinspection_inspectorId_inspectedAt_idx" ON "SafetyReinspection"("inspectorId", "inspectedAt");

-- CreateIndex
CREATE INDEX "SafetyWeeklyReport_status_weekStart_idx" ON "SafetyWeeklyReport"("status", "weekStart");

-- CreateIndex
CREATE INDEX "SafetyWeeklyReport_createdById_weekStart_idx" ON "SafetyWeeklyReport"("createdById", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyWeeklyReport_documentYear_sequenceNumber_key" ON "SafetyWeeklyReport"("documentYear", "sequenceNumber");

-- CreateIndex
CREATE INDEX "SafetyWeeklyReportProject_projectId_reportId_idx" ON "SafetyWeeklyReportProject"("projectId", "reportId");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyWeeklyReportProject_reportId_projectId_key" ON "SafetyWeeklyReportProject"("reportId", "projectId");

-- CreateIndex
CREATE INDEX "SafetyWeeklyReportEntry_projectId_inspectionDate_shift_idx" ON "SafetyWeeklyReportEntry"("projectId", "inspectionDate", "shift");

-- CreateIndex
CREATE INDEX "SafetyWeeklyReportEntry_reportId_sortOrder_idx" ON "SafetyWeeklyReportEntry"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "SafetyWeeklyReportEntry_cancelledById_cancelledAt_idx" ON "SafetyWeeklyReportEntry"("cancelledById", "cancelledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyWeeklyReportEntry_reportId_sessionId_key" ON "SafetyWeeklyReportEntry"("reportId", "sessionId");

-- CreateIndex
CREATE INDEX "SafetyWeeklyReportNarrative_editedById_editedAt_idx" ON "SafetyWeeklyReportNarrative"("editedById", "editedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyWeeklyReportNarrative_reportId_key_key" ON "SafetyWeeklyReportNarrative"("reportId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyDocumentTemplate_documentId_key" ON "SafetyDocumentTemplate"("documentId");

-- CreateIndex
CREATE INDEX "SafetyDocumentTemplate_templateType_isActive_idx" ON "SafetyDocumentTemplate"("templateType", "isActive");

-- CreateIndex
CREATE INDEX "SafetyDocumentTemplate_exportDocxSha256_idx" ON "SafetyDocumentTemplate"("exportDocxSha256");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyDocumentTemplate_templateType_version_key" ON "SafetyDocumentTemplate"("templateType", "version");

-- CreateIndex
CREATE INDEX "SafetyApprovalHistory_aggregateType_aggregateId_occurredAt_idx" ON "SafetyApprovalHistory"("aggregateType", "aggregateId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyApprovalHistory_projectId_occurredAt_idx" ON "SafetyApprovalHistory"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyApprovalHistory_approvalRequestId_idx" ON "SafetyApprovalHistory"("approvalRequestId");

-- CreateIndex
CREATE INDEX "SafetyAuditLog_aggregateType_aggregateId_occurredAt_idx" ON "SafetyAuditLog"("aggregateType", "aggregateId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyAuditLog_projectId_occurredAt_idx" ON "SafetyAuditLog"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyAuditLog_actorId_occurredAt_idx" ON "SafetyAuditLog"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyAuditLog_correlationId_idx" ON "SafetyAuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "SafetyIdempotency_aggregateType_aggregateId_createdAt_idx" ON "SafetyIdempotency"("aggregateType", "aggregateId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyIdempotency_actorId_createdAt_idx" ON "SafetyIdempotency"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyIdempotency_actorId_aggregateType_aggregateId_clientM_key" ON "SafetyIdempotency"("actorId", "aggregateType", "aggregateId", "clientMutationId");

-- AddForeignKey
ALTER TABLE "SafetyInspectionPlan" ADD CONSTRAINT "SafetyInspectionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionPlan" ADD CONSTRAINT "SafetyInspectionPlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionPlanProject" ADD CONSTRAINT "SafetyInspectionPlanProject_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SafetyInspectionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionPlanProject" ADD CONSTRAINT "SafetyInspectionPlanProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionPlanProject" ADD CONSTRAINT "SafetyInspectionPlanProject_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionSchedule" ADD CONSTRAINT "SafetyInspectionSchedule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SafetyInspectionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionSchedule" ADD CONSTRAINT "SafetyInspectionSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionScheduleCollaborator" ADD CONSTRAINT "SafetyInspectionScheduleCollaborator_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SafetyInspectionSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionScheduleCollaborator" ADD CONSTRAINT "SafetyInspectionScheduleCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionScheduleChecklistItem" ADD CONSTRAINT "SafetyInspectionScheduleChecklistItem_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SafetyInspectionSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionScheduleChecklistItem" ADD CONSTRAINT "SafetyInspectionScheduleChecklistItem_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "SafetyChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionSession" ADD CONSTRAINT "SafetyInspectionSession_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SafetyInspectionSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionSession" ADD CONSTRAINT "SafetyInspectionSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SafetyInspectionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionSession" ADD CONSTRAINT "SafetyInspectionSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionSession" ADD CONSTRAINT "SafetyInspectionSession_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "SafetyChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionSession" ADD CONSTRAINT "SafetyInspectionSession_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyChecklistTemplate" ADD CONSTRAINT "SafetyChecklistTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyChecklistSection" ADD CONSTRAINT "SafetyChecklistSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SafetyChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyChecklistItem" ADD CONSTRAINT "SafetyChecklistItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SafetyChecklistSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionResult" ADD CONSTRAINT "SafetyInspectionResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SafetyInspectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionResult" ADD CONSTRAINT "SafetyInspectionResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionResult" ADD CONSTRAINT "SafetyInspectionResult_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "SafetyChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyInspectionResult" ADD CONSTRAINT "SafetyInspectionResult_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SafetyInspectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_inspectionResultId_fkey" FOREIGN KEY ("inspectionResultId") REFERENCES "SafetyInspectionResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveAction" ADD CONSTRAINT "SafetyCorrectiveAction_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SafetyFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveAction" ADD CONSTRAINT "SafetyCorrectiveAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveAction" ADD CONSTRAINT "SafetyCorrectiveAction_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveAction" ADD CONSTRAINT "SafetyCorrectiveAction_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveAction" ADD CONSTRAINT "SafetyCorrectiveAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveEvidence" ADD CONSTRAINT "SafetyCorrectiveEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveEvidence" ADD CONSTRAINT "SafetyCorrectiveEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SafetyFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveEvidence" ADD CONSTRAINT "SafetyCorrectiveEvidence_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SafetyCorrectiveAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveEvidence" ADD CONSTRAINT "SafetyCorrectiveEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveEvidence" ADD CONSTRAINT "SafetyCorrectiveEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyCorrectiveEvidence" ADD CONSTRAINT "SafetyCorrectiveEvidence_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReinspection" ADD CONSTRAINT "SafetyReinspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReinspection" ADD CONSTRAINT "SafetyReinspection_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "SafetyFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReinspection" ADD CONSTRAINT "SafetyReinspection_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SafetyCorrectiveAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReinspection" ADD CONSTRAINT "SafetyReinspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReport" ADD CONSTRAINT "SafetyWeeklyReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReport" ADD CONSTRAINT "SafetyWeeklyReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportProject" ADD CONSTRAINT "SafetyWeeklyReportProject_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyWeeklyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportProject" ADD CONSTRAINT "SafetyWeeklyReportProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportEntry" ADD CONSTRAINT "SafetyWeeklyReportEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyWeeklyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportEntry" ADD CONSTRAINT "SafetyWeeklyReportEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportEntry" ADD CONSTRAINT "SafetyWeeklyReportEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SafetyInspectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportEntry" ADD CONSTRAINT "SafetyWeeklyReportEntry_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportNarrative" ADD CONSTRAINT "SafetyWeeklyReportNarrative_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyWeeklyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyReportNarrative" ADD CONSTRAINT "SafetyWeeklyReportNarrative_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyDocumentTemplate" ADD CONSTRAINT "SafetyDocumentTemplate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyDocumentTemplate" ADD CONSTRAINT "SafetyDocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyDocumentTemplate" ADD CONSTRAINT "SafetyDocumentTemplate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyApprovalHistory" ADD CONSTRAINT "SafetyApprovalHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyApprovalHistory" ADD CONSTRAINT "SafetyApprovalHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyApprovalHistory" ADD CONSTRAINT "SafetyApprovalHistory_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAuditLog" ADD CONSTRAINT "SafetyAuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAuditLog" ADD CONSTRAINT "SafetyAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIdempotency" ADD CONSTRAINT "SafetyIdempotency_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Chỉ một phiên bản active cho mỗi loại/code, kể cả khi kích hoạt cạnh tranh.
CREATE UNIQUE INDEX "SafetyDocumentTemplate_one_active_per_type"
ON "SafetyDocumentTemplate" ("templateType")
WHERE "isActive" = true;

CREATE UNIQUE INDEX "SafetyChecklistTemplate_one_active_per_code"
ON "SafetyChecklistTemplate" ("code")
WHERE "isActive" = true;

-- Check constraints cho kỳ, số văn bản, session nguồn, GPS, hạn và completedAt.
ALTER TABLE "SafetyInspectionPlan"
ADD CONSTRAINT "SafetyInspectionPlan_week_range_check"
CHECK ("weekStart" <= "weekEnd"),
ADD CONSTRAINT "SafetyInspectionPlan_sequence_positive_check"
CHECK ("sequenceNumber" IS NULL OR "sequenceNumber" > 0);

ALTER TABLE "SafetyWeeklyReport"
ADD CONSTRAINT "SafetyWeeklyReport_week_range_check"
CHECK ("weekStart" <= "weekEnd"),
ADD CONSTRAINT "SafetyWeeklyReport_sequence_positive_check"
CHECK ("sequenceNumber" IS NULL OR "sequenceNumber" > 0);

ALTER TABLE "SafetyInspectionSession"
ADD CONSTRAINT "SafetyInspectionSession_source_check"
CHECK (
  ("scheduleId" IS NOT NULL AND "planId" IS NOT NULL)
  OR
  ("scheduleId" IS NULL AND length(btrim("unplannedReason")) > 0)
);

ALTER TABLE "SafetyInspectionResult"
ADD CONSTRAINT "SafetyInspectionResult_not_applicable_reason_check"
CHECK (
  "status" <> 'NOT_APPLICABLE'::"SafetyResultStatus"
  OR length(btrim("notApplicableReason")) > 0
);

ALTER TABLE "SafetyCorrectiveEvidence"
ADD CONSTRAINT "SafetyCorrectiveEvidence_geo_lat_check"
CHECK ("geoLat" IS NULL OR ("geoLat" >= -90 AND "geoLat" <= 90)),
ADD CONSTRAINT "SafetyCorrectiveEvidence_geo_lng_check"
CHECK ("geoLng" IS NULL OR ("geoLng" >= -180 AND "geoLng" <= 180)),
ADD CONSTRAINT "SafetyCorrectiveEvidence_cancel_check"
CHECK (
  ("cancelledAt" IS NULL AND "cancelledById" IS NULL AND "cancelReason" IS NULL)
  OR
  ("cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL AND length(btrim("cancelReason")) > 0)
);

ALTER TABLE "SafetyFinding"
ADD CONSTRAINT "SafetyFinding_effective_due_check"
CHECK (
  "originalDueAt" IS NULL
  OR "effectiveDueAt" IS NULL
  OR "effectiveDueAt" >= "originalDueAt"
),
ADD CONSTRAINT "SafetyFinding_completed_at_check"
CHECK (
  ("status" = 'COMPLETED'::"SafetyFindingStatus" AND "completedAt" IS NOT NULL)
  OR
  ("status" <> 'COMPLETED'::"SafetyFindingStatus" AND "completedAt" IS NULL)
);

ALTER TABLE "SafetyWeeklyReportEntry"
ADD CONSTRAINT "SafetyWeeklyReportEntry_cancel_check"
CHECK (
  ("cancelledAt" IS NULL AND "cancelledById" IS NULL AND "cancellationReason" IS NULL)
  OR
  ("cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL AND length(btrim("cancellationReason")) > 0)
);
