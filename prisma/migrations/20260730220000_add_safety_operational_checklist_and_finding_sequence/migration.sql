-- Lát 2A.5: chỉ bổ sung cấu trúc Safety; không thay đổi dữ liệu/bảng Supervision legacy.
ALTER TABLE "SafetyChecklistItem"
  ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isScored" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SafetyFinding"
  ADD COLUMN "localReference" TEXT;

CREATE TABLE "SafetyChecklistItemSource" (
  "id" TEXT NOT NULL,
  "checklistItemId" TEXT NOT NULL,
  "sourceItemCode" TEXT NOT NULL,
  "sourceDocument" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SafetyChecklistItemSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyReportCategory" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "sourceNumber" INTEGER NOT NULL,
  "sourceText" TEXT NOT NULL,
  "normalizedLabel" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "requiresBusinessClarification" BOOLEAN NOT NULL DEFAULT false,
  "blocksCompletion" BOOLEAN NOT NULL DEFAULT true,
  "isScored" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "SafetyReportCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyReportCategoryItem" (
  "reportCategoryId" TEXT NOT NULL,
  "checklistItemId" TEXT NOT NULL,
  "mappingKind" TEXT NOT NULL DEFAULT 'DIRECT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SafetyReportCategoryItem_pkey" PRIMARY KEY ("reportCategoryId", "checklistItemId")
);

CREATE TABLE "SafetyFindingSequence" (
  "businessYear" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyFindingSequence_pkey" PRIMARY KEY ("businessYear"),
  CONSTRAINT "SafetyFindingSequence_positive_next_number" CHECK ("nextNumber" > 0)
);

CREATE UNIQUE INDEX "SafetyChecklistItemSource_checklistItemId_sourceItemCode_key"
  ON "SafetyChecklistItemSource"("checklistItemId", "sourceItemCode");
CREATE INDEX "SafetyChecklistItemSource_sourceItemCode_idx"
  ON "SafetyChecklistItemSource"("sourceItemCode");
CREATE INDEX "SafetyChecklistItemSource_checklistItemId_sortOrder_idx"
  ON "SafetyChecklistItemSource"("checklistItemId", "sortOrder");
CREATE UNIQUE INDEX "SafetyReportCategory_templateId_code_key"
  ON "SafetyReportCategory"("templateId", "code");
CREATE UNIQUE INDEX "SafetyReportCategory_templateId_sourceNumber_key"
  ON "SafetyReportCategory"("templateId", "sourceNumber");
CREATE INDEX "SafetyReportCategory_templateId_isActive_sortOrder_idx"
  ON "SafetyReportCategory"("templateId", "isActive", "sortOrder");
CREATE INDEX "SafetyReportCategoryItem_checklistItemId_reportCategoryId_idx"
  ON "SafetyReportCategoryItem"("checklistItemId", "reportCategoryId");

ALTER TABLE "SafetyChecklistItemSource"
  ADD CONSTRAINT "SafetyChecklistItemSource_checklistItemId_fkey"
  FOREIGN KEY ("checklistItemId") REFERENCES "SafetyChecklistItem"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyReportCategory"
  ADD CONSTRAINT "SafetyReportCategory_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "SafetyChecklistTemplate"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyReportCategoryItem"
  ADD CONSTRAINT "SafetyReportCategoryItem_reportCategoryId_fkey"
  FOREIGN KEY ("reportCategoryId") REFERENCES "SafetyReportCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyReportCategoryItem"
  ADD CONSTRAINT "SafetyReportCategoryItem_checklistItemId_fkey"
  FOREIGN KEY ("checklistItemId") REFERENCES "SafetyChecklistItem"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
