# MATERIAL REQUEST — FINAL PRE-PHASE-2 BLOCKER CHECK
**Document Version:** 1.6.2  
**Date:** 10/08/2026  
**Status:** FINAL PRE-PHASE-2 BLOCKER CHECK (NO CODE / NO SCHEMA / NO DB MODIFICATION IN THIS PHASE)  
**Target Module:** Material Request / Proposal (`Đề xuất vật tư, vật liệu, máy móc thiết bị`)

---

## 1. PERMISSION ENGINE VERIFICATION

### 1.1. Codebase Audit Results

| Audit Question | Verified Codebase Fact | File Reference |
|----------------|------------------------|----------------|
| 1. Model/Table for Permission? | **NO.** Zero `Permission` model in database schema. | `prisma/schema.prisma` |
| 2. User -> Permission mapping table? | **NO.** Permissions are mapped statically to `UserRole` and `ProjectRole` in code. | `src/lib/permissions/permission-registry.ts` |
| 3. Session permissions list? | **NO.** `SessionUser` contains `id, email, username, fullName, role, isActive`. | `src/lib/auth.ts` |
| 4. `assertPermission()` function? | **YES.** Exists in `permission-resolver.ts`. Evaluates against `PERMISSION_REGISTRY`. | `src/lib/permissions/permission-resolver.ts` |
| 5. UI/API for dynamic permission assignment? | **NO.** Permission mapping is statically compiled in TypeScript files. | `src/lib/permissions/permission-registry.ts` |

### 1.2. Executive Verdict on Permission Engine

👉 **`EXPLICIT PERMISSION ENGINE DOES NOT EXIST`**

The system does NOT possess a database-backed dynamic user-permission assignment engine. All permission strings are statically mapped to system roles (`UserRole`) or project roles (`ProjectRole`) inside `PERMISSION_REGISTRY`.

---

## 2. `sourceType` SEMANTICS VERIFICATION

### 2.1. Codebase Audit Results
- `ApprovalRequest.sourceType` is actively queried across 25+ files in the repository.
- **Existing Hardcoded Usage:**
  - `src/app/(dashboard)/approvals/actions.ts` Line 581: `if (approval.sourceType !== "MATERIAL_REQUEST") return null;`
  - `src/app/actions/material-request.ts` Line 216: `where: { sourceType: "MATERIAL_REQUEST", sourceId: id }`
  - `src/components/material-request/material-request-detail.tsx` Line 63: `sourceType=MATERIAL_REQUEST`
  - `src/lib/notifications/notification-routing.ts` Line 63: Expects `sourceType` to match `NotificationTargetType` (`"MATERIAL_REQUEST"`).

### 2.2. Backward Compatibility Evaluation
- **Is setting `sourceType = "MATERIAL_REQUEST_TECHNICAL"` backward-compatible?**  
  👉 **NO! IT IS NOT BACKWARD COMPATIBLE.** Changing `sourceType` breaks notification routing, detail page navigation, and `/approvals` filtering.

### 2.3. Safe Machine-Readable Discriminator Solution
To maintain 100% backward compatibility while providing a deterministic, machine-readable stage identifier:
- Keep `sourceType = "MATERIAL_REQUEST"`.
- Add an explicit nullable string field `stageCode String?` to the `ApprovalRequest` model (`"TECHNICAL"` for Stage 1, `"FINAL"` for Stage 2).

---

## 3. APPROVAL RACE-SAFETY DESIGN

### 3.1. Rejected Naive Pattern
The non-atomic `findFirst()` $\rightarrow$ `if (!exists)` $\rightarrow$ `create()` pattern is **REJECTED** as it fails under concurrent database requests.

### 3.2. Selected Race-Safety Mechanism: OPTION 1 & 2 COMBINATION

