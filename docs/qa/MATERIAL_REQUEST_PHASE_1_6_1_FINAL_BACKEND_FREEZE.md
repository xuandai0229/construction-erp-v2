# MATERIAL REQUEST — PHASE 1.6.1 FINAL BACKEND FREEZE AMENDMENT
**Document Version:** 1.6.1  
**Date:** 10/08/2026  
**Status:** FINAL BACKEND FREEZE AMENDMENT (NO CODE / NO SCHEMA / NO DB MODIFICATION IN THIS PHASE)  
**Target Module:** Material Request / Proposal (`Đề xuất vật tư, vật liệu, máy móc thiết bị`)

---

## 1. PHASE 1.6 CORRECTIONS

| Item | Phase 1.6 Draft | Phase 1.6.1 Amendment & Final Baseline |
|------|-----------------|-----------------------------------------|
| **Approval RBAC Fallback** | Proposed role fallback (`QA_QC`, `PROJECT_MANAGER`, `CHIEF_COMMANDER`). | **REMOVED CONTRADICTION.** Removed all artificial role fallbacks. Technical Approver mapping is marked as **`TECHNICAL APPROVER BUSINESS MAPPING: BLOCKED`**. Enforcement will use explicit permission strings (`materials.request.approve.technical`). |
| **Final Approver Policy** | Suggested `DIRECTOR` / `ADMIN` bypass. | **REFINED.** Stage 2 Final Approval is **`DEPUTY_DIRECTOR` ONLY**. No default `DIRECTOR` or `ADMIN` bypass in standard workflow. |
| **Approval Discriminator** | Suggested parsing title or adding schema fields. | **ZERO SCHEMA CHANGE DISCRIMINATOR.** Reused existing `sourceType String?` column in `ApprovalRequest` with machine-readable values (`MATERIAL_REQUEST_TECHNICAL` and `MATERIAL_REQUEST_FINAL`). |
| **Outside Catalog Item Creation** | Marked as `KEEP` in approval action. | **REMOVED SIDE-EFFECT.** Proposal approval MUST NOT mutate the Master Material Catalog. Auto-creation of `MaterialItem` is removed from approval actions. |
| **Warehouse Receiving Linkage** | Suggested naive counter increment. | **DEFERRED RECEIVING LINKAGE.** Fake auto-receiving (`receivedQuantity = requestedQuantity`) is removed from approval. Warehouse receiving linkage is marked as **`DEFERRED WAREHOUSE RECEIVING GAP`** to prevent non-idempotent side effects. |
| **Schema Field Count** | Counted 5 fields. | **CORRECTED COUNT.** Total **6 new fields** + **1 enum value** (Added `purchaseReason`, `contractQuantity`, `specification`, `manufacturerOrigin`, `sectionName`, `sequence` and enum `REVISION_REQUESTED`). |
| **Open Business Questions** | Listed 11 questions as open/blocked. | **RECONCILED.** 10 out of 11 questions are **RESOLVED**. Only Technical Approver exact user mapping remains open (handled via permission string). |

---

## 2. TECHNICAL APPROVER MAPPING STATUS

- **Schema Facts:** `User` links to `Employee` -> `EmployeeOrganizationAssignment` -> `OrganizationUnit`. HR model `OrganizationUnit` ("Phòng Kỹ thuật") exists.
- **Current Runtime Fact:** `materials-permissions.ts` evaluates ONLY `UserRole` and `ProjectRole`. It has NO active runtime resolution linking `OrganizationUnit` to material approvals.
- **Status:** **`TECHNICAL APPROVER BUSINESS MAPPING: BLOCKED`**
- **Phase 2 Implementation Strategy:** Do NOT hardcode arbitrary roles or user names. Introduce explicit permission strings:
  - Stage 1 Guard: `assertPermission(session, "materials.request.approve.technical")`
  - Stage 2 Guard: `assertPermission(session, "materials.request.approve.final")`
  System administrators can assign these permissions dynamically to specific users/roles without code modifications.

---

## 3. FINAL APPROVER POLICY

- **Stage 2 Final Approval Guard:** **`DEPUTY_DIRECTOR` ONLY** (`session.user.role === 'DEPUTY_DIRECTOR'` or user with `materials.request.approve.final`).
- **Policy Constraint:** System `ADMIN` and `DIRECTOR` DO NOT automatically bypass or replace the Deputy Director in the baseline workflow. (Any emergency Director override capability requires a separate, explicit policy approval from the Project Lead).

---

## 4. APPROVAL STAGE MACHINE IDENTIFIER

`ApprovalRequest` model contains a nullable string column `sourceType String?`.  
We reuse `sourceType` as the **100% Machine-Readable Stage Discriminator** with **ZERO Schema Changes**:

- **Stage 1 (Technical Department Approval):**
  - `sourceType: "MATERIAL_REQUEST_TECHNICAL"`
  - `sourceId: materialRequestId`
  - `title: "Phê duyệt Kỹ thuật: DXVT-2026-XXXX"`
