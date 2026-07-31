-- CreateEnum
CREATE TYPE "SafetyReportPlanStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SafetyReportShift" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "SafetyReportConstructionType" AS ENUM ('BUILDING', 'INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "SafetySelfAssessmentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SafetyReportPlanSequence" (
    "businessYear" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyReportPlanSequence_pkey" PRIMARY KEY ("businessYear")
);

-- CreateTable
CREATE TABLE "SafetySelfAssessmentSequence" (
    "businessYear" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetySelfAssessmentSequence_pkey" PRIMARY KEY ("businessYear")
);

-- CreateTable
CREATE TABLE "SafetyReportPlan" (
    "id" TEXT NOT NULL,
    "documentYear" INTEGER NOT NULL,
    "sequenceNumber" INTEGER,
    "documentNumber" TEXT,
    "title" TEXT NOT NULL,
    "createdDate" DATE NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "legalBases" JSONB,
    "recipients" JSONB,
    "purpose" TEXT,
    "note" TEXT,
    "status" "SafetyReportPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "revisionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyReportPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReportPlanEntry" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "inspectionDate" DATE NOT NULL,
    "shift" "SafetyReportShift" NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectNameSnapshot" TEXT NOT NULL,
    "constructionType" "SafetyReportConstructionType" NOT NULL DEFAULT 'BUILDING',
    "inspectionContent" TEXT NOT NULL,
    "trainingContent" TEXT,
    "collaborators" TEXT,
    "location" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyReportPlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetySelfAssessmentReport" (
    "id" TEXT NOT NULL,
    "sourcePlanId" TEXT,
    "documentYear" INTEGER NOT NULL,
    "sequenceNumber" INTEGER,
    "documentNumber" TEXT,
    "title" TEXT NOT NULL,
    "createdDate" DATE NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "legalBases" JSONB,
    "recipients" JSONB,
    "previousWeekRemediation" TEXT,
    "reinspectionConfirmation" TEXT,
    "managementRecommendation" TEXT,
    "otherOpinion" TEXT,
    "status" "SafetySelfAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "revisionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetySelfAssessmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetySelfAssessmentEntry" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "inspectionDate" DATE NOT NULL,
    "shift" "SafetyReportShift" NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectNameSnapshot" TEXT NOT NULL,
    "inspectionContent" TEXT NOT NULL,
    "assessment" TEXT,
    "recommendation" TEXT,
    "implementationResult" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetySelfAssessmentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReportApprovalHistory" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "approvalRequestId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyReportApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReportAuditLog" (
    "id" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT NOT NULL,

    CONSTRAINT "SafetyReportAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SafetyReportPlan_documentYear_sequenceNumber_key" ON "SafetyReportPlan"("documentYear", "sequenceNumber");

-- CreateIndex
CREATE INDEX "SafetyReportPlan_status_periodStart_idx" ON "SafetyReportPlan"("status", "periodStart");

-- CreateIndex
CREATE INDEX "SafetyReportPlan_createdById_periodStart_idx" ON "SafetyReportPlan"("createdById", "periodStart");

-- CreateIndex
CREATE INDEX "SafetyReportPlanEntry_planId_inspectionDate_sortOrder_idx" ON "SafetyReportPlanEntry"("planId", "inspectionDate", "sortOrder");

-- CreateIndex
CREATE INDEX "SafetyReportPlanEntry_projectId_inspectionDate_idx" ON "SafetyReportPlanEntry"("projectId", "inspectionDate");

-- CreateIndex
CREATE UNIQUE INDEX "SafetySelfAssessmentReport_documentYear_sequenceNumber_key" ON "SafetySelfAssessmentReport"("documentYear", "sequenceNumber");

-- CreateIndex
CREATE INDEX "SafetySelfAssessmentReport_status_periodStart_idx" ON "SafetySelfAssessmentReport"("status", "periodStart");

-- CreateIndex
CREATE INDEX "SafetySelfAssessmentReport_createdById_periodStart_idx" ON "SafetySelfAssessmentReport"("createdById", "periodStart");

-- CreateIndex
CREATE INDEX "SafetySelfAssessmentEntry_reportId_inspectionDate_sortOr_idx" ON "SafetySelfAssessmentEntry"("reportId", "inspectionDate", "sortOrder");

-- CreateIndex
CREATE INDEX "SafetySelfAssessmentEntry_projectId_inspectionDate_idx" ON "SafetySelfAssessmentEntry"("projectId", "inspectionDate");

-- CreateIndex
CREATE INDEX "SafetyReportApprovalHistory_reportType_reportId_occurred_idx" ON "SafetyReportApprovalHistory"("reportType", "reportId", "occurredAt");

-- CreateIndex
CREATE INDEX "SafetyReportAuditLog_reportType_reportId_occurredAt_idx" ON "SafetyReportAuditLog"("reportType", "reportId", "occurredAt");

-- AddForeignKey
ALTER TABLE "SafetyReportPlan" ADD CONSTRAINT "SafetyReportPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportPlan" ADD CONSTRAINT "SafetyReportPlan_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportPlan" ADD CONSTRAINT "SafetyReportPlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportPlanEntry" ADD CONSTRAINT "SafetyReportPlanEntry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SafetyReportPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportPlanEntry" ADD CONSTRAINT "SafetyReportPlanEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySelfAssessmentReport" ADD CONSTRAINT "SafetySelfAssessmentReport_sourcePlanId_fkey" FOREIGN KEY ("sourcePlanId") REFERENCES "SafetyReportPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySelfAssessmentReport" ADD CONSTRAINT "SafetySelfAssessmentReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySelfAssessmentReport" ADD CONSTRAINT "SafetySelfAssessmentReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySelfAssessmentReport" ADD CONSTRAINT "SafetySelfAssessmentReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySelfAssessmentEntry" ADD CONSTRAINT "SafetySelfAssessmentEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetySelfAssessmentReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySelfAssessmentEntry" ADD CONSTRAINT "SafetySelfAssessmentEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportApprovalHistory" ADD CONSTRAINT "SafetyReportApprovalHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportApprovalHistory" ADD CONSTRAINT "SafetyReportApprovalHistory_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportAuditLog" ADD CONSTRAINT "SafetyReportAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
