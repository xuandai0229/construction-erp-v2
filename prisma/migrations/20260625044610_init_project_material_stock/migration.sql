-- AlterTable
ALTER TABLE "MaterialItem" ADD COLUMN     "group" TEXT;

-- AlterTable
ALTER TABLE "SiteReport" ALTER COLUMN "reportNo" SET DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "ProjectMaterialStock" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "stock" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "minStockLevel" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMaterialStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMaterialStock_projectId_idx" ON "ProjectMaterialStock"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMaterialStock_materialItemId_idx" ON "ProjectMaterialStock"("materialItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMaterialStock_projectId_materialItemId_key" ON "ProjectMaterialStock"("projectId", "materialItemId");

-- AddForeignKey
ALTER TABLE "ProjectMaterialStock" ADD CONSTRAINT "ProjectMaterialStock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaterialStock" ADD CONSTRAINT "ProjectMaterialStock_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
