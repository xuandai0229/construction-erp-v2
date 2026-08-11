CREATE TYPE "MaterialProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "MaterialProposalApprovalStage" AS ENUM ('TECHNICAL', 'FINAL');
CREATE TYPE "MaterialProposalApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "ProjectMember" ADD COLUMN "canApproveMaterialProposalTechnical" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MaterialProposal" (
  "id" TEXT NOT NULL,
  "proposalNo" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "projectNameSnapshot" TEXT NOT NULL,
  "projectLocationSnapshot" TEXT,
  "requestedById" TEXT NOT NULL,
  "requesterNameSnapshot" TEXT NOT NULL,
  "requesterRoleSnapshot" TEXT,
  "proposalDate" TIMESTAMP(3) NOT NULL,
  "purchaseReason" TEXT,
  "requiredDeliveryDate" TIMESTAMP(3),
  "status" "MaterialProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialProposal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialProposal_proposalNo_key" ON "MaterialProposal"("proposalNo");
CREATE INDEX "MaterialProposal_projectId_status_idx" ON "MaterialProposal"("projectId", "status");
CREATE INDEX "MaterialProposal_requestedById_idx" ON "MaterialProposal"("requestedById");
CREATE INDEX "MaterialProposal_proposalDate_idx" ON "MaterialProposal"("proposalDate");
ALTER TABLE "MaterialProposal" ADD CONSTRAINT "MaterialProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialProposal" ADD CONSTRAINT "MaterialProposal_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MaterialProposalItem" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "sectionName" TEXT,
  "materialItemId" TEXT,
  "materialCodeSnapshot" TEXT,
  "materialName" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "contractQuantityText" TEXT,
  "actualQuantity" DECIMAL(19,4) NOT NULL,
  "specification" TEXT,
  "manufacturerOrigin" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialProposalItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialProposalItem_proposalId_sequence_key" ON "MaterialProposalItem"("proposalId", "sequence");
CREATE INDEX "MaterialProposalItem_proposalId_idx" ON "MaterialProposalItem"("proposalId");
CREATE INDEX "MaterialProposalItem_materialItemId_idx" ON "MaterialProposalItem"("materialItemId");
ALTER TABLE "MaterialProposalItem" ADD CONSTRAINT "MaterialProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "MaterialProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialProposalItem" ADD CONSTRAINT "MaterialProposalItem_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MaterialProposalApproval" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "stage" "MaterialProposalApprovalStage" NOT NULL,
  "status" "MaterialProposalApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "approverId" TEXT NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialProposalApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MaterialProposalApproval_proposalId_status_idx" ON "MaterialProposalApproval"("proposalId", "status");
CREATE UNIQUE INDEX "MaterialProposalApproval_one_pending_key" ON "MaterialProposalApproval"("proposalId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "MaterialProposalApproval_proposalId_stage_key" ON "MaterialProposalApproval"("proposalId", "stage");
CREATE UNIQUE INDEX "MaterialProposalApproval_proposalId_idempotencyKey_key" ON "MaterialProposalApproval"("proposalId", "idempotencyKey");
CREATE INDEX "MaterialProposalApproval_approverId_status_idx" ON "MaterialProposalApproval"("approverId", "status");
ALTER TABLE "MaterialProposalApproval" ADD CONSTRAINT "MaterialProposalApproval_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "MaterialProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialProposalApproval" ADD CONSTRAINT "MaterialProposalApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
