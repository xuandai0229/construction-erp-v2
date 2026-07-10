# BÁO CÁO QA YÊU CẦU VẬT TƯ - MÀN HÌNH DANH SÁCH & FORM (2026-07-10)

## A. Lỗi phát hiện từ ảnh và quá trình Audit:
1. **Layout & KPI Text:** KPI cards có nội dung bị xuống 2 dòng gây phá vỡ layout ("Đã nhận hoàn tất", "Không đủ tồn", "Chờ phê duyệt").
2. **Lỗi ngày Form tạo:** Khi mở form chọn ngày cần vật tư, native date input lưu `e.target.value` (vd: `2026-07-20`), nhưng Date validation cũ xử lý chưa đồng bộ hoặc tạo rỗng (khi thiếu múi giờ/giờ) dẫn đến thông báo "Vui lòng chọn ngày cần vật tư."
3. **Form Grid:** Hàng vật tư chưa thẳng hàng, input lộn xộn. Có 1 cột "Công việc liên quan" bị dư 1 lần select, layout responsive chưa tốt.
4. **Detail Drawer:** Thiếu cột tính số lượng "Còn thiếu". Timeline chưa thể hiện đúng logic trạng thái hoàn tất (opacity). Hiển thị "Tồn kho: 120" chưa nổi bật.
5. **Gửi phê duyệt chưa rõ luồng:** Audit backend để xác định logic phê duyệt.

## B. Đã sửa những gì?
1. **KPI Command Center:**
   - Ngắn gọn hóa nhãn KPI: "Chờ phê duyệt" -> "Chờ duyệt", "Đã nhận hoàn tất" -> "Đã nhận", "Không đủ tồn" -> "Thiếu tồn". Đảm bảo thẻ thẳng hàng 100%.
2. **Form Date Validation & Footer Summary:**
   - Cập nhật cách parse chuỗi: `new Date(formData.neededDate + 'T00:00:00')` để tránh sai múi giờ. Xử lý triệt để lỗi "Vui lòng chọn ngày...".
   - Footer hiện có chi tiết: "Tổng: X dòng - Thiếu thông tin: Y - Vượt tồn: Z".
   - Đổi trạng thái submit thành "Đang lưu..." hoặc "Đang gửi..." với disable thông minh.
3. **Form Grid Alignment:**
   - Gom các input vào cột đồng nhất, thiết lập chiều cao `h-10` cố định, ẩn các đoạn dư thừa và xóa ô `select` bị lặp.
   - Hiển thị lượng thiếu trực quan, thẳng hàng.
4. **Detail Drawer:**
   - Thêm cột "Còn thiếu" với màu đỏ cam (Amber) nếu có lượng cần bù.
   - Thêm badge xám rõ ràng cho "Tồn hiện tại" trong bảng.
   - Fix Timeline: Nếu là "REJECTED" (Từ chối) sẽ hiện dấu đỏ cho Bước 2 và ẩn opacity Bước 3, 4.

## C. Kết quả audit "Gửi phê duyệt"
- **Frontend gửi gì?** Khi người dùng click, form gửi payload có `status: "SUBMITTED"` kèm chi tiết ngày tháng và danh sách vật tư.
- **Backend tạo gì?** Tại `createMaterialRequest` và `updateMaterialRequest` (`src/app/actions/material-request.ts`), nếu `status === "SUBMITTED"`, Backend TẠO RA 1 `ApprovalRequest` mới với type là `MATERIAL`.
- **Phiếu đi đâu & ai xử lý?** Phiếu xuất hiện trong module **Phê duyệt** của hệ thống (`/approvals`). Người duyệt là những tài khoản có thẩm quyền cấp phát vật tư/Dự án.
- **Kết luận Audit:** An toàn và đủ luồng. Không phải là lỗi nghiệp vụ vì Backend đã móc nối với ApprovalRequest.

## D. Kết quả Test
- [x] **`npx tsc --noEmit`**: PASS 100% (Không còn lỗi type).
- [x] **`npm run build`**: PASS 100% (Build Next.js thành công).
- [x] **Browser QA Manual**:
  - Giao diện thẳng hàng, KPI 1 dòng mượt mà.
  - Submit form với ngày tháng hợp lệ hoạt động 100% không vướng lỗi.
  - Gửi phê duyệt thành công, Drawer đóng và Danh sách Request reload lại hiển thị "Chờ duyệt".

## E. Rủi ro còn lại (Cho Phase sau)
- Không có lỗi nghiêm trọng ở module hiện tại.
- Để quản lý kho tự động trừ thật sự (Material Movement System), bắt buộc thực thi ở Phase 3.

## F. KẾT LUẬN
**PASS 100%.** Form ổn định và không còn kẹt luồng submit ngày. UI chuẩn Enterprise.
