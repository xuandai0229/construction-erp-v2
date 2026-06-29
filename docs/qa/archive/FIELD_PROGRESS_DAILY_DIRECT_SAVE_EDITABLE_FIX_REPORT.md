# Field Progress Daily: Direct Save — Editable Fix Report

## 1. Files changed

- `src/components/field-progress/daily-entry-table.tsx`
  - Removed `isLocked` check that disabled inputs for APPROVED/SUBMITTED entries
  - Changed `disabled={isLocked}` → `disabled={loading}` on quantity inputs
  - Removed `alert()` after successful save
  - Removed manual `setItems` status update (rely on `router.refresh()` instead)
  - Changed default status for new items from `"DRAFT"` to `"EMPTY"`
  - Fixed validation to use `guard.canSubmit` instead of checking level strings
  - Added "Đang lưu..." text on button while saving
- `scripts/qa-field-progress-direct-save-editable-test.ts` — new test script

## 2. Đã bỏ thông báo sau lưu chưa?

- Đã bỏ hoàn toàn `alert(...)` sau khi lưu thành công
- Không còn toast/modal/banner sau save
- Chỉ giữ `alert()` cho trường hợp lỗi server (res.error)
- Nút hiển thị "Đang lưu..." trong khi đang xử lý

## 3. Input sau khi lưu còn sửa được không?

- **CÓ** — Input luôn editable
- Đã xóa logic `isLocked = item.status === "SUBMITTED" || item.status === "APPROVED"` (dòng cũ 376)
- Input chỉ bị `disabled={loading}` trong lúc đang gọi server action
- Sau khi `router.refresh()` load lại dữ liệu từ server, entry có `status: "APPROVED"` vẫn render input bình thường

## 4. Save lại cùng item/ngày xử lý thế nào?

- Server action `batchSaveDailyEntries` tìm entry hiện có theo `(templateId, itemId, entryDate)`
- Nếu tìm thấy 1 entry (bất kể status) → **UPDATE** entry đó
- Nếu chưa có → **CREATE** entry mới
- Status luôn là `"APPROVED"`, `approvedAt` được cập nhật mỗi lần lưu
- Không tạo duplicate

## 5. Test/build result

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/qa-field-progress-direct-save-editable-test.ts` | ✅ 6/6 Pass |
| `npx tsx scripts/qa-field-progress-write-path-test.ts` | ✅ Pass |
| `npx tsx scripts/qa-field-progress-rollup-test.ts` | ✅ Pass |
| `npx tsx scripts/qa-work-date-logic-test.ts` | ✅ Pass |
| `npx tsx scripts/qa-field-progress-volume-guard-test.ts` | ✅ Pass |
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass (exit code 0) |

### New test cases (direct-save-editable-test)

| Case | Description | Result |
| ---- | ----------- | ------ |
| 1 | First save creates APPROVED entry | ✅ |
| 2 | Re-save updates existing APPROVED (no duplicate) | ✅ |
| 3 | Third save still updates same entry | ✅ |
| 4 | Quantity=0 soft-deletes existing entry | ✅ |
| 5 | Re-create after soft-delete works | ✅ |
| 6 | UI: APPROVED status does NOT disable input | ✅ |

## 6. Not done

- Không sửa DB schema
- Không migration
- Không đưa lại approval workflow
- Không đưa lại nút "Gửi giám sát"
- Không sửa màn Bảng khối lượng gốc
- Không sửa màn Tổng hợp
- Không xóa enum DRAFT/SUBMITTED từ Prisma
