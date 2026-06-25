# MATERIALS DEEP INDEPENDENT AUDIT REPORT

**Date**: 2026-06-25
**Role**: Principal ERP System Auditor + Senior Full-stack Engineer + UI/UX Product Reviewer
**Scope**: Full audit of the Materials (Quan ly vat tu) module
**Status**: COMPLETED

---

## 1. Audit Scope & Role

This audit was performed independently, with full read access to all source code, database, and build systems. No pre-scripted scenarios were used. All conclusions are evidence-based.

**SKILL.md read**: Yes - `.agents/skills/design-taste-frontend/SKILL.md` (1207 lines).

---

## 2. Files Read

### Route & Page
- `src/app/(dashboard)/materials/page.tsx` (52 lines)
- `src/app/(dashboard)/materials/actions.ts` (446 lines -> 455 lines after fixes)

### Components
- `src/components/materials/materials-workspace.tsx` (307 lines)
- `src/components/materials/materials-overview.tsx` (222 lines)
- `src/components/materials/materials-catalog.tsx` (163 lines)
- `src/components/materials/materials-stock-table.tsx` (189 lines)
- `src/components/materials/materials-transactions.tsx` (108 lines)
- `src/components/materials/material-form-dialog.tsx` (184 lines)
- `src/components/materials/transaction-form-dialog.tsx` (152 lines)
- `src/components/materials/purchase-request-placeholder.tsx` (78 lines)
- `src/components/materials/materials-badges.tsx` (79 lines)
- `src/components/materials/materials-formatters.ts` (63 lines)

### Business Logic & Schema
- `src/lib/materials/ledger.ts` (110 -> 113 lines after fixes)
- `prisma/schema.prisma` (869 lines)

---

## 3. Commands Run & Results

| Command | Result |
|---------|--------|
| `git status --short` | 10 modified, 18 untracked |
| `npx prisma validate` | PASS |
| `npx tsc --noEmit` | 6 errors in QA scripts only, 0 in src/ |
| `npm run build` (before fixes) | FAIL - QA script type errors |
| `npm run build` (after fixes) | PASS - Exit code 0 |
| `npx tsx scripts/qa-materials-deep-audit.ts` | PASS |

### Database Audit Output (verbatim)

```
[1] Total projects: 3
    TH-125 | Truong hoc Chu Van An | ACTIVE
    QA-TUHIEP-5F-001 | Nha Van Phong 5 Tang | ACTIVE
    Ct-124 | Cong trinh test | ACTIVE

[2] MaterialItems: TH-125=0, QA-TUHIEP=5, Ct-124=0
[3] Orphan materials (projectId=NULL): 0
[4] Stocks: TH-125=0, QA-TUHIEP=5, Ct-124=0
[5] Movements: TH-125=0, QA-TUHIEP=7, Ct-124=0
[6] Negative stock: NONE
[7] Stock reconciliation: ALL MATCH
[8] Movements without stock row: NONE
[9] Stock without movement: NONE
[10] Duplicate codes: NONE
[11] Cross-project contamination: NONE
[12] Demo/test data: NONE
[13] Clean projects: TH-125 (0/0/0), Ct-124 (0/0/0)
[14] Nullable projectId: Total=5, With=5, Without=0
```

---

## 4. Architecture Summary

```
User -> MaterialsWorkspace (client) -> Server Actions -> ledger.ts -> Prisma -> PostgreSQL
```

**Models**: `MaterialItem` (project-scoped) -> `ProjectMaterialStock` (per-project stock) -> `MaterialMovement` (ledger entries)

**Key Design**: Materials are project-scoped via `@@unique([projectId, code])`. Stock tracked per project. Movements use `$transaction()`.

---

## 5. Schema Assessment

- `MaterialItem.projectId`: **String? (NULLABLE)** - Currently 0 orphans. All code enforces non-null. Needs migration.
- `@@unique([projectId, code])`: Correct compound unique.
- `MaterialMovement.materialItem`: No `onDelete` (defaults to Restrict) - correct for audit trail.
- `ProjectMaterialStock`: Both relations have `onDelete: Cascade` - correct.
- `MaterialMovementType`: IMPORT, EXPORT, TRANSFER, RETURN - complete for MVP.

---

## 6. New Project Isolation

**Tested**: TH-125 and Ct-124 (both truly empty)

| Check | Result |
|-------|--------|
| Materials = 0 | PASS |
| Stocks = 0 | PASS |
| Movements = 0 | PASS |
| UI shows blank onboarding guide | PASS (overview line 172-218) |
| No global materials visible | PASS (query filters by projectId) |
| Proposals don't reference other projects | PASS |

---

## 7. Stock Reconciliation

For all 5 stock rows in QA-TUHIEP-5F-001: **computed stock from movements = stored stock**. Zero mismatches.

---

## 8. UI/UX Audit

**Overall**: Clean, professional, mobile-responsive. Follows good patterns.

| Component | Assessment |
|-----------|-----------|
| Header + project selector | Good - clear h1, selector with code, isolation notice |
| Tab navigation | Good - 5 tabs with icons, URL-driven, scrollable on mobile |
| Overview cards | Good - 4 color-coded summary cards, low stock warnings |
| Overview onboarding | Good - 3-step guide when empty |
| Catalog table/cards | Good - desktop table + mobile cards, per-row actions |
| Stock table/cards | Good - filter pills, search, responsive |
| Transactions table | Good - movement badges, color-coded quantities |
| Proposals placeholder | Good - honest "Coming soon" label |
| Material form dialog | Good - proper validation, mobile-friendly, prevents double submit |
| Transaction form dialog | Good - stock guard, color-coded button, datetime picker |

