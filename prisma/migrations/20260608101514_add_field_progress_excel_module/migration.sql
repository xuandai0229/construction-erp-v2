-- CreateEnum
CREATE TYPE "FieldProgressItemType" AS ENUM ('GROUP', 'WORK', 'NOTE');

-- CreateEnum
CREATE TYPE "FieldProgressItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FieldProgressEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FieldMaterialRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ISSUED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FieldMaterialPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "FieldProgressTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldProgressTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "itemType" "FieldProgressItemType" NOT NULL DEFAULT 'WORK',
    "code" TEXT,
    "categoryName" TEXT,
    "workContent" TEXT,
    "constructionCrew" TEXT,
    "designQuantity" DECIMAL(19,4),
    "unit" TEXT,
    "status" "FieldProgressItemStatus" NOT NULL DEFAULT 'PLANNED',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldProgressItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "issueNote" TEXT,
    "proposalNote" TEXT,
    "note" TEXT,
    "status" "FieldProgressEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMaterialRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "entryId" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "neededDate" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "status" "FieldMaterialRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "FieldMaterialPriority" NOT NULL DEFAULT 'MEDIUM',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldMaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMaterialRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(19,4) NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldMaterialRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldProgressTemplate_projectId_idx" ON "FieldProgressTemplate"("projectId");

-- CreateIndex
CREATE INDEX "FieldProgressItem_projectId_idx" ON "FieldProgressItem"("projectId");

-- CreateIndex
CREATE INDEX "FieldProgressItem_templateId_idx" ON "FieldProgressItem"("templateId");

-- CreateIndex
CREATE INDEX "FieldProgressItem_parentId_idx" ON "FieldProgressItem"("parentId");

-- CreateIndex
CREATE INDEX "FieldProgressItem_sortOrder_idx" ON "FieldProgressItem"("sortOrder");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_projectId_idx" ON "FieldProgressEntry"("projectId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_templateId_idx" ON "FieldProgressEntry"("templateId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_itemId_idx" ON "FieldProgressEntry"("itemId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_entryDate_idx" ON "FieldProgressEntry"("entryDate");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_projectId_idx" ON "FieldMaterialRequest"("projectId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_templateId_idx" ON "FieldMaterialRequest"("templateId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_itemId_idx" ON "FieldMaterialRequest"("itemId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_entryId_idx" ON "FieldMaterialRequest"("entryId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequestItem_requestId_idx" ON "FieldMaterialRequestItem"("requestId");

-- AddForeignKey
ALTER TABLE "FieldProgressTemplate" ADD CONSTRAINT "FieldProgressTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressTemplate" ADD CONSTRAINT "FieldProgressTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldProgressTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FieldProgressItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldProgressTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldProgressTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FieldProgressEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequestItem" ADD CONSTRAINT "FieldMaterialRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FieldMaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
