/*
  Warnings:

  - You are about to drop the `MaterialRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaterialRequestItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaterialRequestStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "MaterialRequestStatus" ADD VALUE 'PROCESSING';

-- DropForeignKey
ALTER TABLE "MaterialRequest" DROP CONSTRAINT "MaterialRequest_projectId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequest" DROP CONSTRAINT "MaterialRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequest" DROP CONSTRAINT "MaterialRequest_siteReportId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequestItem" DROP CONSTRAINT "MaterialRequestItem_materialRequestId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequestItem" DROP CONSTRAINT "MaterialRequestItem_wbsItemId_fkey";

-- DropTable
DROP TABLE "MaterialRequest";

-- DropTable
DROP TABLE "MaterialRequestItem";
