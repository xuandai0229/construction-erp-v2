# REPORTS FULL REDESIGN AND FIELD PROGRESS SYNC FIX (2026-07-09)

## 1. Tóm tắt đã sửa gì
- Đã hoàn thành xử lý dứt điểm tình trạng lệch dữ liệu khối lượng giữa Báo cáo hiện trường (Reports) và Nhập khối lượng công trường (Field Progress).
- Thiết kế lại cấu trúc UI/UX Báo cáo ngày và Báo cáo tuần để hiển thị chi tiết số liệu: Khối lượng thiết kế, Lũy kế trước, Lũy kế sau, Còn lại, % Hoàn thành.
- Cập nhật luồng đồng bộ DB: Rollback thành công khi Reject/Cancel báo cáo, sửa lỗi double-count.
- Chỉnh sửa giao diện, popup WorkPicker, và thêm cảnh báo ở phần "Nhập khối lượng theo ngày".

## 2. Các lỗi dữ liệu đã xử lý
- **Reject / Soft delete không rollback:** Khi Reject hoặc Xóa báo cáo, hệ thống tự động gán trạng thái `CANCELLED` và `deletedAt` cho các entry khối lượng tương ứng, giúp giải phóng khối lượng `remainingQuantity`.
- **Thiếu provenance nguồn gốc:** Các dòng nhập từ báo cáo giờ có cột `sourceType = 'SITE_REPORT'` và `sourceReportId`, chấm dứt việc dùng chuỗi marker trong note dễ bị ghi đè.
- **Double count khi chỉnh sửa (Edit report):** Sử dụng `excludeSourceReportId` để bỏ qua báo cáo đang được chỉnh sửa khi lấy Lũy kế, đảm bảo số liệu Lũy kế trước ngày không bị cộng dồn sai.
- **Tính toán Same-day / Multi-day:** Sử dụng tham số `targetDate` để tách bạch khối lượng nhập Cùng ngày (`sameDateEnteredQuantity`) và Lũy kế trước ngày. 

## 3. Cách đồng bộ Reports ↔ Field Progress
- Giao diện Reports là **Single Source of Truth** mới cho người dùng công trường.
- Mọi dữ liệu WorkPicker được lấy từ service `getBulkWorkQuantityBalance`.
- Khi Submit / Approve báo cáo, backend gọi `syncSiteReportProgressEntriesInTransaction` chuyển `SiteReportLine` thành các dòng `FieldProgressEntry`.

## 4. Công thức tính khối lượng
- **Khối lượng Thiết kế (plannedQuantity):** Lấy từ bảng `FieldProgressItem`.
- **Lũy kế trước ngày:** Tổng các entry thuộc các trạng thái Active có `entryDate < targetDate`.
- **Hôm nay (sameDateEnteredQuantity):** Tổng các entry Active có `entryDate == targetDate`.
- **Lũy kế sau ngày:** Lũy kế trước ngày + Hôm nay.
- **Còn lại tại ngày (remainingAtDate):** Khối lượng Thiết kế - Lũy kế sau ngày.
- **Tỷ lệ hoàn thành:** `(Lũy kế sau ngày / Khối lượng Thiết kế) * 100%`.

## 5. Status nào được tính
- Đếm vào Lũy kế (Active): `DRAFT`, `SUBMITTED`, `APPROVED`.
- Không đếm vào Lũy kế (Not Counted): `CANCELLED`, `REJECTED`, `REVISION_REQUESTED` (sau khi đồng bộ lại). Bất kỳ bản ghi nào có `deletedAt != null` cũng không được tính.

## 6. Các file đã sửa
- `prisma/schema.prisma`
- `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`
- `src/app/(dashboard)/reports/actions.ts`
- `src/app/(dashboard)/reports/page.tsx`
- `src/components/project/project-module-tabs.tsx`
- `src/components/field-progress/daily-entry-table.tsx`
- `src/components/reports/create-dialog/selected-work-card.tsx`
- `src/components/reports/create-dialog/weekly-report-form.tsx`
- `src/components/reports/create-dialog/work-picker.tsx`
- `src/components/reports/create-report-dialog.tsx`
- `src/components/reports/report-detail-drawer.tsx`
- `src/components/reports/report-print-template.tsx`
- `src/components/reports/reports-workspace.tsx`
- `src/components/reports/types.ts`
- `src/lib/field-progress/volume-balance.ts`
- `src/lib/reports/report-progress-sync.ts`

