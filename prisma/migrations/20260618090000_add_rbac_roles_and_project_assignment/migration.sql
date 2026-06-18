-- AlterEnum: Add RBAC roles
ALTER TYPE "ProjectRole" ADD VALUE 'CHIEF_COMMANDER';
ALTER TYPE "ProjectRole" ADD VALUE 'ASSISTANT_COMMANDER';
ALTER TYPE "ProjectRole" ADD VALUE 'VIEWER';

ALTER TYPE "UserRole" ADD VALUE 'DEPUTY_DIRECTOR';
ALTER TYPE "UserRole" ADD VALUE 'CHIEF_COMMANDER';

-- AlterTable: Enhance ProjectMember for project assignment tracking
ALTER TABLE "ProjectMember" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Add username to User for flexible login
ALTER TABLE "User" ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE INDEX "ProjectMember_assignedById_idx" ON "ProjectMember"("assignedById");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
