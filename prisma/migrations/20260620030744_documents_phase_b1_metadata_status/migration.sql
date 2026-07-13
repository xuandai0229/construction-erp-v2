-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "ProjectMember" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "Document_fileHash_idx" ON "Document"("fileHash");

-- CreateIndex
CREATE INDEX "Document_folderId_status_idx" ON "Document"("folderId", "status");
