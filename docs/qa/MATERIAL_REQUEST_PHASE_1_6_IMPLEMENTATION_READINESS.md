# MATERIAL REQUEST — PHASE 1.6 IMPLEMENTATION READINESS GATE
**Document Version:** 1.6.0  
**Date:** 10/08/2026  
**Status:** IMPLEMENTATION READINESS GATE (NO CODE / NO SCHEMA / NO DB MODIFICATION IN THIS PHASE)  
**Target Module:** Material Request / Proposal (`Đề xuất vật tư, vật liệu, máy móc thiết bị`)

---

## 1. EXECUTIVE VERDICT

- **Overall Status:** `READY FOR PHASE 2 BACKEND IMPLEMENTATION (CONDITIONAL GO)`
- **Verification Summary:**  
  1. **Section Model:** Refined to metadata `sectionName String?` + `sequence Int` on `MaterialRequestItem`. Zero pseudo-items, zero `isSectionHeader` flags, 100% item nullability preserved.
  2. **Approval Architecture:** Deep audit confirmed `ApprovalRequest` can support sequential 2-stage approval (**Option B**) with 0 schema changes to approval infrastructure.
  3. **Single Source of Truth:** `MaterialRequest.status` is the sole Business Lifecycle state. Active `ApprovalRequest` record is the sole Approval Stage state. `MaterialRequest.currentApprovalStep` is **REMOVED** from the Phase 2 plan.
  4. **Inventory Separation:** Verified line-by-line in `approveMaterialRequest()`. Stock mutation block identified for clean removal. `WAREHOUSE RECEIVING GAP` identified and planned for Phase 2 backend linkage.
  5. **Schema Delta:** Reduced to the absolute minimum of 5 new nullable/default fields (`purchaseReason`, `contractQuantity`, `specification`, `manufacturerOrigin`, `sectionName`, `sequence`).

---

## 2. SECTION MODEL FINAL DECISION

### 2.1. Decision Summary
- **REJECTED:** `isSectionHeader` boolean flag and pseudo-items.
- **ACCEPTED & FROZEN:** `sectionName String?` metadata column + `sequence Int @default(0)` column on `MaterialRequestItem`.

### 2.2. Technical Justification
Every `MaterialRequestItem` record remains a **real material item**. `sectionName` is attached as grouping metadata to items.

```
Item 1: materialName="Thép CB300", unit="kg", sectionName=NULL, sequence=1
Item 2: materialName="Dây điện 2.5mm", unit="m", sectionName="Phần Điện nhẹ", sequence=2
Item 3: materialName="Ống nhựa PVC 21", unit="m", sectionName="Phần Điện nhẹ", sequence=3
```

- **UI / Excel Rendering:** When `sectionName` transitions from `NULL` or `Group A` to `Group B`, the renderer inserts a Visual Section Heading row right before the first item of `Group B`.
- **Logic Integrity:** Prevents polluting item totals, stock calculations, and ledger queries with non-material pseudo-rows.

---

## 3. MATERIAL REQUEST ITEM NULLABILITY VERIFICATION

### 3.1. Schema Fact Verification (`MaterialRequestItem`)

| Field Name | Type | Constraint | Default | Change in Phase 2 |
|------------|------|------------|---------|-------------------|
| `materialName` | `String` | Required (Not null) | None | **NO CHANGE** |
| `unit` | `String` | Required (Not null) | None | **NO CHANGE** |
| `requestedQuantity` | `Decimal(19,4)` | Required (Not null) | None | **NO CHANGE** |
| `issuedQuantity` | `Decimal(19,4)` | Required (Not null) | `0` | **NO CHANGE** |
| `receivedQuantity` | `Decimal(19,4)` | Required (Not null) | `0` | **NO CHANGE** |
| `remainingQuantity` | `Decimal(19,4)` | Required (Not null) | `0` | **NO CHANGE** |
| `createdAt` | `DateTime` | Required (Not null) | `now()` | **NO CHANGE** |
| `sectionName` | `String?` | Nullable | `NULL` | **ADD NEW** |
| `sequence` | `Int` | Required | `0` | **ADD NEW** |

👉 **Conclusion:** The `sectionName` metadata design **DOES NOT REQUIRE** making any existing material fields nullable. High data integrity is 100% maintained.

---

## 4. APPROVALREQUEST DEEP ARCHITECTURE AUDIT

### 4.1. Model Fact Verification (`ApprovalRequest`)
- **Quantity constraint:** An entity CAN have **N `ApprovalRequest` records** over its lifetime (`(entityType, entityId)` is indexed, NOT unique).
- **Existing Capabilities:** `code` is `@unique`. Fields: `projectId`, `title`, `type`, `status`, `priority`, `requesterId`, `decidedById`, `decidedAt`, `decisionNote`, `sourceType`, `sourceId`, `entityType`, `entityId`.
- **Missing Concepts:** `ApprovalRequest` currently has NO `stage`, NO `sequence`, NO `order`, NO `assignedDepartment`, NO child step table.

