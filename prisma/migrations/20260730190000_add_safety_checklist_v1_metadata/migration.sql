-- Lát 2A: metadata reference-data cho checklist chính thức V1.
-- Additive only; không thay đổi bảng legacy.

ALTER TABLE "SafetyChecklistTemplate"
  ADD COLUMN "canonicalHash" VARCHAR(64);

ALTER TABLE "SafetyChecklistItem"
  ADD COLUMN "sourceDocument" TEXT,
  ADD COLUMN "sourceReference" TEXT,
  ADD COLUMN "reportItemNumbers" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "constructionTypes" "SafetyConstructionType"[] NOT NULL DEFAULT ARRAY[]::"SafetyConstructionType"[];

ALTER TABLE "SafetyChecklistTemplate"
  ADD CONSTRAINT "SafetyChecklistTemplate_canonical_hash_check"
  CHECK (
    "canonicalHash" IS NULL
    OR "canonicalHash" ~ '^[a-f0-9]{64}$'
  );