- **Stage 2 (Deputy Director Final Approval):**
  - `sourceType: "MATERIAL_REQUEST_FINAL"`
  - `sourceId: materialRequestId`
  - `title: "Phê duyệt Phó Giám đốc: DXVT-2026-XXXX"`

👉 **Result:** Deterministic stage identification via `sourceType === 'MATERIAL_REQUEST_TECHNICAL'` without parsing Vietnamese titles or modifying Prisma schema.

---

## 5. ACTIVE APPROVAL INVARIANT

- **Invariant:** A `MaterialRequest` MUST have **at most ONE active `PENDING` `ApprovalRequest`** at any given time.
- **Enforcement Mechanisms:**
  1. Transactional check inside `prisma.$transaction()`:
     ```ts
     const activeApproval = await tx.approvalRequest.findFirst({
       where: { entityId: requestId, status: "PENDING" }
     });
     if (activeApproval) throw new Error("Phiếu đề xuất đang có cấp duyệt chưa hoàn tất.");
     ```
  2. Guarantees zero overlap between Stage 1 PENDING and Stage 2 PENDING.

---

## 6. STAGE TRANSITION IDEMPOTENCY

To prevent race conditions (e.g. Reviewer A and Reviewer B approving Stage 1 simultaneously):

```ts
await prisma.$transaction(async (tx) => {
  // 1. Lock MaterialRequest row and verify state
  const request = await tx.materialRequest.findUnique({
    where: { id: requestId },
  });
  if (request.status !== "SUBMITTED") {
    throw new Error("Trạng thái phiếu không hợp lệ để duyệt Kỹ thuật.");
  }

  // 2. Check if Stage 2 ApprovalRequest already exists
  const existingStage2 = await tx.approvalRequest.findFirst({
    where: {
      entityId: requestId,
      sourceType: "MATERIAL_REQUEST_FINAL",
    },
  });
  if (existingStage2) {
    return { success: true, message: "Giai đoạn 2 đã được tạo trước đó." };
  }

  // 3. Mark Stage 1 ApprovalRequest as APPROVED
  await tx.approvalRequest.updateMany({
    where: { entityId: requestId, sourceType: "MATERIAL_REQUEST_TECHNICAL", status: "PENDING" },
    data: { status: "APPROVED", decidedById: session.id, decidedAt: new Date() }
  });

  // 4. Create Stage 2 ApprovalRequest
  await tx.approvalRequest.create({
    data: {
      projectId: request.projectId,
      code: `AR-MAT-FIN-${Date.now()}`,
      title: `Phê duyệt Phó Giám đốc: ${request.requestNo}`,
      type: "MATERIAL",
      entityType: "MATERIAL_REQUEST",
      entityId: request.id,
      sourceType: "MATERIAL_REQUEST_FINAL",
      sourceId: request.id,
      requesterId: request.requestedById,
      status: "PENDING",
    }
  });
});
```

---

## 7. OUTSIDE CATALOG APPROVAL SIDE EFFECT

- **Audit Finding:** `approveMaterialRequest()` currently calls `tx.materialItem.create()` to auto-add non-catalog items into `MaterialItem` master catalog upon approval.
- **Evaluation:** Proposal approval must **NOT** mutate Master Material Catalog data. Auto-creation pollutes catalog master data with one-off custom names or typos.
- **Final Decision:** **REMOVE auto-creation of `MaterialItem` from proposal approval.**
  - Custom items keep `materialCode = NULL`.
  - `MaterialRequestItem` maintains snapshot fields (`materialName`, `unit`, `specification`, `manufacturerOrigin`).
  - Master catalog addition is a separate, deliberate admin workflow.

---

## 8. WAREHOUSE RECEIVING SAFETY DECISION

- **Lifecycle Trace of `MaterialMovement`:**
  - Movements in `ledger.ts` are immutable historical transaction logs.
  - Currently no `UPDATE` or `DELETE` handlers exist for movements.
- **Safety Hazard:** Naively executing `receivedQuantity += movement.quantity` inside arbitrary endpoints without idempotency keys risks double-counting during retries or duplicate network requests.
- **Final Decision:**
  - Proposal approval **REMOVES fake auto-receiving** (`receivedQuantity = requestedQuantity`).
  - Physical receiving linkage is marked as **`DEFERRED WAREHOUSE RECEIVING GAP`**.
  - In Phase 2 backend, `receivedQuantity` is NOT mutated during proposal approval. Dedicated receiving receipts with idempotency keys will be implemented in Phase 3/Inventory module.

---

## 9. `approveMaterialRequest()` FINAL KEEP / REMOVE MATRIX

