-- Optional, additive WBS/LBS context. Legacy records remain unmapped.
ALTER TABLE "SiteReportLine" ADD COLUMN "locationNodeId" TEXT;
ALTER TABLE "FieldProgressEntry" ADD COLUMN "locationNodeId" TEXT;
ALTER TABLE "MaterialRequestItem" ADD COLUMN "locationNodeId" TEXT;
ALTER TABLE "Document" ADD COLUMN "fieldProgressItemId" TEXT;
ALTER TABLE "Document" ADD COLUMN "locationNodeId" TEXT;

CREATE INDEX "SiteReportLine_locationNodeId_idx" ON "SiteReportLine"("locationNodeId");
CREATE INDEX "FieldProgressEntry_locationNodeId_idx" ON "FieldProgressEntry"("locationNodeId");
CREATE INDEX "MaterialRequestItem_locationNodeId_idx" ON "MaterialRequestItem"("locationNodeId");
CREATE INDEX "Document_fieldProgressItemId_idx" ON "Document"("fieldProgressItemId");
CREATE INDEX "Document_locationNodeId_idx" ON "Document"("locationNodeId");

ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaterialRequestItem" ADD CONSTRAINT "MaterialRequestItem_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
