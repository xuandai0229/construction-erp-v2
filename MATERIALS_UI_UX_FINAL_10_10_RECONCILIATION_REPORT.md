# MATERIALS UI/UX FINAL 10/10 RECONCILIATION REPORT

## 1. Baseline

- Repository: `construction-erp-v2`
- HEAD: `c68347a318ed122c9301cdfcda6c5069c9a5f629`
- Audit mode: source and database are read-only except for the scoped UI/source fixes listed in this report. No migration, seed, production-data mutation, or stock mutation was performed.
- The worktree was already dirty before this reconciliation. All pre-existing work was preserved; no reset, clean, or mass checkout was used.

## 2. Inventory

Static inventory covered every file in `src/app/(dashboard)/materials/**`, `src/components/materials/**`, `src/lib/materials/**`, `src/lib/material-proposals/**`, plus the shared enterprise controls used by Materials. The scan found 209 uses of table/overflow/text-clamp/sticky/menu/combobox/return-context primitives.

| Route or tab | Main surface | Layout / data state | Main issue found | Severity | Scoped proposal/fix |
| --- | --- | --- | --- | --- | --- |
| `/materials?scope=portfolio&tab=overview` | `MaterialsPortfolioOverview` | KPI + project table/list | Proposal KPI used a different set from the proposal list | P0 data semantics | Exclude cancelled documents from the KPI; include revision-requested documents in attention |
| Portfolio catalogue | `MaterialsPortfolioCatalog` | project groups / material drill-down | URL navigation on every search keystroke | P1 performance | Local input with a 250 ms URL sync |
| Portfolio stock | `MaterialsPortfolioStock` | project groups / material drill-down | Low-stock boundary differed from status badge | P1 consistency | Use `<= minStockLevel` in the portfolio summary |
| Portfolio proposals | `MaterialProposalList` | table + actions | native select, nested interactive row, capabilities not applied to every action | P0 accessibility/RBAC UX | Searchable combobox, explicit focusable cells, capability-gated menu entries |
| Portfolio transactions | `MaterialsPortfolioTransactions` | grouped and all-transaction modes | all-mode nested grid produced invalid column geometry; native type filter | P0 visual/context | Rebuilt with a flat six-column grid and segmented Vietnamese controls |
| Project overview | `MaterialsOverview` | operator dashboard | separate operator workspace must remain separate from executive portfolio | P0 scope boundary | Preserved; portfolio returns before operator render |
| Project catalogue / stock / transaction | existing tables + drawers | dense operating workflow | fixed/min-width tables need runtime viewport testing | P1 responsive | No business-operation rewrite; retain drawer/actions pending browser QA |
| Proposal create/edit | `MaterialProposalForm` | autosave form | return context is carried, but keyboard/long-text flow needs live verification | P1 navigation | Retained explicit `returnTo`; runtime pending |
| Proposal detail | `[id]/page.tsx` | document detail | blind default back route and a render-time counter mutation | P0 navigation / lint | Sanitized `returnTo`; derive sequence from item index |
| Proposal preview / print / export | preview toolbar/document routes | A4 document output | source reviewed; visual output not authenticated/runtime tested | P1 evidence | No layout claim without a print/PDF runtime run |
| Menus and dropdowns | `UnifiedActionMenu`, `EnterpriseCombobox` | portalled overlays | runtime clipping/pointer behavior cannot be proven unauthenticated | P1 QA | Proposal filter now uses the shared portalled combobox |
| Loading/error/empty | loading/error + component empty states | 0 / many states | representative source exists; no QA fixture/browser evidence yet | P1 QA | Kept compact states; runtime pending |

## 3. Root causes

1. Portfolio had been assembled as parallel widgets rather than one project-first information hierarchy.
2. Proposal aggregation counted cancelled documents while the list intentionally excluded them, creating the observed 17 versus 16 mismatch.
3. The old all-transactions layout placed a grid row inside a grid cell, so its visual columns could not be reliable.
4. Search filters rewrote navigation state for every keypress, increasing render/network risk.
5. Proposal rows used a `tr` with button semantics while also containing interactive controls.
6. Existing QA fixture movement rows do not reconcile to stored stock. This is a data-fixture/ledger issue, not a CSS issue; details are in `MATERIALS_DATABASE_ABSOLUTE_AUDIT.md`.

## 4. Design contract