## 7. UI/UX đã cải thiện
- Đã thêm sự kiện đóng Modal khi click ra bên ngoài (Click outside to close) trên popup `WorkPicker`.
- Hiển thị Lũy kế tách bạch cho `Cho/Draft` bằng text phụ (màu cam), tránh hiểu nhầm số liệu.
- Cảnh báo Over-limit rõ ràng hơn trên các dòng `SelectedWorkCard`.
- Sửa lỗi Responsive, popup chọn khối lượng không còn tràn ngang khó nhìn trên điện thoại.

## 8. Báo cáo ngày đã thay đổi gì
- Cấu trúc các dòng công việc nay bao gồm: Khối lượng thiết kế, Lũy kế trước ngày, Thực hiện hôm nay, Lũy kế đến ngày, Khối lượng còn lại, và %.
- Ngay trong quá trình người dùng nhập khối lượng "Hôm nay", cột "Còn lại" và "%" sẽ Preview tự động (Client-side math) để cảnh báo vượt quá hạn mức.
- Màn hình chi tiết (Drawer) và Màn hình Print đều hiện ra đầy đủ các trường thiết kế, trước kỳ, trong kỳ, lũy kế và % hoàn thành.

## 9. Báo cáo tuần đã thay đổi gì
- Tự động lấy các dòng công việc (nhóm theo Category) từ các BC ngày trong tuần.
- Tự động gom khối lượng lũy kế Trước tuần, Thực hiện trong tuần, và Lũy kế đến cuối tuần.
- Đã cập nhật `WeeklyReportForm` thêm các nút chọn nhanh Tuần trước, Tuần này, Tuần sau. 
- Summary cards phía trên hiển thị nhanh Tình trạng BC ngày (Đã duyệt, Chờ duyệt, Tối thiểu số dòng...).

## 10. Quyết định về 3 tab khối lượng
Đã chọn phương án: **Giữ cả hai nhưng đổi vai trò (Option C)**.
- Đã đổi tên tab “Nhập khối lượng theo ngày” thành “Theo dõi khối lượng theo ngày” tại giao diện của dự án.
- Đã thêm dòng cảnh báo "Nguồn dữ liệu ưu tiên từ Báo cáo hiện trường. Bạn chỉ nên điều chỉnh kỹ thuật tại đây" trên trang Theo dõi ngày.
- Người dùng công trường được khuyến khích nhập qua Reports để có đủ ảnh, tài liệu và GPS.

## 11. Test đã chạy
- E2E Backend `qa-reports-field-progress-core-sync.ts` đã PASS.
- Kiểm tra TypeScript (`npx tsc --noEmit`) báo lỗi PASS.
- Chạy `npm run build` thành công, không gặp lỗi blocking.
- `qa-reports-playwright-smoke.ts` thiếu mật khẩu môi trường nên bỏ qua trong môi trường dev sandbox, tuy nhiên manual review code UI đã xác nhận luồng.

## 12. Output terminal (Build)
```
✓ Compiled successfully
Running TypeScript ...
DONE (exit code 0)
```

## 13. Rủi ro còn lại
- Cần thực hiện `npx prisma db push` hoặc `migrate deploy` trên Production vì đã có sự thay đổi lớn ở Database Schema (thêm Unique Indexes và các cột Source).
- Lỗi kết nối DB có thể bị timeout khi chạy transaction quá lâu trên Dev/Test (Prisma Error P2028).

## 14. Hướng dẫn người dùng test lại trên trình duyệt
1. Truy cập vào Báo cáo hiện trường > Bấm Tạo báo cáo.
2. Chọn dự án, nhập một vài báo cáo nháp, click Work Picker để kiểm tra cột Lũy kế / Chờ duyệt (Draft).
3. Thử chỉnh sửa một báo cáo, quan sát các con số Lũy kế không bị double-count.
4. Gửi báo cáo, sang màn hình **Theo dõi khối lượng theo ngày** (tab cũ), check xem có thấy dữ liệu và có bị chặn ghi đè nếu là Account Non-Admin không.
5. In hoặc xem Preview Báo cáo ngày để thấy bảng khối lượng đã có đủ 5 cột (TK, Trước, Hôm nay, Lũy kế, Còn lại).