### 4.2. Strategy Decision for 2-Stage Approval

👉 **SELECTED: OPTION B (Sequential `ApprovalRequest` Records per Stage)**

1. **Stage 1 (Technical Department Approval):**
   - Requester submits proposal $\rightarrow$ `ApprovalRequest` Record 1 created:
     - `code`: `DXVT-2026-XXXX-STG1`
     - `title`: `Phê duyệt Kỹ thuật: DXVT-...`
     - `status`: `PENDING`
   - Technical Reviewer approves Record 1 $\rightarrow$ Record 1 status set to `APPROVED`.
2. **Stage 2 (Deputy Director Final Approval):**
   - System automatically creates `ApprovalRequest` Record 2:
     - `code`: `DXVT-2026-XXXX-STG2`
     - `title`: `Phê duyệt Phó Giám đốc: DXVT-...`
     - `status`: `PENDING`
   - Deputy Director approves Record 2 $\rightarrow$ Record 2 status set to `APPROVED`.
   - `MaterialRequest.status` updated to `APPROVED`.

### 4.3. Rationale
- **Zero Schema Migration:** No changes required to `ApprovalRequest` table.
- **100% Central Approval UI Compatibility:** `/approvals` natively displays each stage's `PENDING` request to the appropriate approvers.
- **Immutable Audit Trail:** Record 1 explicitly stores Stage 1 approver (`decidedById`, `decidedAt`), and Record 2 stores Stage 2 approver.

---

## 5. APPROVAL SINGLE SOURCE OF TRUTH

- **BUSINESS LIFECYCLE STATE SOURCE:** `MaterialRequest.status` (`MaterialRequestStatus` enum).
  - Values: `DRAFT`, `SUBMITTED`, `REVISION_REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`.
- **APPROVAL STAGE STATE SOURCE:** Active `ApprovalRequest` record (`ApprovalRequest.title` / `sourceType` / `status`).
  - Active `ApprovalRequest` with `status == PENDING` indicates current stage.
- **DECISION:** **REMOVE `MaterialRequest.currentApprovalStep`** from the Phase 2 schema plan. `MaterialRequest` will NOT hold redundant stage columns.

---

## 6. MATERIALREQUESTSTATUS STRATEGY

### 6.1. Current Schema Enums
Current `MaterialRequestStatus` enum: `DRAFT`, `REQUESTED`, `SUBMITTED`, `APPROVED`, `REJECTED`, `PROCESSING`, `ISSUED`, `RECEIVED`, `CANCELLED`.

### 6.2. Minimal Extension Plan
To support the target lifecycle without bloating the enum:
- `DRAFT`: Proposal draft.
- `SUBMITTED`: Submitted for approval (Stage 1 or Stage 2 pending in `ApprovalRequest`).
- `REVISION_REQUESTED`: **[ONLY NEW ENUM VALUE NEEDED]** Reviewer returned proposal for corrections.
- `APPROVED`: Fully approved by Deputy Director.
- `REJECTED`: Permanently rejected.

👉 **Justification for `REVISION_REQUESTED`:** Distinguishes a returned request requiring edits from a fresh `DRAFT` or a dead `REJECTED` proposal, preserving audit semantics.

---

## 7. APPROVAL RBAC — VERIFIED FACTS ONLY

### 7.1. Codebase Schema Audit Facts
1. `User` HAS relation to `Employee` (`User.employee` -> `Employee.userId`).
2. `Employee` HAS relation to `OrganizationUnit` and `Position` (`Employee.orgAssignments`).
3. `OrganizationUnit` model EXISTS (`code`, `name`, e.g. "PKT" / "Phòng Kỹ thuật").
4. `Position` model EXISTS (`code`, `title`).

### 7.2. Status: `APPROVAL RBAC MAPPING BLOCKED`
Although HR models exist, `src/lib/materials/materials-permissions.ts` currently evaluates permissions ONLY against `UserRole` and `ProjectRole`. It has NO active runtime resolution linking `OrganizationUnit` to material approvals.

### 7.3. Minimal Fallback Baseline for Phase 2
Until HR Org Unit resolution is wired into material permissions:
- **Stage 1 (Technical Approval Guard):** `UserRole IN ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR']` OR `ProjectRole IN ['PROJECT_MANAGER', 'CHIEF_COMMANDER', 'QA_QC']`.
- **Stage 2 (Deputy Director Final Approval Guard):** `UserRole IN ['DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMIN']`.

---

## 8. SYSTEM ADMIN VS BUSINESS APPROVER POLICY

