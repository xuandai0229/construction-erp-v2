ALTER TABLE "Project" ADD COLUMN "externalSource" TEXT;
ALTER TABLE "Project" ADD COLUMN "externalSourceKey" TEXT;
ALTER TABLE "Project" ADD COLUMN "sourceMetadata" JSONB;
CREATE UNIQUE INDEX "Project_externalSourceKey_key" ON "Project"("externalSourceKey");
