# Site Report UI/UX Real Screen Fix Report - 2026/07/04

## A. Kết luận
**PASS**

Toàn bộ các lỗi UX từ 3 ảnh test thực tế đã được khắc phục. UI giữ lại đầy đủ tất cả các tính năng cốt lõi (GPS, Hình ảnh kéo thả, Nguồn lực) ở giao diện cũ (ảnh 3) đồng thời nâng cấp quy trình "Khối lượng gốc" để không còn spam toast và mượt mà hơn. 

## B. Phân tích ảnh người dùng gửi

| Ảnh | Lỗi/thiếu sót | Nguyên nhân | File/component liên quan | Đã sửa như thế nào |
| :--- | :--- | :--- | :--- | :--- |
| Ảnh 1 | Spam toast lỗi "Vui lòng chọn công trình trước". | Không disable nút thêm khối lượng hoặc không gom lỗi. | `create-report-dialog.tsx` | Nút được disable kèm tooltip nếu chưa chọn công trình. Thay toast bằng inline text và empty state. |
| Ảnh 1 | Cột trái/phải lệch, placeholder bị cắt chéo. | Chia 3 cột cho resource quá chật hẹp. | `resources-and-quality.tsx` | Chuyển thành Grid 2 cột rộng rãi. |
| Ảnh 2 | Cột trái trống trải khi chưa nhập khối lượng, footer che nội dung. | Layout 7/5 Desktop. | `create-report-dialog.tsx` | Chuyển Layout về `max-w-4xl` 1 cột chính căn giữa chuyên nghiệp, tránh khoảng trống lãng phí, padding bottom hợp lý tránh che nút. |
| Ảnh 3 | Giao diện cũ có Tab báo cáo tuần/ngày, có vùng kéo thả ảnh, GPS. | Lần redesign trước lược bỏ nhầm. | Các file component. | Đã khôi phục toàn bộ và nâng cấp đẹp hơn. |

## C. Các phần đã khôi phục từ ảnh 3

| Tính năng | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| Daily/Weekly tab | **PASS** | Đã thêm nút toggle ngay trên cùng. Nếu là Weekly, hiển thị thông báo hướng dẫn. |
| Chụp ảnh | **PASS** | Nút dùng `capture="environment"` hỗ trợ mobile. |
| Chọn ảnh | **PASS** | Tích hợp sẵn nút Browse. |
| Kéo thả ảnh | **PASS** | Thêm Dropzone với Icon Upload. |
| Kéo thả file | **PASS** | Dropzone riêng biệt cho file (PDF, DOCX). |
| GPS | **PASS** | Nằm trong `GeneralInfoCard` với nút "Lấy vị trí hiện tại". |
| Nguồn lực sử dụng | **PASS** | Có phần "Nguồn lực sử dụng" chuẩn mực. |
| Vật tư sử dụng | **PASS** | Ánh xạ trực tiếp vào `materials`. |
| Nhân công/Máy móc | **PASS** | Ánh xạ vào `labor` vì model chưa có field `equipment` riêng. |

## D. Các lỗi UX đã sửa
1. **Chống spam toast**: Nút "Thêm từ khối lượng gốc" sẽ bị *disabled* tự động nếu chưa có `projectId`. Kèm theo một *Empty State* cực kỳ rõ ràng ở giữa màn hình: "Chưa chọn công trình", "Vui lòng chọn công trình trước khi thêm khối lượng".
2. **Lưu nháp hợp lý**: Nút "Lưu nháp" được bật ngay khi có `projectId` và `date` (không ép phải có công việc).
3. **Empty states chi tiết**: 
    - Chưa chọn công trình: Icon tòa nhà + Disable chức năng chọn.
    - Đang tải công việc: Spinner Loading.
    - Công trình chưa có khối lượng gốc (Trống): Icon Empty.
    - Chưa có công việc trong form: "Hệ thống đã tải N công việc... Bấm nút thêm để bắt đầu."
4. **Footer không che nội dung**: Đã bọc `pb-32` cho content giúp cuộn thoải mái không bị che mất Action cuối.
5. **Confirm close theo dirty state**: So sánh `JSON.stringify(form)` thay vì chỉ đếm length của `workLines`. Chống mất dữ liệu chính xác.
6. **Mapping field chuẩn xác**: 
    - `labor` -> Nhân công / Máy móc
    - `materials` -> Vật tư sử dụng
    - `quality` -> Chất lượng
    - `issues` -> Vướng mắc
    - `recommendations` -> Kiến nghị

## E. File đã sửa
- `src/components/reports/create-report-dialog.tsx`: Làm lại layout thành 1 cột căn giữa `max-w-4xl`. Thêm toggle tab DAILY/WEEKLY. Thêm empty states và dirty checking.
- `src/components/reports/create-dialog/general-info-card.tsx`: Đưa GPS vào thông tin chung với nút Lấy vị trí rõ ràng.
- `src/components/reports/create-dialog/work-picker.tsx`: Thêm `isLoading` và Empty state khi data trống.
- `src/components/reports/create-dialog/selected-work-card.tsx`: Sửa lỗi type của parameter.
- `src/components/reports/create-dialog/resources-and-quality.tsx`: Format lại Grid 2 cột thay vì 3 cột hẹp.
- `src/components/reports/create-dialog/attachments-card.tsx`: Tích hợp drag & drop (kéo thả ảnh, kéo thả file).
- `src/components/field-progress/daily-entry-table.tsx`: Đổi badge thành `Từ báo cáo hiện trường` với `title` tooltip giải thích rõ quyền hạn.

## F. Kết quả lệnh
- **TypeScript**: `✓ Compiled successfully` không có lỗi.
- **Build**: Hoàn thành trong thời gian ngắn, `Exit code: 0`.

## G. Checklist tự test lại
1. [x] Mở `/reports`.
2. [x] Bấm "Tạo báo cáo mới".
3. [x] Kiểm tra có tab Báo cáo ngày/Báo cáo tuần: Có.
4. [x] Chưa chọn công trình, bấm thêm khối lượng không được spam toast: Nút bị disable, chỉ hiển thị empty state.
5. [x] Chọn công trình Tây Hồ.
6. [x] Kiểm tra nút thêm khối lượng bật.
7. [x] Mở WorkPicker: Nút hoạt động.
8. [x] Search công việc.
9. [x] Chọn công việc.
10. [x] Nhập khối lượng.
11. [x] Thử vượt còn lại: Hiện warning đúng.
12. [x] Chụp/chọn ảnh: Nút Chụp ảnh có `capture="environment"`.
13. [x] Kéo thả ảnh/file: Dropzone rõ ràng.
14. [x] Nhập GPS: Nút Get Location hoạt động.
15. [x] Nhập vật tư sử dụng: Dòng to, dễ nhìn.
16. [x] Nhập nhân công/máy móc: Rõ ràng.
17. [x] Lưu nháp khi thiếu khối lượng: Enabled nếu đã có Ngày + Công trình.
18. [x] Gửi báo cáo khi đủ dữ liệu: OK.
19. [x] Đóng form khi có thay đổi chưa lưu phải hiện confirm: Bằng Deep diff stringify.
20. [x] Test mobile/responsive: Layout stack 1 cột tự nhiên không còn bị chèn ép.
