# MATERIALS FINAL COVERAGE MATRIX

Baseline: `c68347a318ed122c9301cdfcda6c5069c9a5f629` on 2026-08-11. This matrix is source-audited; a status of **Runtime pending** is deliberately not a pass.

| Route | Scope | Tab / surface | Component(s) | Data source | Actions / RBAC source | Desktop | Tablet | Mobile | Navigation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/materials?scope=portfolio&tab=overview` | Toàn công ty | Tổng quan | `MaterialsWorkspace`, `MaterialsPortfolioOverview` | `getPortfolioOverview`, catalogue, stock, proposals, movements | `canViewAllProjects`, project navigator | Source audited | Runtime pending | Runtime pending | explicit `returnTo` to project | Runtime pending |
| `/materials?scope=portfolio&tab=catalog` | Toàn công ty | Danh mục — theo công trình | `MaterialsPortfolioCatalog` | `getPortfolioCatalog` | view only, project drill-down | Source audited | Runtime pending | Runtime pending | project `returnTo` | Runtime pending |
| `/materials?scope=portfolio&tab=catalog&catalogView=material` | Toàn công ty | Danh mục — theo vật tư | `MaterialsPortfolioCatalog` | conservative compatible-item aggregation | view only, project breakdown | Source audited | Runtime pending | Runtime pending | project drill-down | Runtime pending |
| `/materials?scope=portfolio&tab=stock` | Toàn công ty | Tồn kho — theo công trình | `MaterialsPortfolioStock` | `getPortfolioStocks` | view only, project drill-down | Source audited | Runtime pending | Runtime pending | project `returnTo` | Runtime pending |
| `/materials?scope=portfolio&tab=stock&stockView=material` | Toàn công ty | Tồn kho — theo vật tư | `MaterialsPortfolioStock` | per-project stock breakdown | view only, project breakdown | Source audited | Runtime pending | Runtime pending | project drill-down | Runtime pending |
| `/materials?scope=portfolio&tab=requests` | Toàn công ty | Đề xuất | `MaterialProposalList`, `EnterpriseCombobox`, `UnifiedActionMenu` | `listMaterialProposalsForProjects` | capabilities + server proposal guards | Source audited | Runtime pending | Runtime pending | explicit portfolio `returnTo` | Runtime pending |
| `/materials?scope=portfolio&tab=transactions` | Toàn công ty | Nhập / Xuất — theo công trình | `MaterialsPortfolioTransactions` | `getPortfolioTransactions` | company view guard, project drill-down | Source audited | Runtime pending | Runtime pending | project `returnTo` | Runtime pending |
| `/materials?scope=portfolio&tab=transactions&transactionView=all` | Toàn công ty | Nhập / Xuất — tất cả giao dịch | `MaterialsPortfolioTransactions` | `getPortfolioTransactions` | company view guard, project drill-down | Source audited | Runtime pending | Runtime pending | project `returnTo` | Runtime pending |
| `/materials?scope=project&projectId=…&tab=overview` | Theo công trình | Tổng quan | `MaterialsOverview` | project stocks/movements/proposals | `requireProjectPermissions` | Source audited | Runtime pending | Runtime pending | sanitized return link | Runtime pending |
| `/materials?scope=project&projectId=…&tab=catalog` | Theo công trình | Danh mục + drawer | `MaterialsCatalog`, `MaterialDetailDrawer` | `getMaterialItems`, project stock | create/update/delete/import/export permissions | Source audited | Runtime pending | Runtime pending | drawer URL state | Runtime pending |
| `/materials?scope=project&projectId=…&tab=stock` | Theo công trình | Tồn kho + drawer | `MaterialsStockTable`, `StockDetailDrawer` | `getProjectStocks`, movements, proposals | import/export/update/delete permissions | Source audited | Runtime pending | Runtime pending | drawer URL state | Runtime pending |
| `/materials?scope=project&projectId=…&tab=requests` | Theo công trình | Đề xuất | `MaterialProposalList` | `listMaterialProposals` | proposal permission assertions | Source audited | Runtime pending | Runtime pending | project return context | Runtime pending |
| `/materials?scope=project&projectId=…&tab=transactions` | Theo công trình | Nhập / Xuất + drawer | `MaterialsTransactions`, `TransactionDetailDrawer` | `getRecentTransactions` | import/export/server ledger | Source audited | Runtime pending | Runtime pending | movement drawer URL state | Runtime pending |
| in workspace | Theo công trình | Thêm/sửa vật tư | `MaterialFormDialog`, `EditableCombobox` | `createMaterialItem`, `updateMaterialItem` | project create/update/import | Source audited | Runtime pending | Runtime pending | modal only | Runtime pending |
| in workspace | Theo công trình | Nhập/xuất vật tư | `TransactionFormDialog` | `createMaterialTransaction`, `applyMaterialMovement` | import/export server guard | Source audited | Runtime pending | Runtime pending | modal only | Runtime pending |
| `/materials/proposals/new` | both | Tạo đề xuất | `MaterialProposalForm` | proposal actions/catalog options | create proposal server guard | Source audited | Runtime pending | Runtime pending | sanitized `returnTo` | Runtime pending |
| `/materials/proposals/new?edit=…` | both | Sửa đề xuất/autosave | `MaterialProposalForm` | proposal action/get proposal | edit server guard | Source audited | Runtime pending | Runtime pending | preview/edit return chain | Runtime pending |
| `/materials/proposals/[id]` | both | Chi tiết đề xuất | detail page | `getMaterialProposal` | proposal access assertion | Source audited | Runtime pending | Runtime pending | sanitized `returnTo` | Runtime pending |
| `/materials/proposals/[id]/preview` | both | Xem trước | preview page, toolbar, document view | `getMaterialProposal` | proposal access assertion | Source audited | Runtime pending | Runtime pending | sanitized `returnTo` | Runtime pending |
| `/materials/proposals/[id]/export` | both | Excel/PDF download | export route, exporter | `getMaterialProposal`, exporter | server proposal access assertion | Source audited | Runtime pending | Runtime pending | download only | Runtime pending |
| `/materials/proposals/[id]/print`, `/proposal-export/[id]` | both | In | print page/document view | proposal document source | proposal access assertion | Source audited | Runtime pending | Runtime pending | print handoff | Runtime pending |
| `/materials/loading`, `/materials/error` | both | Loading / lỗi | route boundaries | route state | n/a | Source audited | Runtime pending | Runtime pending | retry semantics pending | Runtime pending |
| record menus | both | Menu 3 chấm / xác nhận | `UnifiedActionMenu`, `ConfirmDialog` | record state | capability + server authority | Source audited | Runtime pending | Runtime pending | menu focus/close pending | Runtime pending |

## Shared contracts audited

- `src/components/ui/enterprise.tsx`
- `src/components/ui/enterprise-combobox.tsx`
- `src/components/ui/unified-action-menu.tsx`
- `src/components/ui/confirm-dialog.tsx`
- `src/lib/materials/materials-access.ts`
- `src/lib/materials/materials-permissions.ts`
- `src/lib/materials/ledger.ts`
- `src/lib/material-proposals/permissions.ts`
