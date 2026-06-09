/*
  Warnings:

  - You are about to drop the column `authorId` on the `SiteReport` table. All the data in the column will be lost.
  - You are about to drop the column `issues` on the `SiteReport` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `SiteReport` table. All the data in the column will be lost.
  - You are about to drop the column `workDone` on the `SiteReport` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `WBSItem` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `WBSItem` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `SiteReport` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WBSItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaterialRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ISSUED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaterialRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SiteReportStatus" ADD VALUE 'REVISION_REQUESTED';
ALTER TYPE "SiteReportStatus" ADD VALUE 'LOCKED';
ALTER TYPE "SiteReportStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "SiteReport" DROP CONSTRAINT "SiteReport_authorId_fkey";

-- DropIndex
DROP INDEX "SiteReport_authorId_idx";

-- AlterTable
ALTER TABLE "SiteReport" DROP COLUMN "authorId",
DROP COLUMN "issues",
DROP COLUMN "temperature",
DROP COLUMN "workDone",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "equipmentNote" TEXT,
ADD COLUMN     "generalNote" TEXT,
ADD COLUMN     "manpowerCount" INTEGER,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "WBSItem" DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "designQuantity" DECIMAL(19,4),
ADD COLUMN     "note" TEXT,
ADD COLUMN     "plannedEndDate" TIMESTAMP(3),
ADD COLUMN     "plannedStartDate" TIMESTAMP(3),
ADD COLUMN     "status" "WBSItemStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'Lần';

-- CreateTable
CREATE TABLE "SiteReportLine" (
    "id" TEXT NOT NULL,
    "siteReportId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsItemId" TEXT NOT NULL,
    "workContent" TEXT NOT NULL,
    "constructionCrew" TEXT,
    "unit" TEXT,
    "designQuantity" DECIMAL(19,4),
    "quantityToday" DECIMAL(19,4) NOT NULL,
    "quantityBefore" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "quantityCumulative" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SiteReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "siteReportId" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "neededDate" TIMESTAMP(3),
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "MaterialRequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequestItem" (
    "id" TEXT NOT NULL,
    "materialRequestId" TEXT NOT NULL,
    "wbsItemId" TEXT,
    "materialName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(19,4) NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MaterialRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteReportLine_siteReportId_idx" ON "SiteReportLine"("siteReportId");

-- CreateIndex
CREATE INDEX "SiteReportLine_projectId_idx" ON "SiteReportLine"("projectId");

-- CreateIndex
CREATE INDEX "SiteReportLine_wbsItemId_idx" ON "SiteReportLine"("wbsItemId");

-- CreateIndex
CREATE INDEX "MaterialRequest_projectId_idx" ON "MaterialRequest"("projectId");

-- CreateIndex
CREATE INDEX "MaterialRequest_siteReportId_idx" ON "MaterialRequest"("siteReportId");

-- CreateIndex
CREATE INDEX "MaterialRequest_requestedById_idx" ON "MaterialRequest"("requestedById");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_materialRequestId_idx" ON "MaterialRequestItem"("materialRequestId");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_wbsItemId_idx" ON "MaterialRequestItem"("wbsItemId");

-- CreateIndex
CREATE INDEX "SiteReport_createdById_idx" ON "SiteReport"("createdById");

-- AddForeignKey
ALTER TABLE "WBSItem" ADD CONSTRAINT "WBSItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReport" ADD CONSTRAINT "SiteReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReport" ADD CONSTRAINT "SiteReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_siteReportId_fkey" FOREIGN KEY ("siteReportId") REFERENCES "SiteReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WBSItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_siteReportId_fkey" FOREIGN KEY ("siteReportId") REFERENCES "SiteReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequestItem" ADD CONSTRAINT "MaterialRequestItem_materialRequestId_fkey" FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequestItem" ADD CONSTRAINT "MaterialRequestItem_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WBSItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
