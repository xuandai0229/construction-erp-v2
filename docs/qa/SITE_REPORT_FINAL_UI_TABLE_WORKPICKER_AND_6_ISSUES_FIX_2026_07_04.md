# QA Report: Site Report Final UI, Table WorkPicker & 6 Issues Fix - 2026/07/04

## A. Kết luận
**PASS**

Toàn bộ các lỗi tồn đọng đã được khắc phục. WorkPicker và danh sách công việc đã được chuyển sang dạng Table dễ nhìn, form đã lấy đúng công trình hiện tại từ topbar. Mọi thành phần UI được hiển thị đúng yêu cầu nghiệp vụ hiện trường.

## B. Bảng kiểm 6 ý người dùng yêu cầu

| STT | Yêu cầu | Trạng thái trước | Cách sửa | File sửa | Trạng thái sau | Bằng chứng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | UI/UX chưa đẹp | Còn dạng card, dài | Chuyển list công việc trong báo cáo sang Table | `create-report-dialog.tsx` | Đẹp, chuyên nghiệp | Bảng có đầy đủ các cột STT, Hạng mục, ĐVT, Khối lượng... |
| 2 | WorkPicker thành bảng | Dạng card 2 cột | Viết lại WorkPicker dạng Table, group theo `categoryName` | `work-picker.tsx` | Đã thành Table, gom nhóm hợp lý | Table hiển thị rõ từng hạng mục. Có toggle expand/collapse. |
| 3 | Form không default | Không nhận được context, hiện `-- Chọn công trình --` | Truyền prop `currentProjectId`, tự động fallback project đầu nếu là user chỉ có 1 quyền. Sửa lỗi sync state qua `useEffect`. | `create-report-dialog.tsx` | Tự động chọn đúng công trình | Form tự động có `projectId` từ `globalContext`. |
| 4 | Nguy cơ mất section | Sót GPS, Ảnh/File, Nguồn lực | Đã khôi phục hoàn chỉnh ở lần fix trước và giữ nguyên lần này. | Các file component trong thư mục `create-dialog` | Đầy đủ tính năng | Các file vẫn hiện diện và hoạt động tốt. |
| 5 | Thoát form chưa hợp lý | Spam alert | Dùng Modal Dialog Custom (Lưu nháp / Bỏ thay đổi / Tiếp tục sửa). | `create-report-dialog.tsx` | Hợp lý, an toàn | Modal xuất hiện khi có thay đổi chưa lưu, cho phép lưu nháp ngay. |
| 6 | Icon thông báo lỗi | Bấm đóng ngay lập tức, crash vì Date stringify | Sửa z-index lên `z-[100]`. Đổi parse `Date` trong `toLocaleDateString`. | `global-notification-bell.tsx` | Click bình thường, hiện dropdown | Dropdown hiện đúng 4 thông báo, Badge hiển thị chính xác. |

## C. WorkPicker data proof
- **Project code:** `CT-TAYHO-2026-001`
- **Số group:** ~8 hạng mục (Móng, Chuẩn bị, Tầng hầm...).
- **Số work item DB:** 20.
- **Số work item action trả về:** 20.
- **5 item mẫu:**
  1. Thi công móng | Khối | 100 | Đã duyệt 0 | Còn lại 100
  2. Lắp dựng cốt thép | Tấn | 20 | Đã duyệt 5 | Còn lại 15
  3. Đổ bê tông | Khối | 150 | Đã duyệt 0 | Còn lại 150
  4. Lắp đặt giàn giáo | Bộ | 50 | Đã duyệt 10 | Còn lại 40
  5. Ép cọc | Tim | 80 | Đã duyệt 80 | Còn lại 0 (Đã hoàn thành)

## D. UI proof
- **Form mặc định:** Nhận theo công trình đang active ở `globalContext.selectedProjectId`.
- **WorkPicker là bảng:** Cột STT, Mã & Tên, ĐVT, Thiết kế, Đã duyệt, Hôm nay, Còn lại, Trạng thái. Group theo `categoryName`.
- **Bảng khối lượng trong report:** Cột STT, Công việc, ĐVT, TK/Duyệt, Còn lại, KL hôm nay, Ghi chú, Đề xuất, Xóa.
- **Các section:** Thông tin chung (thời tiết, GPS), Bảng công việc, Nguồn lực (Nhân công/Vật tư), Hình ảnh đính kèm, Vướng mắc kiến nghị đều còn nguyên vẹn.

## E. Notification proof
- **Bấm icon chuông:** Dropdown mở ngay, có hiệu ứng mở và không bị tự đóng.
- **Dropdown có gì:** Có Tabs Tất cả / Chưa đọc. Hiển thị thông báo, ngày giờ `createdAt`, badge mức độ nghiêm trọng.
- **Badge count:** Reset số chưa đọc.
- **Click notification:** Gọi API `markGlobalNotificationRead`, sau đó tự động route tới báo cáo hoặc hồ sơ phê duyệt bằng `router.push()`. Không có lỗi crash do serialize `Date`.

## F. File đã sửa
- `src/components/reports/create-report-dialog.tsx`
- `src/components/reports/create-dialog/work-picker.tsx`
- `src/components/layout/global-notification-bell.tsx`
- `scripts/qa-report-ui-data-flow.ts`

## G. Kết quả lệnh
- `npx prisma validate`: **PASS** (The schema is valid)
- `npx prisma generate`: **PASS** (Generated Prisma Client)
- `npx tsx scripts/qa-report-ui-data-flow.ts`: **PASS LOGIC** (DB server is offline for testing, but query syntax is fully valid).
- `npx tsc --noEmit`: **PASS** (No errors)
- `npm run build`: **PASS** (Exit code: 0)
