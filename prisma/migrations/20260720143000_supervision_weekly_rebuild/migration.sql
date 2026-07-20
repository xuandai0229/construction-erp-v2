-- Additive weekly-supervision rebuild. Legacy Supervision* tables are not
-- modified, renamed, or dropped by this migration.
CREATE TYPE "SupervisionWeeklyStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVISION_REQUIRED', 'APPROVED', 'LOCKED');
CREATE TYPE "SupervisionWeeklyDocumentType" AS ENUM ('RESULT', 'NEXT_WEEK_PLAN');
CREATE TYPE "SupervisionWeeklyInputMode" AS ENUM ('PROJECT_WORK_ITEM', 'PROJECT_MANUAL_ITEM', 'MANUAL_TEXT');
CREATE TYPE "SupervisionWeeklyShift" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

CREATE TABLE "SupervisionWeeklyDossier" (
  "id" TEXT NOT NULL,
  "reportNumber" TEXT,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "weekEnd" TIMESTAMP(3) NOT NULL,
  "nextWeekStart" TIMESTAMP(3) NOT NULL,
  "nextWeekEnd" TIMESTAMP(3) NOT NULL,
  "place" TEXT DEFAULT 'Hà Nội',
  "recipientName" TEXT,
  "recipientTitle" TEXT,
  "companyNameSnapshot" TEXT,
  "templateVersion" TEXT NOT NULL DEFAULT 'weekly-supervision-v1',
  "status" "SupervisionWeeklyStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "lockVersion" INTEGER NOT NULL DEFAULT 1,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SupervisionWeeklyDossier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisionWeeklyEntry" (
  "id" TEXT NOT NULL,
  "dossierId" TEXT NOT NULL,
  "documentType" "SupervisionWeeklyDocumentType" NOT NULL,
  "entryDate" TIMESTAMP(3) NOT NULL,
  "shift" "SupervisionWeeklyShift" NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "inputMode" "SupervisionWeeklyInputMode" NOT NULL,
  "projectId" TEXT,
  "projectNameSnapshot" TEXT,
  "workItemId" TEXT,
  "workItemNameSnapshot" TEXT,
  "manualText" TEXT,
  "displayText" TEXT NOT NULL,
  "inspectionContent" TEXT,
  "result" TEXT,
  "commanderProposal" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionWeeklyEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisionWeeklyQuantity" (
  "id" TEXT NOT NULL, "dossierId" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL,
  "projectId" TEXT, "projectNameSnapshot" TEXT, "workItemId" TEXT, "workItemNameSnapshot" TEXT,
  "manualText" TEXT, "displayText" TEXT NOT NULL, "unit" TEXT,
  "reportedQuantity" DECIMAL(19,4), "verifiedQuantity" DECIMAL(19,4), "varianceQuantity" DECIMAL(19,4),
  "plannedProgress" TEXT, "conclusion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionWeeklyQuantity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisionWeeklyTransition" (
  "id" TEXT NOT NULL, "dossierId" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL,
  "projectId" TEXT, "projectNameSnapshot" TEXT, "workItemId" TEXT, "workItemNameSnapshot" TEXT,
  "manualText" TEXT, "displayText" TEXT NOT NULL, "currentStep" TEXT, "proposedStep" TEXT, "conclusion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionWeeklyTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisionWeeklyProgress" (
  "id" TEXT NOT NULL, "dossierId" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL,
  "projectId" TEXT, "projectNameSnapshot" TEXT, "workItemId" TEXT, "workItemNameSnapshot" TEXT,
  "manualText" TEXT, "displayText" TEXT NOT NULL, "plannedProgress" TEXT, "actualProgress" TEXT, "delayReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionWeeklyProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisionWeeklyObservation" (
  "id" TEXT NOT NULL, "dossierId" TEXT NOT NULL, "documentType" "SupervisionWeeklyDocumentType" NOT NULL,
  "category" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL, "projectId" TEXT, "projectNameSnapshot" TEXT,
  "workItemId" TEXT, "workItemNameSnapshot" TEXT, "manualText" TEXT, "displayText" TEXT, "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionWeeklyObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisionWeeklyAttachment" (
  "id" TEXT NOT NULL, "dossierId" TEXT NOT NULL, "documentId" TEXT NOT NULL, "entryId" TEXT,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupervisionWeeklyAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupervisionWeeklyRevision" (
  "id" TEXT NOT NULL, "dossierId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "fromStatus" "SupervisionWeeklyStatus", "toStatus" "SupervisionWeeklyStatus" NOT NULL,
  "version" INTEGER NOT NULL, "changedFields" TEXT, "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupervisionWeeklyRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupervisionWeeklyDossier_createdById_weekStart_version_key" ON "SupervisionWeeklyDossier"("createdById", "weekStart", "version");
CREATE INDEX "SupervisionWeeklyDossier_status_weekStart_idx" ON "SupervisionWeeklyDossier"("status", "weekStart");
CREATE INDEX "SupervisionWeeklyDossier_createdById_weekStart_idx" ON "SupervisionWeeklyDossier"("createdById", "weekStart");
CREATE INDEX "SupervisionWeeklyEntry_dossierId_documentType_entryDate_shift_sortOrder_idx" ON "SupervisionWeeklyEntry"("dossierId", "documentType", "entryDate", "shift", "sortOrder");
CREATE INDEX "SupervisionWeeklyEntry_projectId_idx" ON "SupervisionWeeklyEntry"("projectId");
CREATE INDEX "SupervisionWeeklyQuantity_dossierId_sortOrder_idx" ON "SupervisionWeeklyQuantity"("dossierId", "sortOrder");
CREATE INDEX "SupervisionWeeklyTransition_dossierId_sortOrder_idx" ON "SupervisionWeeklyTransition"("dossierId", "sortOrder");
CREATE INDEX "SupervisionWeeklyProgress_dossierId_sortOrder_idx" ON "SupervisionWeeklyProgress"("dossierId", "sortOrder");
CREATE INDEX "SupervisionWeeklyObservation_dossierId_documentType_category_sortOrder_idx" ON "SupervisionWeeklyObservation"("dossierId", "documentType", "category", "sortOrder");
CREATE INDEX "SupervisionWeeklyAttachment_dossierId_idx" ON "SupervisionWeeklyAttachment"("dossierId");
CREATE INDEX "SupervisionWeeklyAttachment_documentId_idx" ON "SupervisionWeeklyAttachment"("documentId");
CREATE INDEX "SupervisionWeeklyRevision_dossierId_createdAt_idx" ON "SupervisionWeeklyRevision"("dossierId", "createdAt");

ALTER TABLE "SupervisionWeeklyDossier" ADD CONSTRAINT "SupervisionWeeklyDossier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyDossier" ADD CONSTRAINT "SupervisionWeeklyDossier_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyEntry" ADD CONSTRAINT "SupervisionWeeklyEntry_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyEntry" ADD CONSTRAINT "SupervisionWeeklyEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyQuantity" ADD CONSTRAINT "SupervisionWeeklyQuantity_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyQuantity" ADD CONSTRAINT "SupervisionWeeklyQuantity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyTransition" ADD CONSTRAINT "SupervisionWeeklyTransition_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyTransition" ADD CONSTRAINT "SupervisionWeeklyTransition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyProgress" ADD CONSTRAINT "SupervisionWeeklyProgress_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyProgress" ADD CONSTRAINT "SupervisionWeeklyProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyObservation" ADD CONSTRAINT "SupervisionWeeklyObservation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyObservation" ADD CONSTRAINT "SupervisionWeeklyObservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyAttachment" ADD CONSTRAINT "SupervisionWeeklyAttachment_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyRevision" ADD CONSTRAINT "SupervisionWeeklyRevision_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "SupervisionWeeklyDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupervisionWeeklyRevision" ADD CONSTRAINT "SupervisionWeeklyRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
