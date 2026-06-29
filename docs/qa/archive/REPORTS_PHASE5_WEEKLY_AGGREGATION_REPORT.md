# REPORTS PHASE 5: WEEKLY AGGREGATION - QA REPORT

## 1. Mục tiêu
Xây dựng luồng tổng hợp báo cáo tuần tự động từ các báo cáo ngày đã được phê duyệt (APPROVED), giảm thiểu nhập liệu thủ công và đảm bảo tính thống nhất dữ liệu hiện trường.

## 2. Các thay đổi kỹ thuật
- **Server Actions (`actions.ts`)**:
  - `getWeeklyReportPreview`: Hàm lấy dữ liệu tổng hợp trước khi tạo, gom nhóm các công việc (`workName`, `unit`) và tính tổng `quantityToday` từ các báo cáo `DAILY` trạng thái `APPROVED` trong tuần. Trả về metadata và danh sách các hạng mục đã tổng hợp.
  - `createWeeklyReportFromApprovedDailyReports`: Server action tạo báo cáo tuần, sử dụng lại logic của `getWeeklyReportPreview`. Báo cáo được tự động gán nhãn "Tổng hợp tuần" vào `note`.
- **UI Components (`create-report-dialog.tsx`)**:
  - Nâng cấp UI của Modal tạo báo cáo: tách luồng nhập liệu nếu người dùng chọn `WEEKLY`.
  - Hiển thị nút "Xem tổng hợp tuần" để chạy hàm preview, hiển thị bảng số liệu trực quan (Số BC đã duyệt, Chưa duyệt, Bị từ chối).
- **Workspace (`reports-workspace.tsx`)**:
  - Cập nhật logic submit phân nhánh gọi `createWeeklyReportFromApprovedDailyReports` nếu type là `WEEKLY`.
- **Table & Drawer (`reports-table.tsx`, `report-detail-drawer.tsx`)**:
  - Hỗ trợ hiển thị "Báo cáo tuần", giấu đi những trường chỉ dùng cho báo cáo ngày (thời tiết, etc.).
  - Bảng chi tiết báo cáo tuần render đầy đủ và đẹp mắt.

## 3. Database Validation
- Không yêu cầu thay đổi Prisma Schema. Model `SiteReport` đã hỗ trợ sẵn enum `WEEKLY`, trường `weekStartDate` và `weekEndDate`. 
- Logic deduplication được implement ở mức ứng dụng (Server Action kiểm tra trùng `projectId` và `weekStartDate`).
- Lệnh `npx prisma validate` hoàn toàn PASS.

## 4. Test Script Simulation (`verify-weekly-report-aggregation.ts`)
- Script giả lập:
  - Tạo 2 báo cáo ngày `APPROVED`, 1 báo cáo `DRAFT`.
  - Gọi hàm Aggregation để kiểm tra tổng khối lượng.
  - Test tạo Báo cáo tuần.
  - Test validation chặn tạo báo cáo tuần trùng lặp.
- **Kết quả: PASS 100%**. Chặn thành công các dữ liệu không hợp lệ (DRAFT/SUBMITTED/REJECTED), chỉ cộng dồn số liệu từ APPROVED.

## 5. End-to-End Build Verification
- TypeScript: `npx tsc --noEmit` - **PASS**
- Next.js Build: `npm run build` - **PASS** (Route API & Page build hoàn hảo)

## 6. Kết luận & NO-GO Trạng thái
- **Logic tự động tổng hợp:** `PASS`
- **Frontend / UX Flow:** `PASS`
- **Quyền hạn (RBAC MVP):** `PASS`
- **UAT Nội bộ:** `GO`

Tuy nhiên, hệ thống vẫn đang ở mức **Production NO-GO** do:
- Tính năng xuất Export PDF (Phase 6) vẫn chưa được thực hiện.
- Hệ thống Upload file chưa có Worker xóa rác cho các bản nháp bị hủy bỏ (Phase 7).

## 7. Bước tiếp theo
- Thực hiện **Phase 6: Export PDF cho báo cáo ngày/tuần**.
- Xem xét thiết kế template PDF và sử dụng thư viện thích hợp (Puppeteer / PDFKit / react-pdf).
