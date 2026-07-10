# Báo Cáo QA Hoàn Thiện: Yêu cầu vật tư (KPI & Approval Mapping)

**Ngày thực hiện:** 10/07/2026
**Mục tiêu:** Nâng cấp UI/UX của KPI Command Center chuẩn ERP, làm mịn Approval Mapping và đồng bộ hiển thị dữ liệu (số lượng, cảnh báo).

---

## A. Phân tích lỗi từ ảnh (Tình trạng trước đây)
- **Thiết kế KPI quá mỏng (chip-style):** Hệ thống KPI được build theo dạng filter chips `h-[56px]` với icon `h-8 w-8`. Điều này khiến khối lượng dữ liệu khổng lồ của phân hệ không được thể hiện một cách "Enterprise". Text bị xuống dòng trên màn hình <1440px.
- **Dữ liệu "Mã phê duyệt" (`—`):** Do backend chưa lấy/map giá trị `code` của Approval Request vào frontend. Frontend chỉ có CUID `approvalRequestId`, dẫn đến logic check bị fail và hiển thị placeholder.
- **Approval Mapping rời rạc:** Dù phiếu có `status` là `SUBMITTED`, nhưng nếu chưa kết nối tới Approval Center (lỗi tạo phiếu, data cũ), hệ thống vẫn hiện nút Duyệt nhưng không cho phép hành động, dễ gây bối rối cho user.
- **Số liệu thô:** Lỗi format `21420` thay vì `21.420`, không có hậu tố đơn vị.

## B. Thiết kế KPI mới
- **Layout & Dimension:** Cấu trúc thành `flex h-[72px] items-center gap-3.5 rounded-2xl border px-4 shadow-sm`.
- **Icon Box:** Nâng cấp kích thước `h-10 w-10 shrink-0 items-center justify-center rounded-xl` với tone màu pastel riêng biệt cho từng trạng thái.
- **Value:** Sử dụng `text-2xl font-bold leading-none tabular-nums tracking-tight` để nổi bật con số. 
- **Tooltips:** Thêm title hover: "Thiếu vật tư: Chưa nhận đủ so với đề xuất", "Thiếu tồn: Kho hiện tại không đủ cấp".

## C. Cải tiến Formatting
- **Hệ thống format tự động:** Triển khai helper `Intl.NumberFormat('vi-VN')` trong mọi nơi hiển thị số lượng vật tư (`material-request-list` và `material-request-detail`).
- **Cột "Còn thiếu":** Hiển thị kèm đơn vị tính (`12.000 kg`, `420 bao`) tự động map từ `item.unit`.

## D. Sửa mapping Mã phê duyệt
- **Backend:** Thêm trường `code` vào query select của bảng `ApprovalRequest` trong quá trình fetch danh sách Yêu cầu vật tư tại `app/(dashboard)/materials/page.tsx`. Map dữ liệu vào `approvalRequestCode`.
- **Frontend (Drawer):**
  - Hiển thị chính xác mã (VD: `APP-001`) từ `approvalRequestCode`.
  - Bổ sung **Cảnh báo cực hạn**: NẾU `status === "SUBMITTED"` NHƯNG `!approvalRequestId` -> Bật cảnh báo cam chữ đỏ _"Phiếu đang chờ duyệt nhưng chưa tìm thấy bản ghi phê duyệt liên kết. Vui lòng liên hệ Admin."_ và **Disable hoàn toàn nút Duyệt/Từ chối**.

## E. Hành động Duyệt/Từ chối Inline
- Các user có Role quản trị/giám đốc đã có thể thao tác ngay trên Material Request Drawer.
- Sau khi action gọi Server-Side Mutation (approve/reject), UI sẽ gọi `onSuccess()` tự cập nhật lại badge trạng thái.

## F. Đồng bộ với Approval Center
- **Tên nút:** Nút action dưới cùng được điều chỉnh từ "Duyệt hồ sơ" sang "Duyệt phiếu" đối với `type: MATERIAL`.
- **Message:** Banner warning đã chuyển thành cảnh báo chuyên dụng cho Vật tư: _"Kiểm tra nhu cầu vật tư, tồn kho và ngày cần trước khi duyệt. Quyết định tại đây sẽ đồng bộ lập tức về phiếu yêu cầu vật tư tương ứng."_
- **Ẩn Giá Trị (`Amount`):** Trên list table và mobile card, field "Giá trị" của Material Request bị ẩn (`—`), đồng thời không cộng dồn vào `Pending Amount` của toàn phân hệ.

## G. Typecheck & Build
- `npx tsc --noEmit`: PASS 100%
- `npm run build`: PASS 100%

## H. Browser QA Thực Tế
- [x] KPI 7 thẻ to rõ, hiển thị đẹp trên 1 dòng desktop lớn, đổ layout an toàn trên các màn nhỏ.
- [x] Không còn lỗi xuống dòng nhãn.
- [x] Click lọc chính xác, số liệu tính toán (`reduce/filter`) chuẩn xác.
- [x] Nút Duyệt/Từ chối inline gọi Server Action và refresh page chính xác.
- [x] Màn Approval Center loại trừ thành công các dòng thuộc Material Request khỏi KPI "Giá trị chờ xử lý".

## K. Kết Luận
**PASS.** Phân hệ `Material Request -> Approval` chính thức đạt chuẩn sản xuất (Production Ready).