**Minor issues**: Search placeholder says "tu dien" (dictionary) instead of "danh muc" (catalog) - leftover terminology.

---

## 9. Form Audit

| Check | Material Form | Transaction Form |
|-------|:---:|:---:|
| Required field markers | PASS | PASS |
| Client validation | PASS | PASS |
| Server validation | PASS | PASS |
| Prevents negative input | PASS (min=0) | PASS (min=0.01) |
| Prevents zero quantity | N/A | PASS (> 0 check) |
| Prevents over-export | N/A | PASS (client + server) |
| Double submit prevention | PASS (isSubmitting) | PASS (isSubmitting) |
| Error display | PASS (inline alert) | PASS (inline alert) |
| Dialog close/open | PASS | PASS |
| Post-submit refresh | PASS (router.refresh) | PASS |
| Mobile usable | PASS | PASS |
| Timezone issue | N/A | LOW RISK (datetime-local) |

---

## 10. RBAC / Security

| Action | Session | Project Access | Material Ownership | Status |
|--------|:---:|:---:|:---:|--------|
| getActiveProjects | Yes | Filtered | N/A | PASS |
| getMaterialItems | Yes | Yes | N/A | PASS |
| getProjectStocks | Yes | Yes | N/A | PASS |
| getRecentTransactions | Yes | Yes | N/A | PASS |
| createMaterialItem | Yes | Yes | N/A | PASS |
| **updateMaterialItem** | Yes | **FIXED** | **FIXED** | PASS |
| **setProjectMinStock** | Yes | Yes | **FIXED** | PASS |
| **createMaterialTransaction** | Yes | Yes | **FIXED (ledger)** | PASS |

URL manipulation: projectId validated against accessible projects list (page.tsx lines 27-33). Foreign projectId falls back to first accessible project.

---

## 11. Demo/Test Data

- Zero materials with test/demo/sample in name or code.
- QA scripts require explicit `--projectId=` flag - safe.
- `qa-materials-clean-legacy-demo.ts` and `qa-materials-repair-legacy.ts` can modify data - should add confirmation flags.

---

## 12. Issue Registry

### CRITICAL (Fixed)

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| C-1 | `updateMaterialItem` missing RBAC - any user could edit any material | Added material lookup + assertProjectAccess | **FIXED** |
| C-2 | `setProjectMinStock` missing ownership check | Added projectId comparison | **FIXED** |
| C-3 | `applyMaterialMovement` missing cross-project guard | Added ownership check in ledger | **FIXED** |

### HIGH (Partially Fixed)

| # | Issue | Status |
|---|-------|--------|
| H-1 | `MaterialItem.projectId` nullable in schema (0 orphans exist, but schema permits) | NOT FIXED - needs migration |
| H-2 | Old QA scripts broke `npm run build` | **FIXED** |

### MEDIUM

| # | Issue | Status |
|---|-------|--------|
| M-1 | Catalog search says "tu dien" instead of "danh muc" | NOT FIXED - cosmetic |
| M-2 | Stock empty state says "tu dien" | NOT FIXED - cosmetic |
| M-3 | Transaction form missing unitPrice field (backend supports it) | NOT FIXED - feature scope |
| M-4 | No edit/delete UI for materials (action exists) | NOT FIXED - feature scope |

### LOW

| # | Issue |
|---|-------|
| L-1 | Transaction form uses `any[]` types |
| L-2 | `currentUser` prop unused in workspace |
| L-3 | No pagination on transactions (hardcoded take: 50) |

### INFO

| # | Note |
|---|------|
| I-1 | TRANSFER/RETURN types exist but no UI (future) |
| I-2 | No audit trail (createdById on records) |
| I-3 | No batch import (CSV/Excel) |
| I-4 | Purchase proposals tab is honest placeholder |

---

## 13. What Was Fixed

| Fix | File |
|-----|------|
| RBAC: updateMaterialItem project access | actions.ts (+9 lines) |
| Security: setProjectMinStock ownership | actions.ts (+2 lines) |
| Security: ledger cross-project guard | ledger.ts (+3 lines) |
| Build: demo data script compound key | scripts/ (2 lines) |
| Build: flow script type narrowing | scripts/ (~50 lines) |
| Audit: Created deep audit script | scripts/ (new file) |

---

## 14. Manual Test Guide

1. **Blank project**: Select TH-125 or Ct-124. Verify all tabs empty with correct messages.
2. **Full lifecycle**: Create material -> Import 100 -> Verify stock -> Export 30 -> Verify 70 -> Try export 999 (blocked).
3. **Project isolation**: Create material in Project A -> Switch to Project B -> Verify not visible.
4. **RBAC**: As non-ADMIN, verify only assigned projects appear. Try URL manipulation.

---

## 15. Conclusion

**Is Materials MVP-ready?** **YES, with the 3 security fixes applied in this audit.**

**Strengths**: Correct project isolation, accurate stock reconciliation, comprehensive RBAC (now), atomic transactions, clean UI, proper empty states.

**Non-blocking gaps**: Nullable projectId (needs migration), missing edit UI, missing unitPrice field, terminology artifacts.

**The module handles the core workflow correctly**: create material -> import stock -> track inventory -> export with guards -> low stock warnings. No data integrity issues found.
