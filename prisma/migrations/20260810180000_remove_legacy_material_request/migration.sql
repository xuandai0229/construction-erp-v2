-- Migration: Remove Legacy Material Request Models and Enums
-- Clean slate reset for Material Request module V2 design

-- DropForeignKey from MaterialMovement
ALTER TABLE "MaterialMovement" DROP CONSTRAINT IF EXISTS "MaterialMovement_materialRequestId_fkey";
ALTER TABLE "MaterialMovement" DROP CONSTRAINT IF EXISTS "MaterialMovement_materialRequestItemId_fkey";

-- DropTable with CASCADE
DROP TABLE IF EXISTS "MaterialRequest" CASCADE;
DROP TABLE IF EXISTS "MaterialRequestItem" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "MaterialRequestPriority";
DROP TYPE IF EXISTS "MaterialRequestStatus";

