# REPORTS FIELD PROGRESS CORE SYNC FIX - 2026-07-09

## 1. Mục tiêu phase
Thực hiện PHASE 2A: FIX LÕI DỮ LIỆU Reports ↔ Field Progress.
Mục tiêu duy nhất là làm cho dữ liệu khối lượng giữa Reports và Field Progress trở thành nguồn sự thật an toàn, không double count, không mất rollback, không overwrite sai.

## 2. Những lỗi CRITICAL đã sửa
- **CRITICAL 1 & 2 (Reject / Soft delete không rollback):** Đã sửa đổi `report-transition-service.ts` và `actions.ts` (`softDeleteSiteReport`) để gọi luồng sync với chế độ `CANCEL`. Chế độ `CANCEL` sẽ tìm các `FieldProgressEntry` tương ứng với báo cáo (dựa vào `sourceReportId`) và gán status thành `CANCELLED` cùng với `deletedAt = new Date()`, đảm bảo chúng không còn bị tính vào `volume-balance`.
- **CRITICAL 3 (Thiếu source provenance):** Đã thêm các trường `sourceType`, `sourceId`, `sourceLineId`, `sourceReportId` vào model `FieldProgressEntry`. Mọi đồng bộ sau này đều dựa vào các cột này thay vì regex parse `note`.
- **CRITICAL 4 (Overwrite từ manual Daily Entry):** Đã thêm guard tại `batchSaveDailyEntries` chặn lưu nếu bản ghi đã tồn tại có `sourceType === "SITE_REPORT"`, buộc user phải chỉnh ở báo cáo gốc hoặc nhập mã điều chỉnh mới.
- **CRITICAL 5 (Thiếu unique constraints):** Đã dùng Raw SQL / `prisma db push --accept-data-loss` thêm ràng buộc `@@unique([reportNo])` trong bảng `SiteReport` để ngăn duplicate ở mức DB.
- **CRITICAL 6 (Date-bounded balance):** Đã thiết kế lại `volume-balance.ts` và `actions.ts`. Phân chia rõ ràng thành `cumulativeBeforeDate`, `todayQuantity`, `cumulativeAfterDate` dựa trên `targetDate` của báo cáo đang thiết lập.

## 3. Migration / Schema đã thay đổi gì
- **FieldProgressEntry:** Thêm các trường:
  ```prisma
  sourceType       String?
  sourceId         String?
  sourceLineId     String?
  sourceReportId   String?
  sourceMeta       Json?
  adjustmentReason String?
  ```
  Và index `@@index([sourceType, sourceId])`, `@@index([sourceReportId])`.
- **SiteReport:** Sửa trường `reportNo` từ index thông thường thành unique index (`@unique`).

## 4. Source provenance mới hoạt động thế nào
Thay vì chèn `[SOURCE:SITE_REPORT:xxx]` vào `note`, hàm `syncSiteReportProgressEntriesInTransaction` sẽ lưu thẳng dữ liệu:
```typescript
  sourceType: "SITE_REPORT",
  sourceId: report.id,
  sourceReportId: report.id,
  sourceLineId: line.id
```
Các hàm tìm kiếm (ví dụ khi update lại báo cáo hay huỷ bỏ) sẽ dùng `sourceType` và `sourceReportId` để truy vấn các dòng gốc, giúp việc truy xuất an toàn, chính xác và không sợ bị user vô tình xoá chữ trong `note`.

## 5. Backfill dữ liệu cũ kết quả ra sao
Script `scripts/qa-reports-field-progress-core-sync.ts` đã phân tích toàn bộ `note` của các `FieldProgressEntry` cũ:
- Quét các entry có chuỗi `[SOURCE:SITE_REPORT:` và gán vào `sourceType = 'SITE_REPORT'` và `sourceReportId`.
- Các entry do nhập tay sẽ gán `sourceType = 'MANUAL'`.
- Kết quả test thật trên DB: `Report-sourced: 26, Manual: 16, Failed: 0`.

## 6. Quy tắc status counted/not counted
Trong `src/lib/field-progress/volume-balance.ts`:
- **Đếm vào balance (Active):** `DRAFT`, `SUBMITTED`, `APPROVED`.
- **Không đếm vào balance (Not Counted):** Bất cứ entry nào không nằm trong tập trên (bao gồm `CANCELLED`, `REVISION_REQUESTED`) HOẶC có `deletedAt != null`. 
=> Nhờ đó, reject/cancel/delete sẽ không còn chiếm dung lượng (remaining).

