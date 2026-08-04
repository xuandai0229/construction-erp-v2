-- Migration: 20260803170000_reconcile_missing_schema_drift
-- Reconcile missing fields on Safety reporting models and drop orphaned unused table SupervisionInspectionSchedule

-- Alter SafetyReportPlan
ALTER TABLE "SafetyReportPlan" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "SafetyReportPlan" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

-- Alter SafetySelfAssessmentEntry
ALTER TABLE "SafetySelfAssessmentEntry" ADD COLUMN IF NOT EXISTS "customProjectName" TEXT;

-- Alter SafetySelfAssessmentReport
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "documentDate" DATE;
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "documentPlace" TEXT DEFAULT 'Hà Nội';
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "internalNote" TEXT;
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "officialDocumentNumber" TEXT;
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "recipientText" TEXT DEFAULT 'Ban Giám đốc Công ty; Phòng kỹ thuật';
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "reporterDepartment" TEXT DEFAULT 'Phòng kỹ thuật';
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "reporterName" TEXT DEFAULT 'Phạm Xuân Quảng';
ALTER TABLE "SafetySelfAssessmentReport" ADD COLUMN IF NOT EXISTS "reporterTitle" TEXT DEFAULT 'Cán bộ An toàn';

-- Drop orphaned table SupervisionInspectionSchedule if exists to reconcile DB replay
DROP TABLE IF EXISTS "SupervisionInspectionSchedule" CASCADE;
