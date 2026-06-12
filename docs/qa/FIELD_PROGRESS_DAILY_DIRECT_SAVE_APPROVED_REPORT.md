# Field Progress Daily: Direct Save to APPROVED Report

## 1. Files changed
- `src/components/field-progress/daily-entry-table.tsx`: Removed old info blocks, simplified UI text, removed "Gửi giám sát" button, renamed "Lưu tạm" to "Lưu khối lượng", fixed bindings and stylings for "Mũi" and "Đơn vị".
- `src/components/field-progress/daily-status-calendar.tsx`: Changed title to "Lịch nhập khối lượng", removed DRAFT/SUBMITTED from UI map.
- `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`: Changed save logic to create/update entries as "APPROVED" and set `approvedAt` directly.

## 2. UI removed
- Đã bỏ khối “Ý nghĩa các nút lưu”
- Đã bỏ nút “Gửi giám sát”
- Đã đổi “Lưu tạm” thành “Lưu khối lượng”
- Đã đổi các text DRAFT/SUBMITTED trên UI (thành Đã nhập, Chưa nhập).

## 3. Logic changed
- Save now creates/updates status APPROVED.
- `approvedAt` is set to current date when saved.
- Summary receives data immediately because rollups already query `status = APPROVED`.
- Existing entry is updated in place, not duplicated.
- User can still edit saved value by simply typing and saving again.

## 4. Mũi/Đơn vị fix
- Mũi was bound to `constructionCrew`, Đơn vị to `unit`.
- Text color uses `text-slate-800` when present, or `text-slate-400` with the text `—` as fallback.
- Mũi is truncated nicely with a `title` attribute for long strings.

## 5. Test/build result

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/qa-field-progress-write-path-test.ts` | Pass |
| `npx tsx scripts/qa-field-progress-rollup-test.ts` | Pass |
| `npx tsx scripts/qa-work-date-logic-test.ts` | Pass |
| `npx tsx scripts/qa-field-progress-volume-guard-test.ts` | Pass |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

## 6. Not done
- Không sửa schema.
- Không migration.
- Không xóa enum DRAFT/SUBMITTED.
- Không thêm approval workflow.
- Không cleanup DB.