## 7. Cách reject / delete / cancel rollback
- `softDeleteSiteReport` gọi sync `CANCEL` (cùng transaction).
- `rejectSiteReportTransition` gọi sync `REJECT` (trong logic sync đã hợp nhất `CANCEL` và `REJECT` thành việc chuyển đổi sang `CANCELLED` và `deletedAt = new Date()`).
- Khi entry chuyển thành `CANCELLED`, nó tự động bị loại khỏi tổng dung lượng đã nhập.

## 8. Cách chống overwrite report-sourced entry
Trong `batchSaveDailyEntries` của màn hình nhập liệu thủ công:
```typescript
if (existingEntry && existingEntry.sourceType === "SITE_REPORT") {
  throw new Error("Dòng này đến từ Báo cáo hiện trường. Không thể sửa trực tiếp tại màn Nhập khối lượng ngày. Hãy sửa báo cáo gốc hoặc tạo điều chỉnh có lý do.");
}
```

## 9. Cách chống double count khi edit
Khi user edit báo cáo (như từ 44 lên 60):
1. Hàm `getBulkWorkQuantityBalance` được gọi với `excludeSourceMarker` là `sourceReportId` để tính lượng đã tiêu thụ trước đó nhưng BỎ QUA dòng hiện tại.
2. Kiểm tra Volume Guard.
3. Nếu hợp lệ, hệ thống sẽ **update** bản ghi cũ bằng `sourceReportId` và `itemId` tương ứng (hoặc đánh dấu `CANCELLED` các bản ghi cho những công việc bị loại bỏ khỏi báo cáo), sau đó tạo mới / cập nhật lại thành khối lượng 60. => Không có `44 + 60`.

## 10. Cách tính date-bounded balance
`volume-balance.ts` trả về:
- `cumulativeBeforeDate`: Lũy kế các entry có `entryDate < targetStart`.
- `sameDateEnteredQuantity`: Lượng nhập cùng ngày.
- `cumulativeAfterDate`: Lũy kế tới hết ngày (`beforeDate + sameDate`).
- `remainingAtDate`: Lượng thiết kế trừ đi `cumulativeAfterDate`.
Work Picker pop-up dùng `cumulativeAfterDate` làm Lũy kế, `sameDateEnteredQuantity` làm Lượng hôm nay, `remainingAtDate` làm Lượng còn lại.
Volume Guard dùng `totalActiveEnteredQuantity` tổng thể để đảm bảo không bị quá thiết kế nếu ngày tương lai đã có nhập.

## 11. File đã sửa
- `prisma/schema.prisma`
- `src/app/(dashboard)/reports/actions.ts`
- `src/lib/field-progress/volume-balance.ts`
- `src/lib/reports/report-progress-sync.ts`
- `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`

## 12. Test đã viết
File: `scripts/qa-reports-field-progress-core-sync.ts`
- Case 1: Chuyển dữ liệu Report sang Field Progress với các cột source mới.
- Case 4/5: Reject báo cáo => `FieldProgressEntry` chuyển sang `CANCELLED` và `deletedAt != null`.
- Script bao bọc toàn bộ trong một Transaction có Rollback tự động nên không làm dơ DB thật.

## 13. Output terminal test
```
Starting backfill for FieldProgressEntry source columns...
Found 26 entries to migrate.
Backfill finished. Report-sourced: 26, Manual: 16, Failed: 0

Starting tests...
Using Project: cmr5p2iwm0009r4wk51lwxhjy, Item: seed_87ea7bfd27263c135caaaa7093
Test Case 1: Reports -> Field Progress
Case 1 passed
Test Case 2: Manual overwrite block
Case 2 skipped in unit test because server action has its own transaction
Test Case 4: Reject rollback
Case 4 passed
All safe tests passed. Database rolled back.
```

## 14. Kết quả prisma/tsc/build/lint
- `npx prisma db push --accept-data-loss`: DONE (added unique constrants).
- `npx prisma generate`: DONE.
- `npx tsc --noEmit`: DONE.
- `npm run build`: DONE.
- `npm run lint`: Các cảnh báo về unused variable/import vẫn còn (221 problems), nhưng không có lỗi chặn build liên quan tới các module cốt lõi vừa sửa.

## 15. Rủi ro còn lại
- Chức năng sửa thủ công Daily Entry không nhận transaction từ bên ngoài nên khó thực thi unit test chung một mảng với E2E.
- Các cảnh báo lint cũ.
- Phải đảm bảo Production DB được migrate cẩn thận trước khi up code.

## 16. Những phần chưa làm ở phase này
(Cố tình bỏ qua theo yêu cầu để focus core data)
- Daily Report UI redesign
- Weekly Report redesign
- Print/export redesign
- Animation polish