- **Boundary:** Materials uses the common `app-page` boundary; Portfolio sections use the same `ContentCard` surface and `--surface`, `--border`, and shadow tokens.
- **Rhythm:** page section gap 16–20px; toolbar and segmented controls 40px; card headers 16–20px horizontal padding; data rows 12–16px vertical padding.
- **Typography:** project/material names are semibold primary data; metric values use tabular numbers; units and groups are secondary muted text; statuses are compact semantic badges.
- **Project identity:** Portfolio never displays project code beside the visible project name. Code remains a search/domain field only.
- **Tables/groups:** desktop headers are hidden on small layouts in favour of grouped rows; numbers align right; project names allow two lines with full native-title/accessible text supplied by the existing safe text primitive.
- **Overlays:** project filter uses `EnterpriseCombobox`; row actions retain `UnifiedActionMenu` with its portal, pointer, and active-row state.

## 5. Before/after architecture

Before: company data was partly flat and partly duplicated between overview widgets, while transaction all-mode lost a dependable column structure.

After: company scope follows **company → project → issue → material / proposal / transaction → project workspace**. Catalogue, stock, and transactions default to project grouping; cross-project material/transaction views are secondary. Project scope remains the operating workspace.

## 6. Portfolio UX

- Portfolio overview is project-first and each project surface calls the scoped project navigator.
- Project codes are not used as visible executive anchors.
- The portfolio query path remains gated by `canViewAllProjects` on the server.

## 7. Project UX

- Project catalogue, stock, proposal, and movement operations were not rewritten.
- Existing create/edit/delete/import/export server permissions and the operational drawers/dialogs remain in place.
- Project identity can still expose code in the project operating context; the executive portfolio rule does not erase domain identifiers.

## 8. Overview

- KPI labels now describe the dataset: **Đề xuất vật tư đang theo dõi** explicitly excludes cancelled documents.
- Low stock follows the status contract: negative, zero, then `<=` minimum level.
- Revision-requested proposals contribute to the executive attention signal.

## 9. Catalogue

- Default view is grouped by project; the material view is secondary and expandable to real project rows.
- Searches are local first and synchronise the URL after 250 ms rather than one router operation per keypress.
- Material records are only presentation-grouped by compatible name/unit/group; this is not represented as a global master catalogue.

## 10. Stock

- Default view is grouped by project and shows material count, shortage count, sufficient count, latest activity, and item rows.
- Negative inventory is surfaced through the existing danger status badge; it is not hidden.
- The portfolio calculation now agrees with the shared `getStockStatus` equality boundary.

## 11. Proposal

- Project filter is a searchable, keyboard-operable `EnterpriseCombobox`, not a large native select.
- Proposal number opens edit only when edit capability is available; otherwise it opens preview.
- Project name is an explicit project-workspace navigation control only in Portfolio.
- Excel/PDF/Print/Delete/Edit menu entries are rendered only when the supplied capability permits them; server actions remain authoritative.

## 12. Transactions

- Default is **Theo công trình**.
- Project header shows the true project name and transaction count.
- **Tất cả giao dịch** is secondary and retains a clearly visible project-name column.
- Every row uses a visible type badge plus signed quantity; the UI never falls back to a fabricated project label.

## 13. Preview/PDF/Excel/Print

Source paths and toolbar flows were inspected. Existing document, export, and print implementations were not replaced. Their live A4 layout, print dialog behavior, and Excel formatting remain **runtime-unverified** because an authenticated session was unavailable.

## 14. Navigation

- Portfolio → project generates an explicit sanitized `returnTo` containing scope, tab, and active query parameters.
- Proposal list derives a portfolio return URL before preview/edit.
- Proposal detail now accepts a sanitized `/materials...` return context and propagates it to edit.
- No change relies on a blind `router.back()` for the audited links.

## 15. Long-text QA

Static review confirms project names in new Portfolio group headers and tables are constrained to two lines, while material name/group metadata has a separate layout channel. Actual browser measurements for very long Vietnamese project/material/specification text remain pending.

## 16. Empty-state QA

Portfolio catalogue, stock, and transactions use compact content-card empty states. Proposal empty-state creation CTA is now capability-gated. Zero/one/many-record visual QA remains pending.

## 17. Responsive matrix

| Viewport | Static design expectation | Runtime result |
| --- | --- | --- |
| 1920×1080 / 1600×900 / 1440×900 / 1366×768 / 1280×800 | grouped Portfolio desktop rows, no forced data-table width | Not authenticated / unverified |
| 1024×768 | filters wrap, group rows retain context | Not authenticated / unverified |
| 768×1024 | secondary columns collapse to grouped row metadata | Not authenticated / unverified |
| 390×844 | cards/group rows replace desktop headers | Not authenticated / unverified |

## 18. Accessibility

- New proposal project control supports type search, Arrow keys, Enter, Escape, click-outside, and a labelled listbox through `EnterpriseCombobox`.
- Proposal table no longer assigns button semantics to a row containing nested controls.
- New project navigation and transaction controls are real buttons with visible focus styles.
- Full keyboard and screen-reader runtime testing remains pending.

