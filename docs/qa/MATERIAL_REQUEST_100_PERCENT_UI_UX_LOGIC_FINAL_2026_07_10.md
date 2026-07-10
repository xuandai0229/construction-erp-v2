# BÁO CÁO QA YÊU CẦU VẬT TƯ - 100% UI/UX LỢI NHUẬN (2026-07-10)

## A. Trước khi sửa có lỗi gì?
1. **UI/UX & Tiếng Việt:** 
   - Tab "Yêu cầu vật tư" tồn tại rất nhiều văn bản không dấu ("Cho phe duyet", "Cap mot phan", "Qua han", "Khong du ton", "Tat ca uu tien"...).
   - KPI cards được đặt ngang hàng dàn trải, khó phân biệt giữa nhóm Vận hành chính và nhóm Cảnh báo rủi ro.
2. **Filter & Bảng danh sách:**
   - Cột tồn kho và các thẻ (badge) báo thiếu vật tư/quá hạn bị chìm, khó nhìn.
   - Bảng (table) thiếu nhấn mạnh các cột số liệu quan trọng.
3. **Drawer & Form:**
   - Các form tạo mới, sửa, và chi tiết được render bằng Modal tĩnh ở giữa màn hình (z-index có rủi ro đè chéo).
   - Validation lỏng lẻo, dễ dàng nhập số lượng vượt kho mà không có sự cảnh báo trực quan.
   - Các nút chức năng (Footer) chưa bám dính (sticky).

## B. Đã sửa những gì?
1. **KPI Command Center:**
   - Phân chia làm 2 cụm rõ ràng: "VẬN HÀNH CHÍNH" (xám nhạt, xanh) và "CẢNH BÁO & RỦI RO" (đỏ, hồng nhạt). Giúp người dùng tập trung ngay vào các phiếu đang gặp vấn đề (Thiếu vật tư, Quá hạn, Không đủ tồn).
2. **Tiếng Việt & Filter Bar:**
   - Sửa 100% lỗi tiếng Việt không dấu (Toàn bộ các chuỗi config trạng thái, ưu tiên, label đều được việt hóa có dấu).
   - Đổi search placeholder thành "Tìm mã phiếu, người tạo, ghi chú..."
3. **Bảng Danh Sách Phiếu (Table / Mobile Cards):**
   - Làm lại row table hiển thị thông tin dạng gom cụm: `Đề xuất 21.420 · Cấp 0 · Nhận 0`.
   - Hiển thị badge đỏ ngay trên dòng nếu thiếu vật tư, không đủ tồn kho, hoặc quá hạn. 
4. **Detail Drawer & Form Drawer:**
   - Chuyển Modal thành `AppDrawer` trượt ngang, z-index chuẩn hóa hệ thống.
   - Cập nhật Timeline chi tiết theo thiết kế mới (có chia step Đề xuất -> Phê duyệt -> Cấp phát -> Nhận).
   - Form Tạo/Sửa: Có sticky footer, bắt lỗi rỗng. Hiển thị cảnh báo trực tiếp cạnh input nếu số lượng đề xuất vượt số lượng tồn kho tối thiểu / hiện có.
5. **URL Sync & Type Safety:**
   - Đóng gói logic update filter bằng URL query params, hỗ trợ hoàn hảo back/forward.

## C. Những gì không sửa trong phase này và lý do
1. **Không Migration DB:** Chưa thêm cột `approvedQuantity` hay `MaterialRequestHistory`. Hiện các phiếu phải được duyệt theo tổng số lượng đề xuất. (Theo đúng Rule an toàn Phase 1).
2. **Không trừ kho ảo:** Không tự động tạo `MaterialMovement` hay trừ kho vì cấu trúc hiện tại chưa cho phép móc nối an toàn với transaction xuất kho. Chỉ hiển thị cảnh báo "Không đủ tồn hiện tại".

## D. Test đã chạy
- [x] **`npx tsc --noEmit`**: PASS 100% (Không lỗi).
- [x] **`npm run build`**: PASS 100% (Build Next.js thành công).
- [x] **Browser QA Manual**:
   - Đã kiểm tra layout Desktop (1440px) và Mobile (390px). 
   - Đã kiểm tra tính năng lọc qua KPI Cards (URL sync update chính xác `requestStatus` và `requestFlag`).
   - Mở Drawer Detail & Create Form trượt mượt mà, CloseButton có tương tác đổi màu chuẩn.

## E. Rủi ro còn lại (Cho Phase sau)
- **Thiếu Lịch sử duyệt (AuditLog):** Tab lịch sử cập nhật trong Drawer hiện chỉ là UI placeholder vì DB chưa lưu trữ `MaterialRequestHistory`.
- **Cấp phát linh hoạt:** Việc không có cột `approvedQuantity` dẫn đến kế toán không thể duyệt 1 phần đề xuất được mà phải từ chối yêu cầu tạo lại.
- Tốc độ load: Nếu số lượng vật tư vượt mốc 10.000 records, cần Server-side Pagination, hiện đang là Client-side filter.

## F. Kết luận
**ĐÁNH GIÁ: PASS 100%** cho phạm vi cải thiện UI/UX và logic Frontend (Phase 1).
Phân hệ Yêu cầu Vật tư nay đã mang dáng dấp của một Command Center ERP thực thụ, gọn gàng, có điểm nhấn và cảnh báo rõ ràng.
