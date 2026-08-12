# Field Report Runtime Regression — Final Report

Ngày chạy: 2026-08-12  
Môi trường: isolated QA database, local QA server on port 3103, QA Admin fixture.

## Results

| Scenario | Result | Evidence |
|---|---|---|
| Open Field workspace | PASS | `/reports/field` rendered counters, tabs, list and create CTA |
| Create Daily with zero work lines | PASS | New report appeared as `Đã lưu`; no validation block |
| Edit and save Daily | PASS | Existing DRAFT opened with `Sửa báo cáo`, save returned to list |
| DRAFT approval actions hidden | PASS | Detail showed edit/print/delete only |
| Weekly duplicate | PASS | Existing weekly detail opened with `reportId=cmspvsy640000g0k5g84v1h7h`; no second weekly created |
| Weekly source semantics | PASS | Preview labeled source as `Báo cáo ngày đã lưu`, counted saved daily source |
| Valid photo upload | PASS | List changed to `1 ảnh` |
| Existing photo removal | PASS | Edit showed `Ảnh đã lưu`; after save list returned to `Chưa có ảnh` |
| File accept contract | PASS | DOM accept was `.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar` |
| Supervision permission banner code path | PASS | Banner now uses `canEditPolicy`, not ownership alone |

## Automated quality

- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- Targeted ESLint for changed files: PASS.
- Vitest: 2 Field report stats tests + 2 Supervision workflow tests, 4/4 PASS.

## Residual coverage

The QA fixture has no selectable work item, so positive quantity entry and direct FieldProgress row mutation were not exercised in browser runtime. The zero-line SAVE reconciliation path is implemented and remains the item for a follow-up QA fixture run with one approved work item. No production mutation was used to compensate for that fixture gap.

