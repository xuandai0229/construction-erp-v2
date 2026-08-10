-- Migration: Remove Legacy Material Request Models and Enums
-- Clean slate reset for Material Request module V2 design

-- DropForeignKey
ALTER TABLE "MaterialMovement" DROP CONSTRAINT IF EXISTS "MaterialMovement_materialRequestId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialMovement" DROP CONSTRAINT IF EXISTS "MaterialMovement_materialRequestItemId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequest" DROP CONSTRAINT IF EXISTS "MaterialRequest_projectId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequest" DROP CONSTRAINT IF EXISTS "MaterialRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequest" DROP CONSTRAINT IF EXISTS "MaterialRequest_siteReportId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequestItem" DROP CONSTRAINT IF EXISTS "MaterialRequestItem_fieldProgressItemId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequestItem" DROP CONSTRAINT IF EXISTS "MaterialRequestItem_locationNodeId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequestItem" DROP CONSTRAINT IF EXISTS "MaterialRequestItem_materialRequestId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialRequestItem" DROP CONSTRAINT IF EXISTS "MaterialRequestItem_wbsItemId_fkey";

-- DropTable
DROP TABLE IF EXISTS "MaterialRequest" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "MaterialRequestItem" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "MaterialRequestPriority";

-- DropEnum
DROP TYPE IF EXISTS "MaterialRequestStatus";