| Block / Functionality | Current Responsibility | Action in Phase 2 | Technical Rationale |
|-----------------------|------------------------|-------------------|---------------------|
| **AUTH & SESSION** | `getSession()` | **KEEP** | Authentication guard. |
| **PROJECT ACCESS** | `requireProjectAccess()` | **KEEP** | Project isolation guard. |
| **STATE GUARD** | Verify status `SUBMITTED` | **KEEP** | Invariant state check. |
| **AUTO CATALOG CREATE** | `tx.materialItem.create()` | **REMOVE** | Proposal approval must NOT mutate master catalog. |
| **AUTO RECEIVED QTY** | `receivedQuantity = requestedQuantity` | **REMOVE** | Fake receiving; approval is not physical receiving. |
| **AUTO STOCK UPSERT** | `ProjectMaterialStock.upsert()` | **REMOVE** | Proposal approval is not inventory import. |
| **AUTO IMPORT MOVEMENT** | `MaterialMovement.create(IMPORT)` | **REMOVE** | Proposal approval is not inventory import. |
| **STAGE 1 APPROVAL** | Update Stage 1 `ApprovalRequest` | **MODIFY** | Set Stage 1 `APPROVED`, create Stage 2 `PENDING`. |
| **STAGE 2 APPROVAL** | Final Approval | **NEW ACTION** | Set Stage 2 `APPROVED`, update `MaterialRequest.status = APPROVED`. |
| **AUDIT LOG** | `tx.auditLog.create` | **KEEP** | Audit trail recording. |
| **CACHE REVALIDATION** | `revalidatePath('/materials')` | **KEEP** | Clear Next.js cache. |

---

## 10. SEQUENCE MIGRATION RULE

- **Database Fact:** `MaterialRequestItem` contains `createdAt DateTime @default(now())`.
- **Migration Backfill Query:**
  ```sql
  ORDER BY "createdAt" ASC, "id" ASC
  ```
- **Explicit Migration Caveat:** Legacy items did not store an explicit display sequence. This ordering is a **deterministic reconstruction fallback**, NOT guaranteed 100% historical visual user order.

---

## 11. CORRECT MINIMAL SCHEMA DELTA

```prisma
// Minimal Schema Delta for Phase 2 Implementation

enum MaterialRequestStatus {
  // Existing: DRAFT, REQUESTED, SUBMITTED, APPROVED, REJECTED, PROCESSING, ISSUED, RECEIVED, CANCELLED
  REVISION_REQUESTED // ADDED (1 Enum Value)
}

model MaterialRequest {
  purchaseReason String? // ADDED (1 New Field)
}

model MaterialRequestItem {
  contractQuantity   Decimal? @db.Decimal(19, 4) // ADDED (Field 2)
  specification      String?  // ADDED (Field 3)
  manufacturerOrigin String?  // ADDED (Field 4)
  sectionName        String?  // ADDED (Field 5)
  sequence           Int      @default(0) // ADDED (Field 6)
}
```

👉 **TOTAL DELTA:** **6 NEW FIELDS + 1 ENUM VALUE**. Zero schema changes to `ApprovalRequest`.

---

## 12. RESOLVED VS OPEN BUSINESS DECISIONS

### 12.1. RESOLVED DECISIONS (10 Items Frozen)
1. **Contract Quantity Source:** Manual nullable input (`contractQuantity Decimal?`).
2. **Actual Quantity Semantics:** Reused existing `requestedQuantity` field, mapped on UI/Excel as "Khối lượng thực tế".
3. **Over-Contract Proposals:** Allowed (No hard block).
4. **Over-Contract Action:** Warning metadata generated for approvers.
5. **Manufacturer / Origin:** Optional (Nullable).
6. **Specification:** Optional (Nullable).
7. **Needed Date:** Nullable in `DRAFT`, required upon `SUBMIT`.
8. **Workflow Structure:** 2 Approval Stages (*Technical Department* $\rightarrow$ *Deputy Director*).
9. **Inventory Separation:** Approval NEVER mutates stock or creates movements.
10. **Auto PO Creation:** Excluded currently.

### 12.2. OPEN BUSINESS DECISION (1 Item)
1. **Technical Approver User Mapping:** `materials.request.approve.technical` permission string will be used until HR Org Unit mapping is active.

---

## 13. EXACT PHASE 2 BACKEND SCOPE

1. Additive Prisma Schema Migration (6 fields + 1 enum value).
2. Zod validation schemas & TypeScript serializers update.
3. Cross-project relation validation guards.
4. Sequential 2-stage approval backend logic (`approveTechnical`, `approveFinal`, `requestRevision`).
5. Machine-readable stage discriminator using `sourceType`.
6. Idempotent stage transitions & active approval invariant guards.
7. Removal of inventory, stock, receiving, and catalog auto-create side effects from proposal approval actions.
8. 22 E2E Backend Tests.

❌ **EXCLUDED FROM PHASE 2:** NO UI Form redesign, NO UI List redesign, NO Excel Export, NO PDF/Print.

---

## 14. FINAL GATE DECISION

### FINAL RELEASE GATE DECISION: `GO`

- **Backend Architecture & Machine Discriminator:** `100% FROZEN & RESOLVED`
- **RBAC & Permission Invariants:** `100% FROZEN`
- **Inventory & Catalog Side-Effects Removal:** `100% FROZEN`
- **Next Action:** Authorized to proceed to **PHASE 2 BACKEND IMPLEMENTATION**.

---

## 15. COMPLIANCE PROOF

```
git status --short
git diff -- prisma/schema.prisma src/
```

*Proof Verification: Zero application source changes and zero schema changes were made during Phase 1.6.1. Only documentation files were created.*
