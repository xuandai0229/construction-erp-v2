-- Delete soft-deleted temporary test rows to clear duplicate periodStarts
DELETE FROM "SafetyWeeklyFile" WHERE "deletedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SafetyWeeklyFile" (
    "id" TEXT NOT NULL,
    "fileCode" TEXT NOT NULL,
    "officialDocumentNumber" TEXT,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyWeeklyFile_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SafetyReportPlan" ADD COLUMN IF NOT EXISTS "weeklyFileId" TEXT;

-- AlterTable
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "weeklyFileId" TEXT;

-- Create Partial Unique Index for Active Weekly Files (where deletedAt IS NULL)
DROP INDEX IF EXISTS "SafetyWeeklyFile_periodStart_key";
DROP INDEX IF EXISTS "SafetyWeeklyFile_active_periodStart_key";
CREATE UNIQUE INDEX "SafetyWeeklyFile_active_periodStart_key" ON "SafetyWeeklyFile"("periodStart") WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SafetyWeeklyFile_deletedAt_periodStart_idx" ON "SafetyWeeklyFile"("deletedAt", "periodStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SafetyWeeklyFile_createdById_periodStart_idx" ON "SafetyWeeklyFile"("createdById", "periodStart");

-- AddForeignKey
ALTER TABLE "SafetyReportPlan" DROP CONSTRAINT IF EXISTS "SafetyReportPlan_weeklyFileId_fkey";
ALTER TABLE "SafetyReportPlan" ADD CONSTRAINT "SafetyReportPlan_weeklyFileId_fkey" FOREIGN KEY ("weeklyFileId") REFERENCES "SafetyWeeklyFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySelfAssessmentReport" DROP CONSTRAINT IF EXISTS "SafetySelfAssessmentReport_weeklyFileId_fkey";
ALTER TABLE "SafetySelfAssessmentReport" ADD CONSTRAINT "SafetySelfAssessmentReport_weeklyFileId_fkey" FOREIGN KEY ("weeklyFileId") REFERENCES "SafetyWeeklyFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyFile" DROP CONSTRAINT IF EXISTS "SafetyWeeklyFile_createdById_fkey";
ALTER TABLE "SafetyWeeklyFile" ADD CONSTRAINT "SafetyWeeklyFile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyFile" DROP CONSTRAINT IF EXISTS "SafetyWeeklyFile_updatedById_fkey";
ALTER TABLE "SafetyWeeklyFile" ADD CONSTRAINT "SafetyWeeklyFile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyWeeklyFile" DROP CONSTRAINT IF EXISTS "SafetyWeeklyFile_deletedById_fkey";
ALTER TABLE "SafetyWeeklyFile" ADD CONSTRAINT "SafetyWeeklyFile_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
