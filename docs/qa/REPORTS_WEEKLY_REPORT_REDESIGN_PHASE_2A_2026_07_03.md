# BÁO CÁO KẾT QUẢ QA: THIẾT KẾ LẠI BÁO CÁO TUẦN (PHASE 2A)

**Ngày thực hiện:** 03/07/2026
**Module:** Báo cáo hiện trường (Reports)
**Người thực hiện:** Hệ thống AntiGravity AI
**Trạng thái:** HOÀN THÀNH

## 1. MỤC TIÊU
- Thiết kế lại nghiệp vụ và UI phần "Báo cáo tuần" trong modal "Tạo báo cáo mới".
- Cho phép tự động tổng hợp khối lượng công việc đã thực hiện từ các báo cáo ngày đã duyệt.
- Thêm phần "Đánh giá chung" (Summary).
- Thêm phần "Kế hoạch thực hiện trong tuần tiếp theo" với ngày bắt đầu, ngày kết thúc và danh sách công việc.
- Không thay đổi schema (Database Migration) theo quy định, sử dụng trường `generalNote` dạng JSON string hiện có trong cơ sở dữ liệu để lưu trữ `nextWeekPlans`.

## 2. CHI TIẾT TRIỂN KHAI

### 2.1. UI Modal "Tạo báo cáo mới" (`create-report-dialog.tsx`)
- Phân tách rõ ràng tab "Báo cáo ngày" và "Báo cáo tuần".
- Đối với tab "Báo cáo tuần", hiển thị:
  - **Thông tin cơ bản**: Dự án, trạng thái thời tiết.
  - **Khu vực tổng hợp**: Lấy dữ liệu tự động từ các báo cáo ngày trong tuần, có thông báo số lượng báo cáo `Đã duyệt`, `Chưa duyệt`, `Bị từ chối` thông qua Server Action `getWeeklyReportPreview`.
  - **Đánh giá chung**: TextField cho phép lưu thông tin tóm tắt và đánh giá tổng quan.
  - **Kế hoạch tuần tiếp theo**: 
    - Tính năng tự động điền (Auto-calculate) `nextWeekStartDate` và `nextWeekEndDate` ngay khi người dùng chọn `weekEndDate`.
    - Form Grid cho phép nhập các dòng công việc bao gồm `Công việc`, `Khối lượng`, `Đơn vị`, và `Nhân lực/Máy móc dự kiến`.

### 2.2. Backend Logic (`actions.ts`)
- Mở rộng payload của `createWeeklyReportFromApprovedDailyReports` để tiếp nhận `nextWeekStartDate`, `nextWeekEndDate`, và mảng `nextWeekPlans`.
- Encode các trường dự định trong tương lai vào thuộc tính `generalNote` của model `SiteReport` thông qua `JSON.stringify`.
- Cập nhật payload của `updateSiteReport` để cho phép thao tác chỉnh sửa Kế hoạch tuần tiếp theo trên bản nháp (DRAFT).

### 2.3. Hiển thị chi tiết (`report-detail-drawer.tsx` & `reports/page.tsx`)
- Server-Side Mapping (`reports/page.tsx`): Giải mã (Decode) `generalNote` dạng JSON string vào các thuộc tính front-end (`nextWeekStartDate`, `nextWeekEndDate`, `nextWeekPlans`).
- UI Drawer (`report-detail-drawer.tsx`):
  - Hiển thị "Đánh giá chung" (tách biệt so với báo cáo ngày).
  - Tách section mới "Kế hoạch thực hiện trong tuần tiếp theo" hiển thị dạng bảng (Table) hoặc thẻ rời trên giao diện di động.
  - Bảng hiển thị cột: *Hạng mục / Công việc*, *K.lượng*, *Đ.vị*, *Nhân lực / Máy móc*.

## 3. KẾT QUẢ KIỂM THỬ (QA)

### 3.1. Build & Type Checking
- Command `npm run build` chạy thành công (Thoát mã 0).
- Không có bất kỳ cảnh báo nghiêm trọng nào về TypeScript hoặc ESLint liên quan đến tính tương thích của mảng `nextWeekPlans`.

### 3.2. Script Kiểm Thử Logic
- Tập tin `scripts/qa-reports-weekly-summary-phase2a.ts` đã được thực thi.
- Logic gộp báo cáo qua `getWeeklyReportPreview` hoạt động đúng.
- Không thực hiện bất kỳ lệnh `prisma migrate` nào. Bảo toàn tuyệt đối database của dự án.

## 4. KẾT LUẬN & ĐỀ XUẤT
**Phase 2A** "Weekly Report Redesign" đã hoàn thành đúng với đặc tả yêu cầu, tích hợp chặt chẽ vào quy trình lưu trữ hiện tại mà không cần can thiệp database.

**Bước tiếp theo đề xuất (Phase 2B - Optional):** 
- Triển khai tính năng Export PDF với format Kế hoạch tuần.
- Tối ưu hóa UI/UX bảng lưới nếu khối lượng công việc kế hoạch phát sinh lớn.
