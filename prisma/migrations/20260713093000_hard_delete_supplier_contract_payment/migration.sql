-- Destructive migration intentionally removes the Supplier, Contract and Payment domains.
-- Pre-migration backup: backups/construction-erp-v2-pre-financial-hard-delete-20260713.dump

-- Remove workflow and notification records that belong exclusively to deleted domains.
DELETE FROM "Notification"
WHERE upper("type") IN ('PAYMENT', 'CONTRACT', 'SUPPLIER')
   OR "href" LIKE '/accounting%'
   OR "href" LIKE '/contracts%'
   OR "href" LIKE '/suppliers%';

DELETE FROM "ApprovalRequest"
WHERE "type"::text IN ('PAYMENT', 'CONTRACT')
   OR upper(COALESCE("sourceType", '')) IN ('PAYMENT', 'PAYMENT_REQUEST', 'CONTRACT', 'SUPPLIER');

DELETE FROM "AuditLog"
WHERE upper("entityType") IN ('SUPPLIER', 'CONTRACT', 'PAYMENTPLAN', 'PAYMENT_PLAN', 'PAYMENTRECORD', 'PAYMENT_RECORD', 'PAYMENTREQUEST', 'PAYMENT_REQUEST')
   OR upper("action") LIKE '%SUPPLIER%'
   OR upper("action") LIKE '%CONTRACT%'
   OR upper("action") LIKE '%PAYMENT%';

-- Preserve documents while moving folders out of removed financial taxonomy.
UPDATE "DocumentFolder"
SET "name" = CASE "name"
  WHEN '01. Hợp đồng pháp lý' THEN '01. Hồ sơ pháp lý công trình'
  WHEN '01_Hop_dong_Phap_ly' THEN '01. Hồ sơ pháp lý công trình'
  WHEN '01_Hop_dong' THEN '01. Hồ sơ pháp lý công trình'
  WHEN '01_Hop_Đồng' THEN '01. Hồ sơ pháp lý công trình'
  WHEN '02_Phu_luc_hop_dong' THEN '01. Hồ sơ pháp lý công trình'
  WHEN '03_Bao_lanh_Bao_hiem' THEN '01. Hồ sơ pháp lý công trình'
  WHEN '07. Thanh toán quyết toán' THEN '06. Báo cáo hiện trường'
  WHEN '07_Thanh_toan_Quyet_toan' THEN '06. Báo cáo hiện trường'
  WHEN '05_Hóa đơn' THEN '04. Vật tư thiết bị'
  WHEN '06_Thanh toán' THEN '06. Báo cáo hiện trường'
  ELSE "name"
END;

-- Rebuild the approval enum without financial types and add construction-operation types.
ALTER TABLE "ApprovalRequest" ALTER COLUMN "type" DROP DEFAULT;
ALTER TYPE "ApprovalRequestType" RENAME TO "ApprovalRequestType_financial_old";
CREATE TYPE "ApprovalRequestType" AS ENUM (
  'MATERIAL', 'REPORT', 'VOLUME', 'INSPECTION', 'PLAN', 'DRAWING',
  'METHOD_STATEMENT', 'SAFETY', 'QUALITY', 'SITE_ISSUE', 'CHANGE_ORDER', 'OTHER'
);
ALTER TABLE "ApprovalRequest"
  ALTER COLUMN "type" TYPE "ApprovalRequestType"
  USING ("type"::text::"ApprovalRequestType");
ALTER TABLE "ApprovalRequest" ALTER COLUMN "type" SET DEFAULT 'OTHER';
DROP TYPE "ApprovalRequestType_financial_old";
ALTER TABLE "ApprovalRequest" DROP COLUMN "amount";

-- Remove settings that only controlled the deleted domains.
ALTER TABLE "SystemSetting"
  DROP COLUMN "requireProjectCodeBeforeSpending",
  DROP COLUMN "paymentTwoStepApproval",
  DROP COLUMN "contractValueThreshold",
  DROP COLUMN "fiscalYearStartMonth";

-- ACCOUNTANT was a finance-only system role. Preserve users by mapping them to STAFF.
ALTER TYPE "UserRole" RENAME TO "UserRole_financial_old";
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR', 'CHIEF_COMMANDER', 'MANAGER', 'ENGINEER', 'STAFF');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (CASE WHEN "role"::text = 'ACCOUNTANT' THEN 'STAFF' ELSE "role"::text END)::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';
DROP TYPE "UserRole_financial_old";

-- Child tables first, then their parents.
DROP TABLE "PaymentRecord";
DROP TABLE "PaymentPlan";
DROP TABLE "PaymentRequest";
DROP TABLE "Contract";
DROP TABLE "Supplier";

DROP TYPE "PaymentStatus";
DROP TYPE "PaymentRequestStatus";
DROP TYPE "PaymentRequestType";
DROP TYPE "ContractStatus";
DROP TYPE "ContractType";
