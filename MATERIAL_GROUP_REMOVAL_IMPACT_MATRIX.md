# Material group removal impact matrix

Ngày kiểm kê: 11/08/2026  
Phạm vi: `MaterialItem.group` trong phân hệ Quản lý vật tư. Các từ `group` thuộc Tailwind/CSS, báo cáo, WBS và module khác không nằm trong refactor này.

## Baseline schema

`MaterialItem.group` là `String?` project-scoped. Nó không có foreign key, unique constraint hay index riêng. `MaterialProposalItem` không có `group`; trường `manufacturerOrigin` của proposal là snapshot tài liệu riêng và không được dùng để migrate metadata master.

## Impact matrix

| Surface | File / model | Current group responsibility | Migration action | Risk / verification |
|---|---|---|---|---|
| Prisma model | `prisma/schema.prisma:MaterialItem` | Nullable metadata | Add `manufacturer`, `origin`; retain `group` only through compatibility phase | No copy of category values into new fields |
| Baseline DB | `0_baseline_v2_existing_product_schema` | Creates `group` column | Historical only, never edit baseline migration | Migration history immutable |
| New migration | `prisma/migrations/<new>` | N/A | Add two nullable columns only | Row count, stock, movement, proposal unchanged |
| Material DTO | `src/app/(dashboard)/materials/actions.ts` | Emits `group` into all material/stock/movement DTOs | Replace with `manufacturer`, `origin` | TypeScript consumers updated together |
| Project catalog query | `actions.ts:getMaterialItems` | Sorts by group | Sort by name/code | No category ordering claim |
| Create material | `actions.ts:createMaterialItem` | Persists normalized group | Persist normalized manufacturer/origin | Existing ledger path retained |
| Edit material | `actions.ts:updateMaterialItem` | Updates group | Updates manufacturer/origin only | No stock/movement mutation |
| Portfolio catalog DTO | `actions.ts:getPortfolioCatalog` | Presentation grouping key `name+unit+group` | Preserve project-scoped identities; analysis key must not use manufacturer/origin as canonical identity | Same-name material needs conservative display grouping |
| Portfolio stock DTO | `actions.ts:getPortfolioStocks` | Same `name+unit+group` grouping | Same rule as catalog | No accidental cross-project merge |
| Workspace | `materials-workspace.tsx` | Builds existing group suggestions and passes group to dialog | Remove group suggestions; pass metadata values | Create/edit parity |
| Create/edit dialog | `material-form-dialog.tsx` | Combobox “Nhóm vật tư” | Two optional text inputs, clearer three-section form | Focus, validation, opening stock ledger path |
| Project catalog | `materials-catalog.tsx` | Group filter, URL `group`, column/card/search | Remove filter and query parameter; replace column/search with manufacturer/origin | No dead group UI |
| Project stock | `materials-stock-table.tsx` | Search and material metadata column | Search manufacturer/origin; metadata display | Status semantics unchanged |
| Project transaction | `materials-transactions.tsx`, `transaction-form-dialog.tsx` | Combobox descriptions | Describe manufacturer/origin | No movement payload change |
| Detail drawers | `material-detail-drawer.tsx`, `stock-detail-drawer.tsx` | Shows group badge/table row | Show manufacturer/origin metadata | Null values render `—`/`Chưa cập nhật` only |
| Portfolio catalog | `materials-portfolio-catalog.tsx` | Search, header and column | Search/display manufacturer/origin | Keep project-first layout/no project code |
| Portfolio stock | `materials-portfolio-stock.tsx` | Search and secondary metadata | Search/display manufacturer/origin | No global-master claim |
| Portfolio transactions | `materials-portfolio-transactions.tsx` | Secondary group label | Manufacturer/origin label | Project name mapping unchanged |
| Proposal form | `material-proposal-form.tsx` | Material DTO currently exposes group only | Pass source metadata so selecting a MaterialItem can prefill proposal snapshot | User editable snapshot remains independent |
| Proposal actions | `src/lib/material-proposals/actions.ts` | Persists `manufacturerOrigin` snapshot | Preserve existing snapshot semantics | Never rewrite historical proposals |
| Preview/PDF/Excel/print | document view, exporter, proposal routes | Already render proposal snapshot column | Preserve label/content; test export | No dependency on MaterialItem.group |
| QA fixture | `seed-materials-qa-fixtures.ts` | Seeds category-like group values | Replace with explicit QA-only manufacturer/origin examples | Only after approved QA reseed |
| QA scripts | `qa-material-group-*`, CRUD/update scripts | Tests group creation/filter/update | Replace tests with metadata create/update/search | No production mutation |
| Audit script | `audit-materials-absolute.ts` | Reports group in duplicate audit | Rename to manufacturer/origin metadata in output | Preserve identity warning |

## Required removal proof

Before removing the `group` column in a later approved destructive migration:

1. `MaterialItem.group` consumer search returns zero application/QA consumers.
2. New `manufacturer` and `origin` are nullable for all old records; category values are not migrated into either column.
3. Material, stock, movement, proposal and proposal-item counts reconcile before/after.
4. QA fixture and tests exercise manufacturer/origin independently.
5. Runtime create/edit/search, portfolio/project view, proposal prefill, preview, Excel, PDF and print have evidence.

## Compatibility decision

This phase is additive. The old `group` column will **not** be dropped until deployment of the additive migration and verified removal of every consumer. The application is moved to the new fields in the same source change, while existing category data remains untouched in the database as legacy data with no user-facing use.