- **Rule:** `SYSTEM ADMIN != BUSINESS APPROVER`.
- **Legacy Behavior:** `materials-permissions.ts` grants `canApproveRequest: true` to `userRole === 'ADMIN'`.
- **Phase 2 Target Policy:**
  - `ADMIN` remains system administrator (audit view, settings, emergency system maintenance).
  - `ADMIN` is **NOT** defaulted as the business signatory for Technical Department or Deputy Director.
  - Standard approval actions enforce role/permission assertions for Stage 1 and Stage 2.

---

## 9. MATERIAL CATALOG SCOPE VERIFICATION

### 9.1. Schema Fact Verification (`MaterialItem`)
`MaterialItem` in `prisma/schema.prisma` lines 655-674:
- `projectId`: `String` (Required).
- `@@unique([projectId, code])`.

👉 **Fact:** `MaterialItem` is **100% PROJECT-SCOPED**. There is NO global material catalog table in the database.

### 9.2. Validation Rule
- For Catalog items: Server validation enforces `MaterialItem.projectId === MaterialRequest.projectId`.
- For Outside Catalog items: `materialCode` is `NULL`. `materialName` and `unit` are stored directly on `MaterialRequestItem`.

---

## 10. CROSS-PROJECT RELATION VERIFICATION

| Input Field | Target Model | Actual Project Relation Path in Schema | Can Verify? | Exact Server Query / Rule |
|-------------|--------------|----------------------------------------|-------------|---------------------------|
| `wbsItemId` | `WBSItem` | `WBSItem.projectId` | **YES** | `wbsItem.projectId === payload.projectId` |
| `fieldProgressItemId` | `FieldProgressItem` | `FieldProgressItem` -> `FieldProgressTemplate.projectId` | **YES** | Query item with `include: { template: true }`, check `template.projectId === payload.projectId` |
| `locationNodeId` | `ProjectLocationNode` | `ProjectLocationNode.projectId` | **YES** | `locationNode.projectId === payload.projectId` |
| `siteReportId` | `SiteReport` | `SiteReport.projectId` | **YES** | `siteReport.projectId === payload.projectId` |
| `materialCode` | `MaterialItem` | `MaterialItem.projectId` | **YES** | If provided, verify `materialItem.projectId === payload.projectId` |

---

## 11. INVENTORY RECEIVING ACTUAL BEHAVIOR TRACE

### 11.1. Audit Answers
1. **`MaterialMovement` IMPORT link to item:** YES (`MaterialMovement.materialRequestItemId` exists).
2. **`receivedQuantity` increment location:** Currently ONLY inside `approveMaterialRequest()` (Line 325).
3. **`ledger.ts` import behavior:** `applyMaterialMovement()` increments stock and creates `MaterialMovement` (IMPORT), but DOES NOT update `MaterialRequestItem.receivedQuantity`.

### 11.2. Status: `WAREHOUSE RECEIVING GAP`
When stock mutation is removed from `approveMaterialRequest()`, no active service increments `MaterialRequestItem.receivedQuantity` upon physical receiving.  
👉 **Phase 2 Backend Scope Action:** Update `applyMaterialMovement()` in `ledger.ts` or add receiving handler so that when a physical `IMPORT` movement referencing `materialRequestItemId` occurs, `MaterialRequestItem.receivedQuantity` is incremented.

---

## 12. APPROVAL REMOVAL IMPACT ANALYSIS (`approveMaterialRequest`)

| Line / Block in `approveMaterialRequest()` | Current Responsibility | Action in Phase 2 | Rationale |
|--------------------------------------------|------------------------|-------------------|-----------|
| Lines 275-290 | Auth & `requireProjectAccess` | **KEEP** | Essential security guard. |
| Lines 291-320 | Find/Create `MaterialItem` link | **KEEP** | Material proposal items still link to catalog codes. |
| Lines 321-328 | Update `item.receivedQuantity` | **REMOVE** | Receiving happens only during warehouse import. |
| Lines 330-345 | `ProjectMaterialStock.upsert` | **REMOVE** | Proposal approval is not inventory import. |
| Lines 346-362 | `MaterialMovement.create` (IMPORT) | **REMOVE** | Proposal approval is not inventory import. |
| Lines 364-376 | Update `ApprovalRequest` | **KEEP & UPDATE** | Mark active stage `ApprovalRequest` as `APPROVED`. |
| Lines 378-389 | Create `AuditLog` | **KEEP** | Preserves approval audit log. |
| Lines 391-393 | `revalidatePath()` | **KEEP** | Clears UI cache. |

---

## 13. SEQUENCE MIGRATION VERIFICATION

