-- Independent supervision workspace. It deliberately does not add a
-- ProjectMember row: the scope is evaluated separately by the application.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERVISION_HEAD';

DO $$ BEGIN CREATE TYPE "SupervisionScopeType" AS ENUM ('ALL_PROJECTS', 'SELECTED_PROJECTS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupervisionPackageStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'RESUBMITTED', 'CONFIRMED', 'LOCKED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupervisionShift" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupervisionFindingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'OVERDUE', 'PENDING_VERIFICATION', 'REMEDIATION_FAILED', 'RESOLVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupervisionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupervisionRemediationResult" AS ENUM ('NOT_CHECKED', 'PASSED', 'FAILED', 'REWORK_REQUIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupervisionPlanSource" AS ENUM ('SUPERVISION_HEAD', 'SITE_COMMANDER', 'BOARD_OF_DIRECTORS', 'PREVIOUS_FINDING', 'CONSTRUCTION_TRANSITION', 'INCIDENT', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SupervisionRecommendationGroup" AS ENUM ('STAFFING', 'EQUIPMENT', 'WEAK_TEAM_REPLACEMENT', 'PROGRESS_DIRECTION', 'QUALITY_ISSUE', 'TECHNICAL_VARIATION', 'MATERIAL_VARIATION', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "SupervisionScope" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "scopeType" "SupervisionScopeType" NOT NULL DEFAULT 'SELECTED_PROJECTS', "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionScope_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionScope_userId_key" UNIQUE ("userId"),
  CONSTRAINT "SupervisionScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "SupervisionScopeProject" (
  "id" TEXT NOT NULL, "scopeId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupervisionScopeProject_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionScopeProject_scopeId_projectId_key" UNIQUE ("scopeId", "projectId"),
  CONSTRAINT "SupervisionScopeProject_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "SupervisionScope"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupervisionScopeProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "SupervisionWeeklyPackage" (
  "id" TEXT NOT NULL, "reportNumber" TEXT, "weekStart" TIMESTAMP(3) NOT NULL, "weekEnd" TIMESTAMP(3) NOT NULL, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "place" TEXT DEFAULT 'Hà Nội', "recipientName" TEXT, "recipientTitle" TEXT, "status" "SupervisionPackageStatus" NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1, "revisionReason" TEXT, "submittedAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3), "lockedAt" TIMESTAMP(3), "createdById" TEXT NOT NULL, "reviewedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SupervisionWeeklyPackage_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionWeeklyPackage_createdById_weekStart_key" UNIQUE ("createdById", "weekStart"),
  CONSTRAINT "SupervisionWeeklyPackage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SupervisionWeeklyPackage_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "SupervisionVisit" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "visitDate" TIMESTAMP(3) NOT NULL, "shift" "SupervisionShift" NOT NULL, "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3), "workItem" TEXT, "inspectionContent" TEXT NOT NULL, "result" TEXT NOT NULL, "collaborators" TEXT, "note" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionVisit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupervisionVisit_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupervisionVisit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SupervisionVisit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SupervisionTransitionCheck" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "workItem" TEXT NOT NULL, "currentStep" TEXT NOT NULL, "proposedStep" TEXT NOT NULL, "reportedQuantity" DECIMAL(19,4), "verifiedQuantity" DECIMAL(19,4), "varianceQuantity" DECIMAL(19,4), "unit" TEXT, "plannedProgress" TEXT, "conclusion" TEXT NOT NULL, "reason" TEXT, "requiredAction" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionTransitionCheck_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionTransitionCheck_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "SupervisionTransitionCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SupervisionQuantityVerification" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "workItem" TEXT NOT NULL, "unit" TEXT NOT NULL, "reportedQuantity" DECIMAL(19,4) NOT NULL, "verifiedQuantity" DECIMAL(19,4) NOT NULL, "varianceQuantity" DECIMAL(19,4) NOT NULL, "variancePercent" DECIMAL(9,4), "sourceType" TEXT, "sourceId" TEXT, "sourceRecordedAt" TIMESTAMP(3), "checkedAt" TIMESTAMP(3) NOT NULL, "conclusion" TEXT NOT NULL, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionQuantityVerification_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionQuantityVerification_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "SupervisionQuantityVerification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SupervisionProgressAssessment" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "workItem" TEXT, "plannedProgress" DECIMAL(5,2), "actualProgress" DECIMAL(5,2), "variancePercent" DECIMAL(9,4), "delayedDays" INTEGER DEFAULT 0, "delayReason" TEXT, "impactLevel" "SupervisionSeverity" NOT NULL DEFAULT 'MEDIUM', "proposedMeasure" TEXT, "responsibleParty" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionProgressAssessment_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionProgressAssessment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "SupervisionProgressAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SupervisionFinding" (
  "id" TEXT NOT NULL, "packageId" TEXT, "projectId" TEXT NOT NULL, "code" TEXT NOT NULL, "workItem" TEXT, "category" TEXT NOT NULL, "description" TEXT NOT NULL, "severity" "SupervisionSeverity" NOT NULL DEFAULT 'MEDIUM', "responsibleParty" TEXT, "detectedAt" TIMESTAMP(3) NOT NULL, "dueDate" TIMESTAMP(3), "status" "SupervisionFindingStatus" NOT NULL DEFAULT 'OPEN', "remediationResponse" TEXT, "remediationResult" "SupervisionRemediationResult" NOT NULL DEFAULT 'NOT_CHECKED', "verifiedAt" TIMESTAMP(3), "verifiedById" TEXT, "verificationNote" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionFinding_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionFinding_code_key" UNIQUE ("code"), CONSTRAINT "SupervisionFinding_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "SupervisionFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "SupervisionFinding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SupervisionPlanItem" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "projectId" TEXT, "plannedDate" TIMESTAMP(3) NOT NULL, "shift" "SupervisionShift" NOT NULL, "plannedTime" TEXT, "workItem" TEXT, "inspectionContent" TEXT NOT NULL, "objective" TEXT, "source" "SupervisionPlanSource" NOT NULL DEFAULT 'SUPERVISION_HEAD', "proposer" TEXT, "collaborators" TEXT, "priority" "SupervisionSeverity" NOT NULL DEFAULT 'MEDIUM', "expectedResult" TEXT, "note" TEXT, "findingId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionPlanItem_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionPlanItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "SupervisionPlanItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SupervisionRecommendation" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "projectId" TEXT, "workItem" TEXT, "group" "SupervisionRecommendationGroup" NOT NULL, "content" TEXT NOT NULL, "priority" "SupervisionSeverity" NOT NULL DEFAULT 'MEDIUM', "decisionMaker" TEXT, "desiredDueDate" TIMESTAMP(3), "boardComment" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupervisionRecommendation_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionRecommendation_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "SupervisionRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "SupervisionAttachment" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "documentId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "evidenceType" TEXT NOT NULL, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupervisionAttachment_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionAttachment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "SupervisionWorkflowHistory" (
  "id" TEXT NOT NULL, "packageId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "previousStatus" "SupervisionPackageStatus", "nextStatus" "SupervisionPackageStatus" NOT NULL, "reason" TEXT, "version" INTEGER NOT NULL, "idempotencyKey" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupervisionWorkflowHistory_pkey" PRIMARY KEY ("id"), CONSTRAINT "SupervisionWorkflowHistory_packageId_idempotencyKey_key" UNIQUE ("packageId", "idempotencyKey"), CONSTRAINT "SupervisionWorkflowHistory_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SupervisionWeeklyPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "SupervisionWorkflowHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "SupervisionScopeProject_projectId_idx" ON "SupervisionScopeProject"("projectId");
CREATE INDEX "SupervisionWeeklyPackage_status_weekStart_idx" ON "SupervisionWeeklyPackage"("status", "weekStart");
CREATE INDEX "SupervisionVisit_packageId_visitDate_idx" ON "SupervisionVisit"("packageId", "visitDate");
CREATE INDEX "SupervisionVisit_projectId_visitDate_idx" ON "SupervisionVisit"("projectId", "visitDate");
CREATE INDEX "SupervisionQuantityVerification_projectId_checkedAt_idx" ON "SupervisionQuantityVerification"("projectId", "checkedAt");
CREATE INDEX "SupervisionFinding_projectId_status_idx" ON "SupervisionFinding"("projectId", "status");
CREATE INDEX "SupervisionPlanItem_packageId_plannedDate_idx" ON "SupervisionPlanItem"("packageId", "plannedDate");
CREATE INDEX "SupervisionWorkflowHistory_packageId_createdAt_idx" ON "SupervisionWorkflowHistory"("packageId", "createdAt");
