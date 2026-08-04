-- Migration: 20260804100000_init_hr_core_foundation
-- Create HR Phase 1 foundation enums and tables

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('PROBATION', 'ACTIVE', 'SUSPENDED', 'RESIGNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "EmployeeProjectAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GrantEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "HrDataScope" AS ENUM ('ALL_EMPLOYEES', 'OWN_ORGANIZATION_UNIT', 'OWN_PROJECTS', 'SELF_ONLY', 'NONE');

-- CreateEnum
CREATE TYPE "SensitiveFieldPolicy" AS ENUM ('BASIC_ONLY', 'CONTACT', 'IDENTITY', 'CONTRACT', 'BANKING', 'FULL');

-- CreateEnum
CREATE TYPE "EmployeeChangeType" AS ENUM ('EMPLOYEE_CREATED', 'EMPLOYEE_PROFILE_UPDATED', 'EMPLOYEE_ORGANIZATION_TRANSFERRED', 'EMPLOYEE_POSITION_CHANGED', 'EMPLOYEE_PROJECT_ASSIGNED', 'EMPLOYEE_PROJECT_RELEASED', 'EMPLOYMENT_STATUS_CHANGED', 'ACCESS_GRANTED', 'ACCESS_REVOKED');

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "personalEmail" TEXT,
    "joinedDate" TIMESTAMP(3) NOT NULL,
    "resignedDate" TIMESTAMP(3),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "identityNumberEncrypted" TEXT,
    "identityNumberBlindIndex" TEXT,
    "identityNumberLastDigits" TEXT,
    "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeOrganizationAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "organizationUnitId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "decisionNo" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeOrganizationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnitManagerAssignment" (
    "id" TEXT NOT NULL,
    "organizationUnitId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "appointedById" TEXT,
    "decisionNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationUnitManagerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPersonnelRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPersonnelRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProjectAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectPersonnelRoleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedEndDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "allocationPercentage" INTEGER NOT NULL DEFAULT 100,
    "status" "EmployeeProjectAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignmentDecisionNo" TEXT,
    "notes" TEXT,
    "overrideReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPermissionDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'HR',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrPermissionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionCode" TEXT NOT NULL,
    "effect" "GrantEffect" NOT NULL DEFAULT 'ALLOW',
    "scope" "HrDataScope" NOT NULL DEFAULT 'OWN_ORGANIZATION_UNIT',
    "sensitiveFieldPolicy" "SensitiveFieldPolicy" NOT NULL DEFAULT 'BASIC_ONLY',
    "organizationUnitId" TEXT,
    "projectId" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "grantedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCodeSequence" (
    "year" INTEGER NOT NULL,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCodeSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "EmployeeChangeHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "changeType" "EmployeeChangeType" NOT NULL,
    "performedById" TEXT NOT NULL,
    "reason" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnit_code_key" ON "OrganizationUnit"("code");

-- CreateIndex
CREATE INDEX "OrganizationUnit_parentId_idx" ON "OrganizationUnit"("parentId");

-- CreateIndex
CREATE INDEX "OrganizationUnit_code_idx" ON "OrganizationUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Position_code_key" ON "Position"("code");

-- CreateIndex
CREATE INDEX "Position_code_idx" ON "Position"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_identityNumberBlindIndex_key" ON "Employee"("identityNumberBlindIndex");

-- CreateIndex
CREATE INDEX "Employee_code_idx" ON "Employee"("code");

-- CreateIndex
CREATE INDEX "Employee_userId_idx" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "EmployeeOrganizationAssignment_employeeId_idx" ON "EmployeeOrganizationAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeOrganizationAssignment_organizationUnitId_idx" ON "EmployeeOrganizationAssignment"("organizationUnitId");

-- CreateIndex
CREATE INDEX "EmployeeOrganizationAssignment_positionId_idx" ON "EmployeeOrganizationAssignment"("positionId");

-- CreateIndex
CREATE INDEX "EmployeeOrganizationAssignment_startDate_endDate_idx" ON "EmployeeOrganizationAssignment"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "OrganizationUnitManagerAssignment_organizationUnitId_idx" ON "OrganizationUnitManagerAssignment"("organizationUnitId");

-- CreateIndex
CREATE INDEX "OrganizationUnitManagerAssignment_employeeId_idx" ON "OrganizationUnitManagerAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPersonnelRole_code_key" ON "ProjectPersonnelRole"("code");

-- CreateIndex
CREATE INDEX "ProjectPersonnelRole_code_idx" ON "ProjectPersonnelRole"("code");

-- CreateIndex
CREATE INDEX "EmployeeProjectAssignment_employeeId_idx" ON "EmployeeProjectAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeProjectAssignment_projectId_idx" ON "EmployeeProjectAssignment"("projectId");

-- CreateIndex
CREATE INDEX "EmployeeProjectAssignment_projectPersonnelRoleId_idx" ON "EmployeeProjectAssignment"("projectPersonnelRoleId");

-- CreateIndex
CREATE INDEX "EmployeeProjectAssignment_startDate_endDate_idx" ON "EmployeeProjectAssignment"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "HrPermissionDefinition_code_key" ON "HrPermissionDefinition"("code");

-- CreateIndex
CREATE INDEX "HrPermissionDefinition_code_idx" ON "HrPermissionDefinition"("code");

-- CreateIndex
CREATE INDEX "UserAccessGrant_userId_idx" ON "UserAccessGrant"("userId");

-- CreateIndex
CREATE INDEX "UserAccessGrant_permissionCode_idx" ON "UserAccessGrant"("permissionCode");

-- CreateIndex
CREATE INDEX "UserAccessGrant_organizationUnitId_idx" ON "UserAccessGrant"("organizationUnitId");

-- CreateIndex
CREATE INDEX "UserAccessGrant_projectId_idx" ON "UserAccessGrant"("projectId");

-- CreateIndex
CREATE INDEX "EmployeeChangeHistory_employeeId_idx" ON "EmployeeChangeHistory"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeChangeHistory_performedById_idx" ON "EmployeeChangeHistory"("performedById");

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrganizationAssignment" ADD CONSTRAINT "EmployeeOrganizationAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrganizationAssignment" ADD CONSTRAINT "EmployeeOrganizationAssignment_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrganizationAssignment" ADD CONSTRAINT "EmployeeOrganizationAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrganizationAssignment" ADD CONSTRAINT "EmployeeOrganizationAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitManagerAssignment" ADD CONSTRAINT "OrganizationUnitManagerAssignment_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitManagerAssignment" ADD CONSTRAINT "OrganizationUnitManagerAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnitManagerAssignment" ADD CONSTRAINT "OrganizationUnitManagerAssignment_appointedById_fkey" FOREIGN KEY ("appointedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProjectAssignment" ADD CONSTRAINT "EmployeeProjectAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProjectAssignment" ADD CONSTRAINT "EmployeeProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProjectAssignment" ADD CONSTRAINT "EmployeeProjectAssignment_projectPersonnelRoleId_fkey" FOREIGN KEY ("projectPersonnelRoleId") REFERENCES "ProjectPersonnelRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProjectAssignment" ADD CONSTRAINT "EmployeeProjectAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessGrant" ADD CONSTRAINT "UserAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessGrant" ADD CONSTRAINT "UserAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessGrant" ADD CONSTRAINT "UserAccessGrant_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessGrant" ADD CONSTRAINT "UserAccessGrant_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessGrant" ADD CONSTRAINT "UserAccessGrant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeChangeHistory" ADD CONSTRAINT "EmployeeChangeHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeChangeHistory" ADD CONSTRAINT "EmployeeChangeHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