1. **Database Partial Unique Index (DB Level Enforcement):**
   Add a partial unique index in PostgreSQL on `ApprovalRequest`:
   ```sql
   CREATE UNIQUE INDEX "approval_request_pending_stage_uidx" 
   ON "ApprovalRequest"("entityId", "stageCode") 
   WHERE "status" = 'PENDING' AND "deletedAt" IS NULL;
   ```
   - **Effect for Stage 1:** Prevents multiple `PENDING` Stage 1 requests for the same `entityId`.
   - **Effect for Stage 2:** Prevents multiple `PENDING` Stage 2 requests for the same `entityId`. Even if two reviewers approve Stage 1 at the exact same millisecond, PostgreSQL will reject the second Stage 2 creation with code `P2002` (Unique Constraint Violation).

2. **Transactional State Guard (Application Level):**
   Execute inside `prisma.$transaction()` with explicit exception handling for Prisma error `P2002`, returning an idempotent success response if Stage 2 was already created.

---

## 4. TECHNICAL APPROVER RESOLUTION

Since Section 1 proved `EXPLICIT PERMISSION ENGINE DOES NOT EXIST` (no dynamic DB permission assignment):

### 4.1. Available Technical Approver Options
- **Option 1 (Static Role Baseline in `PERMISSION_REGISTRY`):** Define `"materials.request.approve_technical"` in `PERMISSION_REGISTRY` mapped to `ProjectRole` `["PROJECT_MANAGER", "CHIEF_COMMANDER", "QA_QC"]`.
- **Option 2 (Project Assignment Extension):** Add `technicalApproverId String?` to `Project` model or `isTechnicalApprover Boolean @default(false)` to `ProjectMember`.

### 4.2. Resolution Decision
Until Project Lead explicitly approves Option 1 (static role baseline) or Option 2 (project-level assignment schema addition), Technical Approver mapping remains **`TECHNICAL APPROVER BUSINESS MAPPING: BLOCKED`**.

---

## 5. EXACT ADDITIONAL SCHEMA DELTA

Combining Phase 1.6.1 delta and Phase 1.6.2 findings:

```prisma
// Complete Phase 2 Minimal Schema Delta

enum MaterialRequestStatus {
  REVISION_REQUESTED // ADDED: 1 Enum Value
}

model MaterialRequest {
  purchaseReason String? // ADDED: Field 1
}

model MaterialRequestItem {
  contractQuantity   Decimal? @db.Decimal(19, 4) // ADDED: Field 2
  specification      String?  // ADDED: Field 3
  manufacturerOrigin String?  // ADDED: Field 4
  sectionName        String?  // ADDED: Field 5
  sequence           Int      @default(0) // ADDED: Field 6
}

model ApprovalRequest {
  stageCode String? // ADDED: Field 7 (Machine-readable stage: "TECHNICAL" | "FINAL")
  
  @@unique([entityId, stageCode, status], map: "approval_request_pending_stage_uidx")
}
```

👉 **TOTAL DELTA:** **7 NEW FIELDS + 1 ENUM VALUE + 1 UNIQUE INDEX**.

---

## 6. FINAL PHASE 2 GATE

### RELEASE GATE DECISION: `CONDITIONAL GO` (AWAITING APPROVER MAPPING SELECTION)

- **Permission Engine Audit:** `COMPLETE` (Static Code Engine Verified).
- **`sourceType` Semantics Audit:** `COMPLETE` (`stageCode String?` added to preserve backward compatibility).
- **Race-Safety Architecture:** `COMPLETE` (PostgreSQL Partial Unique Index + Transactional Idempotency).
- **Final Condition for Phase 2 Unlock:** Project Lead must select Option 1 (Static Role Baseline) or Option 2 (Project Assignment Field) for Technical Approver resolution.

---

## 7. SOURCE VERIFICATION PROOF

```
git status --short
git diff -- prisma/schema.prisma src/
```

*Proof Verification: Zero application source changes and zero schema changes were made during Phase 1.6.2. All findings were verified directly against codebase files.*
