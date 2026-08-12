# MATERIALS DATABASE ABSOLUTE RECONCILIATION

Audit date: 2026-08-11 (read-only). Database: PostgreSQL from configured `DATABASE_URL`. No seed, mutation, migration, reset, or UI change was performed by this audit.

## Final verdict

**FAIL — NOT ABSOLUTE PASS.**

The relational model is clean for the records inspected, but four stored stock rows do not reconcile to their movement history, and the proposal KPI/list use different cancelled-record semantics. Authenticated RBAC and runtime checks are also unverified.

## Baseline

- HEAD: `c68347a318ed122c9301cdfcda6c5069c9a5f629`
- Worktree was already dirty (Materials portfolio work, QA scripts, and reports); it was preserved.
- Read-only evidence script: `scripts/audit-materials-absolute.ts`.

## Inventory and conservation

| Metric | Portfolio DB | Sum by 21 projects | Difference |
|---|---:|---:|---:|
| Project (active portfolio set) | 21 | 21 | 0 |
| MaterialItem | 12 | 12 | 0 |
| ProjectMaterialStock | 12 | 12 | 0 |
| Stored stock quantity | 16,655 | 16,655 | 0 |
| MaterialMovement | 17 | 17 | 0 |
| MaterialProposal (all workflow states) | 17 | 17 | 0 |
| MaterialProposalItem | 22 | 22 | 0 |

Only three projects have any Materials data: Thanh Xuân (5/5/7/5), Xuân Phương (5/5/7/7), and Vĩnh Tuy (2/2/3/5), where each tuple is MaterialItem/stock/movement/proposal. The other 18 active projects have zero rows in all five material models. No project has only a proposal without MaterialItem, stock, and movement.

## The 17th proposal: explained mismatch

The record is `cmsodh53c001j2ck5gadq2wyq`, proposal `DVT-QA-2026-008`.

- Project: `cms9tydud0010n4k5w2hmqjmh`, Bảo trì kết cấu hạ tầng giao thông phường Xuân Phương.
- Status: `CANCELLED`; created `2026-08-11T08:02:18.504Z`; no proposal soft-delete/archive field exists.
- Requester: `Admin QA` (`ADMIN`); as a company-scope record it is visible to eligible company users.
- It has one item and an intact Project relation.

`getPortfolioOverview` counts **all 17** proposal rows. `listMaterialProposalsForProjects` filters `status != CANCELLED`, so the portfolio/project proposal list is **6 + 5 + 5 = 16**. This is a confirmed semantic mismatch, not a missing Project Health record. The KPI must either say “Tổng đề xuất gồm cả đã hủy” or use the same non-cancelled condition as the list.

Workflow distribution: 10 DRAFT, 3 SUBMITTED, 2 APPROVED, 1 REVISION_REQUESTED, 1 CANCELLED. Risk should be based on DRAFT/SUBMITTED/REVISION_REQUESTED and any overdue required-delivery date; all historical totals are not risk indicators.

## Project and relation integrity

| Check | Result |
|---|---:|
| Movement.projectId != MaterialItem.projectId | 0 |
| Stock.projectId != MaterialItem.projectId | 0 |
| ProposalItem MaterialItem cross-project | 0 |
| Duplicate `(projectId, materialItemId)` stock rows | 0 |
| Negative stock rows | 0 |
| Missing required Project/MaterialItem relation from audit includes | 0 |

The schema enforces required foreign keys for MaterialMovement→Project/MaterialItem, ProjectMaterialStock→Project/MaterialItem, MaterialProposal→Project/User, and ProposalItem→Proposal; ProjectMaterialStock also has the unique key `(projectId, materialItemId)`. MaterialItem has unique `(projectId, code)`, explicitly not global code uniqueness. Deleting Project cascades to its materials/stocks/movements/proposals; deleting MaterialItem cascades stocks but restricts movements.

## Stored-stock reconciliation

Source of truth is `ProjectMaterialStock.stock`. The application ledger uses IMPORT and RETURN as positive movements; EXPORT and TRANSFER are negative. There is no opening-balance or adjustment column, so an independent ledger must equal `storedStock` when all movements are created through `applyMaterialMovement`.

| Project | Material | Stored | Imports | Exports | Recalculated | Difference |
|---|---|---:|---:|---:|---:|---:|
| Thanh Xuân | Xi măng PCB40 | 250 bao | 300 | 30 | 270 | -20 |
| Thanh Xuân | Thép D10 | 500 kg | 500 | 200 | 300 | +200 |
| Xuân Phương | Thép D10 | 3,500 kg | 4,500 | 500 | 4,000 | -500 |
| Vĩnh Tuy | Gạch đặc 2 lỗ | 12,000 viên | 12,000 | 3,000 | 9,000 | +3,000 |

