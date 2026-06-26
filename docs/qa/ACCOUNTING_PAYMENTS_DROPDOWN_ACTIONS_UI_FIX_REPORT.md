# Báo cáo: Sửa lỗi hiển thị và tối ưu UX cho Dropdown Thao tác (Kế toán & Thanh toán)

## 1. Vấn đề ban đầu
Trong lần kiểm tra thực tế giao diện `Kế toán & Thanh toán`, người dùng phát hiện các lỗi UX/UI nghiêm trọng liên quan đến cột Thao tác (Menu 3 chấm):
1. **Lỗi Clipping (bị cắt xén)**: Dropdown Menu mở xuống dưới bị cắt mất phần nội dung khi bảng chỉ có 1-2 dòng hoặc dòng nằm sát mép dưới màn hình (do parent container sử dụng `overflow-auto`/`overflow-hidden`).
2. **Quá nhiều item vô hiệu hóa (disabled)**: Hiển thị cả 5-6 chức năng trong dropdown nhưng lại bị làm mờ trắng toàn bộ (khiến người dùng lầm tưởng hệ thống đang lỗi không cho bấm).
3. **Màu sắc Disabled nhạt nhòa**: Các icon thao tác và chữ bị mờ khiến giao diện trông thiếu sức sống và thiếu chuyên nghiệp.
4. **Không rõ lý do vô hiệu hóa**: Người dùng không biết tại sao action đó lại bị disable.

## 2. Phương án giải quyết đã triển khai

### A. Triển khai kiến trúc Portal/Floating Menu (Xử lý dứt điểm Clipping)
Thay vì render dropdown trong DOM của từng dòng (bị giới hạn bởi `overflow` của Table), tôi đã tạo và sử dụng thành phần `DropdownMenuPortalContent`.
- Thành phần này được render thẳng vào `document.body` thông qua `createPortal` (React DOM).
- Sử dụng `position: fixed` kết hợp `getBoundingClientRect()` từ nút 3 chấm để tính toán tọa độ (top, left) động.
- **Tự động lật ngược (Auto-flip)**: Hệ thống sẽ tự động đo lường khoảng trống bên dưới mép màn hình. Nếu khoảng không phía dưới không đủ, menu sẽ tự lật lên trên để hiển thị hoàn hảo.
- **Đóng an toàn**: Menu sẽ tự đóng khi click ra ngoài, scroll chuột (trên bảng hoặc toàn trang) hoặc resize màn hình.

### B. Lọc Action thông minh (Chống nhiễu thông tin)
Không còn tình trạng hiển thị cả menu toàn là nút `disabled`. Hệ thống hiện chỉ hiển thị những Action **thật sự có ý nghĩa** ở từng trạng thái:
- **DRAFT / REJECTED**: Chỉ hiện `Gửi phê duyệt` và `Xóa hồ sơ`.
- **SUBMITTED**: Chỉ hiện `Duyệt hồ sơ` và `Từ chối duyệt`.
- **APPROVED**: Chỉ hiện `Chốt thanh toán`.
- **CANCELLED / PAID**: Hiển thị dòng *"Không có thao tác khác"* bằng chữ in nghiêng màu nhạt.
*Nếu người dùng bị thiếu quyền cho các Action khả dụng ở trên, Action đó mới hiện trạng thái disabled.*

### C. Tối ưu Giao diện (Màu sắc và Tooltip)
- **Tooltips Giải thích (Title)**: Mỗi nút bấm (kể cả icon bên ngoài và bên trong dropdown) đều được viết một file logic tập trung `getPermissionsAndTooltips` để tính toán thông báo `tooltip` (thẻ `title`) chi tiết nhất dựa trên nghiệp vụ (Ví dụ: *"Hồ sơ đã duyệt, không thể sửa thông tin tài chính."*).
- **Trạng thái Disabled**: Đổi style các nút khi disabled sang text mờ hơn (`text-slate-300`), thay đổi con trỏ chuột sang `cursor-not-allowed` để rõ ràng đây là nút không thể bấm do điều kiện chứ không phải do lỗi web.
- Nút "Hủy hồ sơ" (Undo2) và nút "Xóa hồ sơ" (Trash2) được tách rõ ràng và màu đỏ cảnh báo (`text-rose-600`) đồng bộ.

## 3. Các file đã sửa đổi
- `src/app/(dashboard)/accounting/components/accounting-workspace.tsx`:
  - Khởi tạo hàm trợ giúp `getPermissionsAndTooltips()`.
  - Khởi tạo component `DropdownMenuPortalContent` (sử dụng Portal).
  - Tối ưu hóa UI của các nút Action.

## 4. Kết quả QA & Build
- Đã chạy giả lập quy trình qua file `scripts/qa-accounting-payments.ts` và đảm bảo các Rules (Không sửa PAID/APPROVED, Không reject không có lý do, Không bypass quyền) vẫn được Server từ chối đúng chuẩn.
- TypeScript Compile Check (`npx tsc --noEmit`): Không có lỗi Types.
- Next.js Production Build (`npm run build`): Build thành công (Exit code 0).
- Hệ thống Dialog (ConfirmDialog, ReasonDialog) vẫn tương tác trơn tru.

## 5. Rủi ro còn lại
- **Position Fixed trên Mobile Chrome**: Ở một số trình duyệt di động có thanh công cụ tự ẩn (như Safari/Chrome Mobile), `window.innerHeight` có thể dao động khi cuộn, tuy nhiên do menu tự động đóng khi scroll nên lỗi nhảy menu đã được xử lý triệt để.
- **Giải pháp Portal**: Hiện tại Portal tự tính width `224px`. Nếu tương lai cần action title dài hơn, UI có thể xuống dòng, nên chỉ duy trì nội dung action ngắn gọn (dưới 4 từ) là tốt nhất.
