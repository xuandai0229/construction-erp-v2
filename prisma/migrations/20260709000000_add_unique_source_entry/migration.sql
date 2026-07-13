-- AlterTable FieldProgressEntry
ALTER TABLE "FieldProgressEntry" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "FieldProgressEntry" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "FieldProgressEntry" ADD COLUMN "sourceLineId" TEXT;
ALTER TABLE "FieldProgressEntry" ADD COLUMN "sourceReportId" TEXT;
ALTER TABLE "FieldProgressEntry" ADD COLUMN "sourceMeta" JSONB;
ALTER TABLE "FieldProgressEntry" ADD COLUMN "adjustmentReason" TEXT;

-- CreateIndex
CREATE INDEX "FieldProgressEntry_sourceType_sourceId_idx" ON "FieldProgressEntry"("sourceType", "sourceId");
CREATE INDEX "FieldProgressEntry_sourceReportId_idx" ON "FieldProgressEntry"("sourceReportId");

-- AlterTable SiteReport
CREATE UNIQUE INDEX "SiteReport_reportNo_key" ON "SiteReport"("reportNo");
DROP INDEX "SiteReport_reportNo_idx";

-- AlterTable SystemSetting
ALTER TABLE "SystemSetting" ADD COLUMN "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 50;

-- Create a partial unique index to prevent a single site report line from generating multiple active field progress entries
CREATE UNIQUE INDEX "field_progress_entry_source_report_line_uidx" 
ON "FieldProgressEntry"("sourceReportId", "sourceLineId") 
WHERE "deletedAt" IS NULL AND "sourceType" = 'SITE_REPORT';
