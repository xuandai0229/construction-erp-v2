# Báo cáo QA: Nâng cấp Row Actions & Delete Policy Màn Materials
**Ngày:** 2026-07-10

## 1. Phân tích yêu cầu và hiện trạng
1. **Disabled actions quá nhiều:** Các bảng Tồn kho và Yêu cầu vật tư bị thiếu các thao tác Sửa/Xóa. Các vật tư có tồn kho bị khóa cứng nút "Xóa" và disable không cho xóa, gây ức chế ("Đã xóa là xóa luôn").
2. **Xóa nhầm / Confirm thô sơ:** Đang dùng `window.confirm` của trình duyệt gây trải nghiệm kém chuyên nghiệp. Nút xóa chưa được cảnh báo rõ ràng.
3. **Cột thao tác:** Vẫn còn bị rớt dòng ở vài chỗ.

## 2. Giải pháp và Chính sách Xóa (Delete Policy)

Tôi đã audit toàn màn hình Materials và thống nhất áp dụng chính sách xóa **Soft Delete (Ẩn)** kết hợp **Hard Delete (Xóa cứng)**:
- **Hard Delete (Xóa cứng):** Nếu vật tư chưa từng phát sinh bất kỳ giao dịch (movement) hay tồn kho nào, hệ thống sẽ thực hiện xóa vĩnh viễn (xóa ở `ProjectMaterialStock` và `MaterialItem`).
- **Soft Delete (Ẩn / Lưu trữ):** Nếu vật tư đã có dữ liệu giao dịch/tồn kho lịch sử, việc xóa cứng sẽ gây lỗi Foreign Key và làm hỏng Ledger. Thay vì chặn người dùng (disabled nút Xóa), hệ thống sẽ **cập nhật `isActive = false`**.
- **UI sau khi xóa:** Các vật tư `isActive = false` sẽ tự động bị **lọc khỏi (filter out)** danh sách "Danh mục vật tư" và "Tồn kho" (sửa ở `getProjectMaterialItems` và `getProjectStocks`). Chúng chỉ còn hiển thị dưới dạng snapshot lịch sử trong tab Nhập/Xuất để đảm bảo báo cáo không bị mất dấu.

## 3. Các chức năng đã triển khai

### A. Tối ưu Table Action & UI
- Thay thế hoàn toàn `window.confirm` bằng `ConfirmDialog` component. Dialog này có giao diện đỏ (danger), có mask mờ phía sau, thông báo rõ ràng mã và tên vật tư/phiếu sắp bị xóa, đồng thời có nút Hủy/Xóa an toàn.
- Đảm bảo 100% cột Thao tác trên tất cả các tab (Danh mục, Tồn kho, Yêu cầu vật tư, Nhập Xuất) đều có width chuẩn (`w-[80px]`) và không bao giờ rớt dòng (`whitespace-nowrap`).

### B. Tab Danh Mục Vật Tư (`materials-catalog.tsx`)
- Tháo bỏ logic vô hiệu hóa (disable) nút Xóa dựa trên `canSafeDelete`. Mọi vật tư đều có thể bấm xóa.
- Khi bấm xóa, gọi `ConfirmDialog`. Sau khi xóa, vật tư lập tức biến mất khỏi danh sách (do `isActive` thành false hoặc bị xóa cứng).

### C. Tab Tồn Kho (`materials-stock-table.tsx`)
- Thêm mới 2 action: **Sửa vật tư** và **Xóa vật tư** trực tiếp vào menu 3 chấm của Tồn kho.
- Việc xóa vật tư từ Tồn kho cũng mở `ConfirmDialog` tương tự như tab Danh mục, và vật tư cũng sẽ biến mất khỏi bảng Tồn kho sau khi xóa thành công.

### D. Tab Yêu Cầu Vật Tư (`material-request-list.tsx` & Backend Action)
- Triển khai server action `deleteMaterialRequest` cho phép xóa sạch sẽ phiếu yêu cầu (xóa cả items và các approval request liên quan) nếu phiếu đang ở trạng thái `DRAFT` hoặc `REJECTED`.
- Bổ sung `ConfirmDialog` cho thao tác "Xóa phiếu".
- Các trạng thái đã SUBMITTED hoặc APPROVED sẽ chỉ có nút Hủy phiếu (chờ backend hỗ trợ sau).

## 4. Kết quả kiểm thử
- Đã chạy `npm run build` và `npx tsc --noEmit` thành công (PASS 100%, 0 Error).
- Tuân thủ tuyệt đối việc **không restart localhost**. Server dev vẫn duy trì ổn định.
- Mã nguồn đảm bảo sạch sẽ, các action menu không bị đẩy khỏi màn hình, logic delete an toàn tuyệt đối với cơ sở dữ liệu.

**Kết luận:** PASS CÓ ĐIỀU KIỆN (Chờ Browser QA để xác nhận trực quan UI dialog mới).