## 19. RBAC

- Portfolio server actions check `canViewAllProjects`.
- Project actions retain `requireProjectPermissions` / proposal access assertions.
- The proposal action menu now mirrors supplied capability flags; this is only a UX layer, not the permission authority.
- Authenticated ADMIN/DIRECTOR/project-user/viewer runtime and IDOR test matrix is unverified.

## 20. Database reconciliation

Read-only audit results are documented in `MATERIALS_DATABASE_ABSOLUTE_AUDIT.md` and `MATERIALS_PORTFOLIO_PROJECT_RECONCILIATION_MATRIX.md`.

- Raw counts conserve across the 21 active projects.
- The cancelled proposal `cmsodh53c001j2ck5gadq2wyq` explained the old KPI/list difference; the KPI now follows the visible non-cancelled proposal dataset.
- Relation/orphan checks were clean in the audited QA database.
- **Blocking data risk:** four QA material/stock ledgers do not reconcile stored stock to movement history. No data was altered in this phase, therefore data logic cannot be marked PASS.

## 21. Console/network

No authenticated browser session was available. A prior local navigation redirected to `/login`; therefore there is no valid console, hydration, React-warning, 404/500, or network evidence for Materials.

## 22. TypeScript

`npx tsc --noEmit` passed after the scoped changes.

## 23. Lint

`npm run lint` fails repository-wide (54 errors, 268 warnings in the full run before the final scoped cleanups). The remaining reported errors include `scratch/check_databases.js`, HR, Safety, shared menu internals, and other modules. A subsequent Materials-only lint command completed with **0 errors and 25 pre-existing warnings**. Repository lint is therefore **not PASS**.

## 24. Build

`npm run build` passed after the final source pass (Next.js 16.2.7; compilation, TypeScript, route collection, and static-page generation completed).

## 25. Screenshot manifest

No Materials screenshot can be claimed: an actual local runtime visit to `http://localhost:3000/materials?scope=portfolio` redirected to `/login?next=%2Fmaterials%3Fscope%3Dportfolio`, and no permitted authenticated QA session was supplied. The redirect-page console had no error/warning entries, but that is not Materials runtime evidence. Required Portfolio, project scope, proposal, preview, print, mobile, and tablet screenshots are pending.

## 26. Changed files

- `src/app/(dashboard)/materials/actions.ts`
- `src/app/(dashboard)/materials/proposals/[id]/page.tsx`
- `src/components/materials/material-proposal-list.tsx`
- `src/components/materials/materials-overview.tsx`
- `src/components/materials/materials-portfolio-catalog.tsx`
- `src/components/materials/materials-portfolio-overview.tsx`
- `src/components/materials/materials-portfolio-stock.tsx`
- `src/components/materials/materials-portfolio-transactions.tsx`

Other already-dirty Materials files were preserved and are listed by `git status`.

## 27. Remaining known risks

1. QA stock/movement ledger mismatch must be corrected through the sanctioned ledger/fixture process before a data PASS is possible.
2. There is no authenticated browser evidence for any requested runtime viewport, print, export, or RBAC scenario.
3. Repository lint is failing outside this phase, so the quality gate is not green.
4. Legacy inactive Portfolio branches remain in several source files and should be deleted in a dedicated cleanup after visual equivalence is demonstrated.

## 28. Self-critique results

| Reviewer role | Finding | Disposition |
| --- | --- | --- |
| UI/UX lead | all-transactions grid was structurally unsafe | Fixed with a flat six-column layout |
| Executive | cancelled proposals distorted attention/KPI context | Fixed semantic dataset and risk status |
| Chỉ huy trưởng | portfolio redesign must not replace fast project operations | Preserved project workspace |
| Material staff | giant project selector slows selection | Replaced proposal filter with searchable combobox |
| QA | nested row/button interaction risks keyboard defects | Replaced with explicit proposal/project controls |
| Security reviewer | client hiding is insufficient for action security | Server-side guards retained; authenticated proof pending |

## 29. UI score

**Not scored.** Static improvements are present, but required visual evidence does not exist.

## 30. UX score

**Not scored.** Navigation, keyboard, responsive, and long-text behavior require authenticated runtime QA.

## 31. FINAL VERDICT

**PARTIAL / RUNTIME UNVERIFIED.**

This phase cannot be labelled UI 10/10, UX 10/10, data logic PASS, RBAC PASS, navigation PASS, responsive PASS, or print/export PASS. The blocking facts are: no authenticated runtime/screenshot evidence, repository lint failure, and unresolved QA stock-ledger reconciliation.
