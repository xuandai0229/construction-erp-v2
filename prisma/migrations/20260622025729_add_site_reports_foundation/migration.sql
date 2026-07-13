-- CreateEnum
CREATE TYPE "SiteReportType" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'CLOUDY', 'OVERCAST', 'LIGHT_RAIN', 'HEAVY_RAIN', 'WINDY', 'STORM', 'OTHER');

-- CreateEnum
CREATE TYPE "SiteReportAttachmentKind" AS ENUM ('PHOTO', 'FILE');

-- DropForeignKey
ALTER TABLE "SiteReportLine" DROP CONSTRAINT "SiteReportLine_wbsItemId_fkey";

-- AlterTable
ALTER TABLE "SiteReport" ADD COLUMN     "equipment" TEXT,
ADD COLUMN     "gpsLat" DOUBLE PRECISION,
ADD COLUMN     "gpsLng" DOUBLE PRECISION,
ADD COLUMN     "issues" TEXT,
ADD COLUMN     "labor" TEXT,
ADD COLUMN     "materials" TEXT,
ADD COLUMN     "quality" TEXT,
ADD COLUMN     "recommendations" TEXT,
ADD COLUMN     "reportNo" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN     "reporterName" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "type" "SiteReportType" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "weatherCondition" "WeatherCondition",
ADD COLUMN     "weatherNote" TEXT,
ADD COLUMN     "weatherTemperature" DOUBLE PRECISION,
ADD COLUMN     "weekEndDate" TIMESTAMP(3),
ADD COLUMN     "weekStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SiteReportLine" ADD COLUMN     "area" TEXT,
ADD COLUMN     "fieldProgressItemId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workName" TEXT,
ALTER COLUMN "wbsItemId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SiteReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "kind" "SiteReportAttachmentKind" NOT NULL DEFAULT 'FILE',
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteReportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteReportAttachment_reportId_idx" ON "SiteReportAttachment"("reportId");

-- CreateIndex
CREATE INDEX "SiteReport_reportNo_idx" ON "SiteReport"("reportNo");

-- CreateIndex
CREATE INDEX "SiteReportLine_fieldProgressItemId_idx" ON "SiteReportLine"("fieldProgressItemId");

-- AddForeignKey
ALTER TABLE "SiteReportAttachment" ADD CONSTRAINT "SiteReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SiteReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WBSItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