The remaining 8 stock rows reconcile. The four failures coincide with the QA fixture script inserting additional `MaterialMovement` records directly, without changing stored stock. This is a data-integrity failure in the current QA DB, not a UI issue. No negative stock exists, but these positive mismatches are sufficient to fail reconciliation.

## Low-stock classification

DB and UI formatter use the same formula: negative if stock < 0; out if stock = 0; low if min > 0 and stock <= min; otherwise healthy.

| Classification | Rows |
|---|---:|
| Âm tồn | 0 |
| Hết hàng | 1 |
| Sắp hết | 3 |
| Đủ | 8 |

Low/empty records: Thanh Xuân Thép D10 (500/1,000, sắp hết), Thanh Xuân Cát vàng (0/20, hết hàng), Xuân Phương Xi măng (80/150, sắp hết), Xuân Phương Cốp pha (5/10, sắp hết). Portfolio server uses `< min` while the UI formatter uses `<= min`; no current row equals its minimum, but this boundary inconsistency must be resolved before claiming DTO/UI equivalence.

## Material identity audit

There is no `MaterialMaster`, global code, specification, or manufacturer field on `MaterialItem`; therefore no aggregated item is canonical.

- **Must not merge:** `QA-COP-PHA` exists in Thanh Xuân as `m2` and Xuân Phương as `bộ`.
- **Ambiguous, display-only grouping:** Xi măng PCB40 appears in three projects with equal name/unit/group; Thép D10 appears in two. They may be analysed together but are distinct MaterialItem records.
- **Ambiguous:** Cát vàng has equal name/unit/group but different local codes (`QA-CAT-VANG-01`, `QA-CAT-VANG-02`).
- Specification/manufacturer comparison cannot be completed at MaterialItem level because the schema does not store either field. ProposalItem snapshots are document fields, not material master identity.

## Transaction and proposal integrity

All 17 movements resolve a real Project.name and MaterialItem; no “Công trình”, “CT”, or unknown fallback exists in the DB relation. The audit script emits the complete movement ledger with ID, project, material, type, quantity, unit, timestamps, and notes.

All 17 proposals resolve Project and requester. There are 22 proposal items; 0 item references a MaterialItem from another project. `materialItemId` is nullable, so an item without it is semantically an allowed free-text/document snapshot item, not automatically an orphan. Proposal has `projectNameSnapshot`, `projectLocationSnapshot`, requester snapshots, and item snapshots, which are historical document data and must not be overwritten from live Project fields.

## KPI semantics

| KPI | Current definition | DB result | Audit result |
|---|---|---:|---|
| Công trình có dữ liệu vật tư | distinct MaterialItem.projectId | 3 | Correct for catalog data; excludes proposal-only projects by definition |
| Loại vật tư đang được quản lý | MaterialItem row count | 12 | Label must be “Bản ghi vật tư theo công trình”, not global types |
| Công trình đang thiếu tồn | distinct stock project with stock < min or < 0 | 2 | Correct for current data; boundary differs from UI `<=` |
| Tổng đề xuất vật tư | all MaterialProposal rows | 17 | Conflicts with visible non-cancelled list count 16 |
| Giao dịch nhập/xuất phát sinh | all MaterialMovement rows | 17 | Correct raw count; stock ledger is not reconciled |

## RBAC and performance

Static server inspection: portfolio aggregate actions require `canViewAllProjects`; project scope checks active ProjectMember membership; portfolio proposal listing intersects non-high-level users with active membership. This is a promising protection, but no authenticated ADMIN, DIRECTOR, project-only, or viewer session was available in this audit, so IDOR/RBAC runtime verdict is **UNVERIFIED**.

Current portfolio actions issue bounded set queries with `IN permittedProjectIds`, not one query per project. There is no obvious N+1 pattern at 21 projects. At 100 projects / 10,000 items / 100,000 movements, current unpaginated full-list portfolio queries and in-memory grouping will need pagination/aggregation design, but no speculative optimisation was applied.

## UI defects recorded, not fixed

The requested UI concerns are recorded for post-reconciliation work: portfolio header project context, native-select project filter, proposal horizontal scroll, transaction header spacing, premature project-name truncation, and misleading “Loại vật tư” terminology. No UI change was made in this audit phase.

