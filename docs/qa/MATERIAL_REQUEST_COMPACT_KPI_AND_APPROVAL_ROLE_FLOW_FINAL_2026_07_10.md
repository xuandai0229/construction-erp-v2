# BÁO CÁO QA: Compact KPI Ribbon & Phân Quyền Phê Duyệt — Tab Yêu Cầu Vật Tư
**Ngày:** 2026-07-10  
**Phân hệ:** Vật tư > Yêu cầu vật tư

---

## A. Ảnh cũ (Lỗi UI)
- **Vấn đề:** 2 khối "Vận hành chính" và "Cảnh báo & Rủi ro" sử dụng component `KpiCard` quá to (chiều cao ~120px mỗi khối).
- **Hệ quả:** Chiếm quá nhiều diện tích dọc màn hình (Vertical Space), đẩy bảng danh sách phiếu vật tư xuống dưới, gây cảm giác nặng nề, không giống một ERP Enterprise gọn gàng.

## B. Đã sửa KPI thành "Compact Ribbon" thế nào?
1. **Loại bỏ KpiCard to:** Thay vì dùng chung `KpiCard` của dashboard, tab này dùng thiết kế riêng dạng Inline Compact Card.
2. **Kích thước gọn:** Mỗi card chỉ cao khoảng ~64px (padding `py-2.5`), thu nhỏ icon (`h-8 w-8`).
3. **Layout 2 hàng siêu mỏng:**
   - Hàng 1 (Vận hành): 4 card compact trải ngang.
   - Hàng 2 (Cảnh báo): 3 card compact trải ngang.
4. **Logic hiển thị Cảnh báo:** Nếu chỉ số cảnh báo (Quá hạn, Thiếu tồn) = 0, card sẽ có màu trắng xám chìm. Nếu > 0, card mới nổi màu đỏ/viền đỏ để thu hút sự chú ý.
5. **Kết quả:** Tổng chiều cao khu vực KPI giảm từ ~280px xuống chỉ còn ~150px. Không gian còn lại nhường toàn bộ cho bảng dữ liệu chính.

## C. Vì sao KPI đảm bảo 100% không xuống dòng?
- Thay thế hoàn toàn grid flex wrap rủi ro.
- Label được bọc cứng bằng class `whitespace-nowrap`, kể cả ở màn 390px (Mobile) text cũng không gãy dòng mà sẽ co giãn phần card hợp lý.

---

## D. Sau khi gửi phê duyệt, phiếu đi đâu?
- Backend tạo 1 bản ghi `ApprovalRequest` với các thông tin:
  - `type`: `"MATERIAL"`
  - `sourceType`: `"MATERIAL_REQUEST"`
  - `sourceId`: ID của phiếu Yêu cầu vật tư
  - `status`: `"PENDING"`
- Điểm đến: **Module Phê duyệt (URL: `/approvals`)**

## E. Role nào thấy và duyệt được phiếu?
Dựa vào kiến trúc phân quyền của hệ thống (RBAC):
- Giám đốc (`DIRECTOR`)
- Phó giám đốc (`DEPUTY_DIRECTOR`)
- Quản lý (`MANAGER`)
- Quản trị viên (`ADMIN`)

## F. Vì sao người tạo (Chỉ huy trưởng) không thấy phiếu ở module Phê duyệt?
- **Nguyên nhân:** File `src/components/layout/sidebar.tsx` có cấu hình `HIDDEN_FOR_COMMANDER = ['/approvals', ...]`. Chỉ huy trưởng tạo phiếu xong sẽ không có quyền truy cập màn hình `/approvals` vì họ là người thi công, không phải người có thẩm quyền ký duyệt tài chính/vật tư cấp công ty.
- **Giải pháp UX:** 
  - Đã thêm Toast message thông báo cụ thể khi Submit: *"Đã gửi phiếu đến Trung tâm phê duyệt. Người có quyền duyệt (Giám đốc/Phó GĐ) sẽ xử lý."*
  - Trong Chi tiết phiếu > **Thông tin phê duyệt**: 
    - Nếu là role Giám đốc: Hiện nút **"Mở Trung tâm phê duyệt"**.
    - Nếu là role Chỉ huy trưởng: Hiện text giải thích **"Bạn đã gửi phiếu. Người có quyền duyệt sẽ xử lý tại module Phê duyệt."**

## G. Kết quả duyệt/từ chối cập nhật kho thế nào?
- **KHÔNG TỰ Ý TRỪ KHO:** Đã bổ sung note rõ ràng ở dưới sơ đồ Tiến trình: *"Duyệt phiếu chỉ là bước phê duyệt yêu cầu. Cấp phát và trừ tồn kho do Thủ kho xử lý."*
- **Khi duyệt:** `ApprovalRequest` chuyển `APPROVED`, trigger cập nhật `MaterialRequest.status = APPROVED`.
- **Khi từ chối:** Chuyển sang `REJECTED`, lý do từ chối được lưu thẳng vào phiếu vật tư.

---

## H. Typecheck & Build
| Lệnh | Trạng thái |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 lỗi) |
| `npm run build` | ✅ PASS |

## I. Kết luận
✅ **PASS 100%**
- UI KPI đã gọn, đúng chuẩn Enterprise Ribbon.
- Luồng duyệt đã test thực tế rõ ràng vai trò người trình (Commander) và người duyệt (Director). Dữ liệu liên thông chính xác qua `ApprovalRequest`.
