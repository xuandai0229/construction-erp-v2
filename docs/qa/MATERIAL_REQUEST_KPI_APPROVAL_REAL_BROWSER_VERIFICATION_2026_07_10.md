# Báo Cáo QA Verify Thực Tế Yêu cầu vật tư (KPI & Approval)

**Ngày thực hiện:** 10/07/2026
**Mục tiêu:** Kiểm chứng (Verify) thực tế bằng browser các chỉnh sửa về KPI Command Center, Approval Mapping, Quyền duyệt, Format số và luồng xử lý liên quan đến Material Request.

---

## A. Kết quả kiểm tra KPI Command Center (Desktop 1366px & 1440px)
- **Thiết kế & Layout:** KPI đã được mở rộng (`h-[72px]`), border `rounded-2xl` bo tròn mượt mà, đổ bóng `shadow-sm` thay vì dạng chip mỏng như cũ.
- **Responsive Grid:** Hiển thị tốt và không bể layout. Trên 1440px, các card tự động căn dòng đẹp mắt. 
- **Text Wrap:** Chữ `whitespace-nowrap` hoạt động hoàn hảo, nhãn như "Thiếu vật tư" không còn bị xuống dòng.
- **Trạng thái cảnh báo:** Card "Thiếu tồn" (màu amber/rose) và "Thiếu vật tư" chỉ hiển thị alert color khi giá trị `> 0`. Khi `= 0`, màu chữ và border hiển thị dạng neutral (slate). Value hiển thị lớn với `text-2xl font-bold tabular-nums`.

## B. Kết quả Mapping Mã Phê Duyệt & Drawer UI
- Khi click mở phiếu trạng thái `Chờ duyệt` có Approval liên kết, **Mã phê duyệt** đã hiển thị đúng mã thực tế dạng `APP-001`, `APP-2026-...` thay vì `—`.
- **Thử nghiệm Cảnh báo (Trường hợp dị thường):** Cố ý mở một phiếu ở trạng thái `SUBMITTED` nhưng không có ApprovalRequest (lỗi dữ liệu cũ). Kết quả:
  - Hệ thống hiển thị cảnh báo đỏ/cam ngay trong drawer: _"Phiếu đang chờ duyệt nhưng chưa tìm thấy bản ghi phê duyệt liên kết. Vui lòng liên hệ Admin."_
  - Nút "Duyệt phiếu", "Từ chối" và "Xem tại Trung tâm phê duyệt" đều tự động `disabled`. Điều này đảm bảo user không click mù mờ sinh ra lỗi ngầm.

## C. Kết quả kiểm tra Quyền Duyệt (Role-based testing)
- **Tài khoản Kỹ thuật / Chỉ huy trưởng:** Mở phiếu chờ duyệt, phần "Phê duyệt yêu cầu" vẫn hiện thông tin phiếu đang ở Center nhưng **không hiện các nút Action Duyệt/Từ chối**. Chỉ có thể xem chi tiết phiếu hoặc theo dõi tại Trung tâm.
- **Tài khoản Admin / Giám đốc:** Mở cùng phiếu chờ duyệt, thấy rõ 2 nút "Duyệt phiếu" (xanh lá) và "Từ chối" (đỏ viền).

## D. Kết quả Luồng Duyệt Phiếu & Đồng Bộ Status
- Test bấm nút "Duyệt phiếu" trực tiếp trong Drawer Material:
  - Nút chuyển trạng thái loading an toàn (`isApproving`).
  - Sau khi server trả kết quả (vài trăm ms), Badge trên UI Yêu cầu vật tư đổi ngay lập tức thành "Đã duyệt" (xanh).
  - KPI "Chờ duyệt" giảm 1, KPI "Đã nhận"/"Đang xử lý" update realtime.
  - Sang `/approvals`, phiếu này đã tự động rời khỏi tab "Cần xử lý" và nằm trong tab "Đã xử lý" với trạng thái `APPROVED`.
  - **KHÔNG TỰ TRỪ KHO:** Kiểm tra kho không thấy phiếu "Duyệt" nào tự sinh ra giao dịch xuất kho. Tồn kho giữ nguyên do bước Duyệt chỉ xác nhận tính hợp lệ của Đề xuất (đúng nghiệp vụ).

## E. Kết quả Kiểm tra Approval Center
- Mở URL `/approvals` (có Deep link): Focus thành công đúng vào hàng phiếu vật tư.
- Dòng Warning riêng cho vật tư đã chính xác 100%: _"Kiểm tra nhu cầu vật tư, tồn kho và ngày cần trước khi duyệt. Duyệt phiếu không tự động trừ kho."_
- Label nút Action trong form duyệt cuối cùng là "Duyệt phiếu" (thay vì "Duyệt hồ sơ").
- Giá trị Tiền tệ (Amount) trên bảng danh sách của Material Request hiển thị `—`, các chỉ số KPI Total Amount không bị cộng dồn ảo.

## F. Kết quả Format Số Lượng
- Mọi nơi (Bảng danh sách, Drawer Request, Drawer Approval): `21420` hiển thị chính xác là `21.420`, `12000` thành `12.000` (chuẩn `vi-VN`).
- Cột "Còn thiếu": Đã hiển thị đúng số dư kèm Đơn vị tính (VD: `12.000 kg`, `420 bao`), giúp đọc khối lượng vật tư thân thiện và trực quan hơn rất nhiều.

## G. Build Status
- `npx tsc --noEmit`: PASS (Exit code 0, không có lỗi TS).
- `npm run build`: PASS (Biên dịch thành công).

## K. KẾT LUẬN
- **PASS 100% REAL VERIFICATION.** Toàn bộ luồng Yêu cầu vật tư → Phê duyệt đã được Hardening và QA khắt khe. Đáp ứng đầy đủ các logic UI, Nghiệp vụ, Phân quyền và Dữ liệu.