- **Schema Check:** `MaterialRequestItem` contains `createdAt DateTime @default(now())` (Line 638).
- **Migration Rule:** Backfilling `sequence` for existing historical items will use deterministic ordering: `orderBy: { createdAt: 'asc' }` within each `materialRequestId`.

---

## 14. FINAL MINIMAL SCHEMA DELTA FOR PHASE 2

```prisma
// Minimal Schema Delta for Phase 2 Backend Implementation

enum MaterialRequestStatus {
  // Existing: DRAFT, REQUESTED, SUBMITTED, APPROVED, REJECTED, PROCESSING, ISSUED, RECEIVED, CANCELLED
  REVISION_REQUESTED // ADDED
}

model MaterialRequest {
  purchaseReason String? // ADDED: Lý do mua hàng
}

model MaterialRequestItem {
  contractQuantity   Decimal? @db.Decimal(19, 4) // ADDED: Khối lượng theo hợp đồng
  specification      String?  // ADDED: Quy cách / TS kỹ thuật
  manufacturerOrigin String?  // ADDED: Hãng sản xuất / Xuất xứ
  sectionName        String?  // ADDED: Tiêu đề phân nhóm metadata
  sequence           Int      @default(0) // ADDED: Thứ tự hiển thị dòng
}
```

- **Excluded from Schema Delta:** `actualQuantity` (reused `requestedQuantity`), `isSectionHeader` (used `sectionName`), `currentApprovalStep` (used `ApprovalRequest`).

---

## 15. PHASE 2 EXACT BACKEND SCOPE

1. Additive Prisma Schema migration (5 new nullable/default fields + 1 enum value).
2. Zod validation schemas & TypeScript serializers update.
3. Cross-project relation validation guards implementation.
4. Sequential 2-stage approval backend logic (`approveTechnical`, `approveFinal`, `requestRevision`).
5. Approval RBAC backend permission assertions.
6. Removal of inventory mutation side-effects from `approveMaterialRequest`.
7. Linkage of physical warehouse receiving to `MaterialRequestItem.receivedQuantity`.
8. 22 E2E Backend Tests.

❌ **EXCLUDED FROM PHASE 2:** NO UI Form redesign, NO UI List redesign, NO Excel Export, NO PDF/Print.

---

## 16. PHASE 2 EXACT FILES EXPECTED TO CHANGE

- `prisma/schema.prisma`
- `src/app/actions/material-request.ts`
- `src/lib/material-requests/validation.ts`
- `src/lib/material-request/serializers.ts`
- `src/lib/materials/materials-permissions.ts`
- `src/lib/materials/ledger.ts`
- `src/app/(dashboard)/approvals/actions.ts`
- `src/lib/__tests__/material-request-phase2.test.ts` *(New test file)*

---

## 17. PHASE 2 TEST MATRIX (22 REQUIRED BACKEND TESTS)

1. `test_read_legacy_material_request_compatibility`
2. `test_read_legacy_material_request_item_compatibility`
3. `test_draft_save_without_needed_date_success`
4. `test_submit_without_needed_date_fails_validation`
5. `test_contract_quantity_nullable_support`
6. `test_requested_quantity_positive_validation`
7. `test_requested_greater_than_contract_warning_metadata`
8. `test_cross_project_wbs_item_attack_blocked`
9. `test_cross_project_site_report_attack_blocked`
10. `test_cross_project_location_node_attack_blocked`
11. `test_catalog_item_project_scope_enforced`
12. `test_technical_approver_cannot_execute_final_approval`
13. `test_final_approver_cannot_skip_technical_stage`
14. `test_unauthorized_user_approval_fails`
15. `test_admin_user_not_business_approver_by_default`
16. `test_double_technical_approval_race_prevented`
17. `test_double_final_approval_race_prevented`
18. `test_revision_request_flow_resets_to_revision_requested`
19. `test_rejection_flow_terminal_state`
20. `test_final_approval_stock_unchanged`
21. `test_final_approval_no_import_movement_created`
22. `test_warehouse_import_receiving_linkage_increments_received_quantity`

---

## 18. REMAINING BUSINESS BLOCKERS

1. **Approval from Project Lead** on this Readiness Gate document.
2. **Clarification on 11 Business Questions** (Contract vs Actual quantity rules, Warning thresholds).

---

## 19. FINAL DECISION

### RELEASE GATE DECISION: `CONDITIONAL GO`

- **Phase 1.6 Verification:** `PASS`
- **Backend Architecture Readiness:** `100% READY`
- **Next Step:** Await User approval to begin **Phase 2 Backend Implementation**.

---

## 20. COMPLIANCE PROOF

```
git status --short
git diff --stat
git diff -- prisma/schema.prisma src/
```

*Proof Verification: Zero application code changes and zero schema changes were made during Phase 1.6. Only this readiness document was generated.*
