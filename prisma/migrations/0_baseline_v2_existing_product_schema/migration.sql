-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ApprovalPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalRequestType" AS ENUM ('MATERIAL', 'REPORT', 'VOLUME', 'INSPECTION', 'PLAN', 'DRAWING', 'METHOD_STATEMENT', 'SAFETY', 'QUALITY', 'SITE_ISSUE', 'CHANGE_ORDER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "FieldMaterialPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FieldMaterialRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ISSUED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FieldProgressEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FieldProgressItemAssignmentRole" AS ENUM ('RESPONSIBLE', 'COORDINATOR');

-- CreateEnum
CREATE TYPE "FieldProgressItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FieldProgressItemType" AS ENUM ('GROUP', 'WORK', 'NOTE');

-- CreateEnum
CREATE TYPE "MaterialMovementType" AS ENUM ('IMPORT', 'EXPORT', 'TRANSFER', 'RETURN');

-- CreateEnum
CREATE TYPE "MaterialRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaterialRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ISSUED', 'RECEIVED', 'CANCELLED', 'REQUESTED', 'PROCESSING');

-- CreateEnum
CREATE TYPE "ProjectLocationNodeType" AS ENUM ('PROJECT', 'ZONE', 'BLOCK', 'BUILDING', 'BASEMENT', 'FLOOR', 'AREA', 'ROOM', 'AXIS', 'ELEVATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('PROJECT_MANAGER', 'SITE_COMMANDER', 'QA_QC', 'HSE', 'SUPERVISOR', 'CHIEF_COMMANDER', 'ASSISTANT_COMMANDER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SiteReportAttachmentKind" AS ENUM ('PHOTO', 'FILE');

-- CreateEnum
CREATE TYPE "SiteReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'LOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SiteReportType" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR', 'CHIEF_COMMANDER', 'MANAGER', 'ENGINEER', 'STAFF');

-- CreateEnum
CREATE TYPE "WBSItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'CLOUDY', 'OVERCAST', 'LIGHT_RAIN', 'HEAVY_RAIN', 'WINDY', 'STORM', 'OTHER');

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "deletedAt" TIMESTAMP(3),
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" "ApprovalPriority" NOT NULL DEFAULT 'NORMAL',
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "title" TEXT NOT NULL,
    "type" "ApprovalRequestType" NOT NULL DEFAULT 'OTHER',
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" TEXT,
    "afterData" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "extension" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "displayName" TEXT,
    "documentType" TEXT,
    "fileHash" TEXT,
    "metadata" JSONB,
    "rejectedReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "fieldProgressItemId" TEXT,
    "locationNodeId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMaterialRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "entryId" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "neededDate" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "status" "FieldMaterialRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "FieldMaterialPriority" NOT NULL DEFAULT 'MEDIUM',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldMaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMaterialRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(19,4) NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldMaterialRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "issueNote" TEXT,
    "proposalNote" TEXT,
    "note" TEXT,
    "status" "FieldProgressEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "adjustmentReason" TEXT,
    "sourceId" TEXT,
    "sourceLineId" TEXT,
    "sourceMeta" JSONB,
    "sourceReportId" TEXT,
    "sourceType" TEXT,
    "locationNodeId" TEXT,

    CONSTRAINT "FieldProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "itemType" "FieldProgressItemType" NOT NULL DEFAULT 'WORK',
    "code" TEXT,
    "categoryName" TEXT,
    "workContent" TEXT,
    "constructionCrew" TEXT,
    "designQuantity" DECIMAL(19,4),
    "unit" TEXT,
    "status" "FieldProgressItemStatus" NOT NULL DEFAULT 'PLANNED',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldProgressItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressItemAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldProgressItemId" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "role" "FieldProgressItemAssignmentRole" NOT NULL DEFAULT 'RESPONSIBLE',
    "note" TEXT,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldProgressItemAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressItemLocation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldProgressItemId" TEXT NOT NULL,
    "locationNodeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldProgressItemLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldProgressTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FieldProgressTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "group" TEXT,
    "projectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialMovement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "type" "MaterialMovementType" NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unitPrice" DECIMAL(19,4),
    "movementDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "materialRequestId" TEXT,
    "materialRequestItemId" TEXT,
    "materialCodeSnapshot" TEXT,
    "materialNameSnapshot" TEXT,
    "unitSnapshot" TEXT,

    CONSTRAINT "MaterialMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestNo" TEXT NOT NULL,
    "siteReportId" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "neededDate" TIMESTAMP(3),
    "status" "MaterialRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "MaterialRequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "note" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequestItem" (
    "id" TEXT NOT NULL,
    "materialRequestId" TEXT NOT NULL,
    "wbsItemId" TEXT,
    "fieldProgressItemId" TEXT,
    "workItemNameSnapshot" TEXT,
    "materialCode" TEXT,
    "materialName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(19,4) NOT NULL,
    "issuedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "receivedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "remainingQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "locationNodeId" TEXT,

    CONSTRAINT "MaterialRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "href" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(19,4),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "investor" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLocationNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodeType" "ProjectLocationNodeType" NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectLocationNode_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "weather" TEXT,
    "status" "SiteReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "equipmentNote" TEXT,
    "generalNote" TEXT,
    "manpowerCount" INTEGER,
    "rejectedReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "title" TEXT,
    "equipment" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "issues" TEXT,
    "labor" TEXT,
    "materials" TEXT,
    "quality" TEXT,
    "recommendations" TEXT,
    "reportNo" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "reporterName" TEXT,
    "summary" TEXT,
    "type" "SiteReportType" NOT NULL DEFAULT 'DAILY',
    "weatherCondition" "WeatherCondition",
    "weatherNote" TEXT,
    "weatherTemperature" DOUBLE PRECISION,
    "weekEndDate" TIMESTAMP(3),
    "weekStartDate" TIMESTAMP(3),

    CONSTRAINT "SiteReport_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "SiteReportLine" (
    "id" TEXT NOT NULL,
    "siteReportId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsItemId" TEXT,
    "workContent" TEXT NOT NULL,
    "constructionCrew" TEXT,
    "unit" TEXT,
    "designQuantity" DECIMAL(19,4),
    "quantityToday" DECIMAL(19,4) NOT NULL,
    "quantityBefore" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "quantityCumulative" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "issueNote" TEXT,
    "proposalNote" TEXT,
    "area" TEXT,
    "fieldProgressItemId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "workName" TEXT,
    "locationNodeId" TEXT,

    CONSTRAINT "SiteReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteReportPhoto" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteReportPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allowedExtensions" TEXT NOT NULL DEFAULT 'pdf, docx, xlsx, dwg, jpg, png, heic',
    "allowedIpMode" TEXT NOT NULL DEFAULT 'restricted',
    "approvalEscalation" BOOLEAN NOT NULL DEFAULT true,
    "auditSensitiveActions" BOOLEAN NOT NULL DEFAULT true,
    "autoVersioning" BOOLEAN NOT NULL DEFAULT true,
    "automaticBackup" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "companyName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "documentRetentionYears" INTEGER NOT NULL DEFAULT 10,
    "emailDailyDigest" BOOLEAN NOT NULL DEFAULT false,
    "enforceNamingConvention" BOOLEAN NOT NULL DEFAULT true,
    "escalationHours" INTEGER NOT NULL DEFAULT 24,
    "exportRequiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "fieldReportReminder" BOOLEAN NOT NULL DEFAULT true,
    "hotline" TEXT NOT NULL,
    "maintenanceWindow" TEXT NOT NULL DEFAULT '22:00 - 23:00',
    "materialRequestApproval" BOOLEAN NOT NULL DEFAULT true,
    "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 50,
    "passwordRotationDays" INTEGER NOT NULL DEFAULT 90,
    "reminderTime" TEXT NOT NULL DEFAULT '17:30',
    "reportLockAfterApproval" BOOLEAN NOT NULL DEFAULT true,
    "requireTwoFactorForAdmins" BOOLEAN NOT NULL DEFAULT true,
    "retentionYears" INTEGER NOT NULL DEFAULT 7,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "taxCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "trustedDeviceReviewDays" INTEGER NOT NULL DEFAULT 30,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "phone" TEXT,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WBSItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "progress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "budget" DECIMAL(19,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "designQuantity" DECIMAL(19,4),
    "note" TEXT,
    "plannedEndDate" TIMESTAMP(3),
    "plannedStartDate" TIMESTAMP(3),
    "status" "WBSItemStatus" NOT NULL DEFAULT 'PLANNED',
    "unit" TEXT NOT NULL DEFAULT 'Lần',

    CONSTRAINT "WBSItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_code_key" ON "ApprovalRequest"("code");

-- CreateIndex
CREATE INDEX "ApprovalRequest_decidedById_idx" ON "ApprovalRequest"("decidedById");

-- CreateIndex
CREATE INDEX "ApprovalRequest_priority_idx" ON "ApprovalRequest"("priority");

-- CreateIndex
CREATE INDEX "ApprovalRequest_projectId_idx" ON "ApprovalRequest"("projectId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requesterId_idx" ON "ApprovalRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_sourceType_sourceId_idx" ON "ApprovalRequest"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_type_idx" ON "ApprovalRequest"("type");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "Document_fieldProgressItemId_idx" ON "Document"("fieldProgressItemId");

-- CreateIndex
CREATE INDEX "Document_fileHash_idx" ON "Document"("fileHash");

-- CreateIndex
CREATE INDEX "Document_folderId_idx" ON "Document"("folderId");

-- CreateIndex
CREATE INDEX "Document_folderId_status_idx" ON "Document"("folderId", "status");

-- CreateIndex
CREATE INDEX "Document_locationNodeId_idx" ON "Document"("locationNodeId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "DocumentFolder_parentId_idx" ON "DocumentFolder"("parentId");

-- CreateIndex
CREATE INDEX "DocumentFolder_projectId_idx" ON "DocumentFolder"("projectId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_entryId_idx" ON "FieldMaterialRequest"("entryId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_itemId_idx" ON "FieldMaterialRequest"("itemId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_projectId_idx" ON "FieldMaterialRequest"("projectId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequest_templateId_idx" ON "FieldMaterialRequest"("templateId");

-- CreateIndex
CREATE INDEX "FieldMaterialRequestItem_requestId_idx" ON "FieldMaterialRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_entryDate_idx" ON "FieldProgressEntry"("entryDate");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_itemId_idx" ON "FieldProgressEntry"("itemId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_locationNodeId_idx" ON "FieldProgressEntry"("locationNodeId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_projectId_idx" ON "FieldProgressEntry"("projectId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_sourceReportId_idx" ON "FieldProgressEntry"("sourceReportId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_sourceType_sourceId_idx" ON "FieldProgressEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FieldProgressEntry_templateId_idx" ON "FieldProgressEntry"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "field_progress_entry_source_report_line_uidx" ON "FieldProgressEntry"("sourceReportId", "sourceLineId") WHERE (("deletedAt" IS NULL) AND ("sourceType" = 'SITE_REPORT'::text));

-- CreateIndex
CREATE INDEX "FieldProgressItem_parentId_idx" ON "FieldProgressItem"("parentId");

-- CreateIndex
CREATE INDEX "FieldProgressItem_projectId_idx" ON "FieldProgressItem"("projectId");

-- CreateIndex
CREATE INDEX "FieldProgressItem_sortOrder_idx" ON "FieldProgressItem"("sortOrder");

-- CreateIndex
CREATE INDEX "FieldProgressItem_templateId_idx" ON "FieldProgressItem"("templateId");

-- CreateIndex
CREATE INDEX "FieldProgressItemAssignment_fieldProgressItemId_deletedAt_idx" ON "FieldProgressItemAssignment"("fieldProgressItemId", "deletedAt");

-- CreateIndex
CREATE INDEX "FieldProgressItemAssignment_projectId_deletedAt_idx" ON "FieldProgressItemAssignment"("projectId", "deletedAt");

-- CreateIndex
CREATE INDEX "FieldProgressItemAssignment_projectMemberId_deletedAt_idx" ON "FieldProgressItemAssignment"("projectMemberId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FieldProgressItemAssignment_fieldProgressItemId_projectMemb_key" ON "FieldProgressItemAssignment"("fieldProgressItemId", "projectMemberId", "role");

-- CreateIndex
CREATE INDEX "FieldProgressItemLocation_projectId_fieldProgressItemId_idx" ON "FieldProgressItemLocation"("projectId", "fieldProgressItemId");

-- CreateIndex
CREATE INDEX "FieldProgressItemLocation_projectId_locationNodeId_idx" ON "FieldProgressItemLocation"("projectId", "locationNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldProgressItemLocation_fieldProgressItemId_locationNodeI_key" ON "FieldProgressItemLocation"("fieldProgressItemId", "locationNodeId");

-- CreateIndex
CREATE INDEX "FieldProgressTemplate_projectId_idx" ON "FieldProgressTemplate"("projectId");

-- CreateIndex
CREATE INDEX "MaterialItem_projectId_idx" ON "MaterialItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialItem_projectId_code_key" ON "MaterialItem"("projectId", "code");

-- CreateIndex
CREATE INDEX "MaterialMovement_materialItemId_idx" ON "MaterialMovement"("materialItemId");

-- CreateIndex
CREATE INDEX "MaterialMovement_materialRequestId_idx" ON "MaterialMovement"("materialRequestId");

-- CreateIndex
CREATE INDEX "MaterialMovement_materialRequestItemId_idx" ON "MaterialMovement"("materialRequestItemId");

-- CreateIndex
CREATE INDEX "MaterialMovement_movementDate_idx" ON "MaterialMovement"("movementDate");

-- CreateIndex
CREATE INDEX "MaterialMovement_projectId_idx" ON "MaterialMovement"("projectId");

-- CreateIndex
CREATE INDEX "MaterialMovement_projectId_materialItemId_idx" ON "MaterialMovement"("projectId", "materialItemId");

-- CreateIndex
CREATE INDEX "MaterialMovement_projectId_movementDate_idx" ON "MaterialMovement"("projectId", "movementDate");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequest_requestNo_key" ON "MaterialRequest"("requestNo");

-- CreateIndex
CREATE INDEX "MaterialRequest_projectId_idx" ON "MaterialRequest"("projectId");

-- CreateIndex
CREATE INDEX "MaterialRequest_requestNo_idx" ON "MaterialRequest"("requestNo");

-- CreateIndex
CREATE INDEX "MaterialRequest_requestedById_idx" ON "MaterialRequest"("requestedById");

-- CreateIndex
CREATE INDEX "MaterialRequest_siteReportId_idx" ON "MaterialRequest"("siteReportId");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_fieldProgressItemId_idx" ON "MaterialRequestItem"("fieldProgressItemId");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_locationNodeId_idx" ON "MaterialRequestItem"("locationNodeId");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_materialRequestId_idx" ON "MaterialRequestItem"("materialRequestId");

-- CreateIndex
CREATE INDEX "MaterialRequestItem_wbsItemId_idx" ON "MaterialRequestItem"("wbsItemId");

-- CreateIndex
CREATE INDEX "Notification_projectId_createdAt_idx" ON "Notification"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_code_idx" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectLocationNode_parentId_idx" ON "ProjectLocationNode"("parentId");

-- CreateIndex
CREATE INDEX "ProjectLocationNode_projectId_deletedAt_idx" ON "ProjectLocationNode"("projectId", "deletedAt");

-- CreateIndex
CREATE INDEX "ProjectLocationNode_projectId_parentId_sortOrder_idx" ON "ProjectLocationNode"("projectId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLocationNode_projectId_parentId_code_key" ON "ProjectLocationNode"("projectId", "parentId", "code");

-- CreateIndex
CREATE INDEX "ProjectMaterialStock_materialItemId_idx" ON "ProjectMaterialStock"("materialItemId");

-- CreateIndex
CREATE INDEX "ProjectMaterialStock_projectId_idx" ON "ProjectMaterialStock"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMaterialStock_projectId_materialItemId_key" ON "ProjectMaterialStock"("projectId", "materialItemId");

-- CreateIndex
CREATE INDEX "ProjectMember_assignedById_idx" ON "ProjectMember"("assignedById");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteReport_reportNo_key" ON "SiteReport"("reportNo");

-- CreateIndex
CREATE INDEX "SiteReport_createdById_idx" ON "SiteReport"("createdById");

-- CreateIndex
CREATE INDEX "SiteReport_projectId_idx" ON "SiteReport"("projectId");

-- CreateIndex
CREATE INDEX "SiteReport_reportDate_idx" ON "SiteReport"("reportDate");

-- CreateIndex
CREATE INDEX "SiteReportAttachment_reportId_idx" ON "SiteReportAttachment"("reportId");

-- CreateIndex
CREATE INDEX "SiteReportLine_fieldProgressItemId_idx" ON "SiteReportLine"("fieldProgressItemId");

-- CreateIndex
CREATE INDEX "SiteReportLine_locationNodeId_idx" ON "SiteReportLine"("locationNodeId");

-- CreateIndex
CREATE INDEX "SiteReportLine_projectId_idx" ON "SiteReportLine"("projectId");

-- CreateIndex
CREATE INDEX "SiteReportLine_siteReportId_idx" ON "SiteReportLine"("siteReportId");

-- CreateIndex
CREATE INDEX "SiteReportLine_wbsItemId_idx" ON "SiteReportLine"("wbsItemId");

-- CreateIndex
CREATE INDEX "SiteReportPhoto_reportId_idx" ON "SiteReportPhoto"("reportId");

-- CreateIndex
CREATE INDEX "SystemSetting_updatedById_idx" ON "SystemSetting"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "WBSItem_parentId_idx" ON "WBSItem"("parentId");

-- CreateIndex
CREATE INDEX "WBSItem_projectId_idx" ON "WBSItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WBSItem_projectId_code_key" ON "WBSItem"("projectId", "code");

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FieldProgressEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequest" ADD CONSTRAINT "FieldMaterialRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldProgressTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMaterialRequestItem" ADD CONSTRAINT "FieldMaterialRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FieldMaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressEntry" ADD CONSTRAINT "FieldProgressEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldProgressTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FieldProgressItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItem" ADD CONSTRAINT "FieldProgressItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldProgressTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItemAssignment" ADD CONSTRAINT "FieldProgressItemAssignment_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItemLocation" ADD CONSTRAINT "FieldProgressItemLocation_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItemLocation" ADD CONSTRAINT "FieldProgressItemLocation_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressItemLocation" ADD CONSTRAINT "FieldProgressItemLocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressTemplate" ADD CONSTRAINT "FieldProgressTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldProgressTemplate" ADD CONSTRAINT "FieldProgressTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialMovement" ADD CONSTRAINT "MaterialMovement_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialMovement" ADD CONSTRAINT "MaterialMovement_materialRequestId_fkey" FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialMovement" ADD CONSTRAINT "MaterialMovement_materialRequestItemId_fkey" FOREIGN KEY ("materialRequestItemId") REFERENCES "MaterialRequestItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialMovement" ADD CONSTRAINT "MaterialMovement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_siteReportId_fkey" FOREIGN KEY ("siteReportId") REFERENCES "SiteReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequestItem" ADD CONSTRAINT "MaterialRequestItem_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequestItem" ADD CONSTRAINT "MaterialRequestItem_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequestItem" ADD CONSTRAINT "MaterialRequestItem_materialRequestId_fkey" FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequestItem" ADD CONSTRAINT "MaterialRequestItem_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WBSItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectLocationNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocationNode" ADD CONSTRAINT "ProjectLocationNode_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaterialStock" ADD CONSTRAINT "ProjectMaterialStock_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMaterialStock" ADD CONSTRAINT "ProjectMaterialStock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReport" ADD CONSTRAINT "SiteReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReport" ADD CONSTRAINT "SiteReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReport" ADD CONSTRAINT "SiteReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportAttachment" ADD CONSTRAINT "SiteReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SiteReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_fieldProgressItemId_fkey" FOREIGN KEY ("fieldProgressItemId") REFERENCES "FieldProgressItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "ProjectLocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_siteReportId_fkey" FOREIGN KEY ("siteReportId") REFERENCES "SiteReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportLine" ADD CONSTRAINT "SiteReportLine_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WBSItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteReportPhoto" ADD CONSTRAINT "SiteReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SiteReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSItem" ADD CONSTRAINT "WBSItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSItem" ADD CONSTRAINT "WBSItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WBSItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSItem" ADD CONSTRAINT "WBSItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma introspection does not represent this source expression/partial unique index.
-- It was read directly from pg_indexes on the authoritative source database.
CREATE UNIQUE INDEX "FieldProgressItem_active_sibling_code_key"
ON "FieldProgressItem" ("templateId", COALESCE("parentId", ''::text), "code")
WHERE "deletedAt" IS NULL AND "code" IS NOT NULL;
