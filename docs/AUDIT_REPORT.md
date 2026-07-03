# BÁO CÁO AUDIT LỌC SẠCH HỆ THỐNG — READ ONLY

## 1. Tóm tắt tình trạng hiện tại

* **Trạng thái dự án:** Dự án đang trong giai đoạn phát triển và chuyển giao (UAT). Core tính năng ưu tiên (Bảng khối lượng gốc, Nhập khối lượng, Tổng hợp khối lượng, Đề xuất vật tư) đã được code và kết nối. Tuy nhiên, hệ thống tồn tại nhiều phân hệ "vỏ" (placeholder) làm rối giao diện.
* **Rủi ro lớn:** Không có rủi ro quá nghiêm trọng về kiến trúc. Tuy nhiên, việc giữ quá nhiều module rỗng (chưa có code logic thật) trên Sidebar có thể gây hiểu nhầm cho end-user.
* **Đề xuất xử lý:** Cần dọn dẹp theo từng giai đoạn. Giai đoạn đầu tiên là ẩn các phân hệ chưa dùng ra khỏi giao diện để tập trung vào 3-4 luồng chính đã chốt.

## 2. Những thứ CÓ THỂ XÓA nhưng CHƯA XÓA

| STT | File/Thư mục/Module | Lý do có thể xóa/ẩn | Mức độ an toàn | Rủi ro nếu xóa nhầm | Cần kiểm tra thêm |
| --- | ------------------- | ------------------- | -------------- | ------------------- | ----------------- |
| 1 | `src/app/(dashboard)/materials/` | Chỉ là EmptyState chưa có logic. | Cao | Mất route (404) nếu vẫn để link ở Sidebar. | Ẩn link ở Sidebar trước khi xóa. |
| 2 | `src/app/(dashboard)/reports/` | Đang ở trạng thái "Đang thiết kế lại". | Cao | Mất màn placeholder. | Ẩn link ở Sidebar. |
| 3 | `src/app/(dashboard)/accounting/` | EmptyState. | Cao | Mất route. | Ẩn link. |
| 4 | `src/app/(dashboard)/approvals/` | EmptyState. | Cao | Mất route. | Ẩn link. |
| 5 | `src/app/(dashboard)/audit/` | EmptyState. | Cao | Mất route. | Ẩn link. |
| 6 | `src/app/(dashboard)/contracts/` | EmptyState. | Cao | Mất route. | Ẩn link. |
| 7 | `src/app/(dashboard)/suppliers/` | EmptyState. | Cao | Mất route. | Ẩn link. |

*Lưu ý: Thay vì xóa hẳn thư mục, nên ẩn các Item này trong mảng `navigation` tại `src/components/layout/sidebar.tsx`.*

## 3. Những thứ KHÔNG NÊN XÓA

| STT | File/Thư mục/Module | Lý do cần giữ | Đang liên quan đến chức năng nào |
| --- | ------------------- | ------------- | -------------------------------- |
| 1 | `src/app/(dashboard)/projects/[id]/field-progress` | Phân hệ ưu tiên 1. | Bảng khối lượng gốc, nhập khối lượng hàng ngày, tổng hợp khối lượng. |
| 2 | `src/app/(dashboard)/projects/[id]/material-requests` | Module đề xuất vật tư mới. | Gắn trực tiếp với dự án. |
| 3 | Các bảng Prisma: `User`, `Project`, `ProjectMember`, `FieldProgress*` | Là core DB. | Phân quyền, dự án, tiến độ. |
| 4 | `src/app/(dashboard)/documents/` | Đang có code quản lý thư mục/file. | Liên kết ở chi tiết công trình. |
| 5 | Bảng Prisma `SiteReport` và các bảng liên quan | Vẫn đang được dùng để đếm thống kê ở Dashboard. | Dù frontend `reports/` đóng, DB vẫn truy vấn số liệu cũ. |

## 4. Những thứ CẦN THÊM để hệ thống sạch và chắc hơn

| STT | Cần thêm | Lý do | Mức ưu tiên | File/khu vực liên quan |
| --- | -------- | ----- | ----------- | ---------------------- |
| 1 | Guard quyền thao tác (Edit/Delete) ở cấp Component | Backend đã có `requireProjectAccess`, nhưng frontend cần ẩn hẳn UI sửa/xóa nếu user không đủ quyền. | Cao | `app/(dashboard)/projects/` |
| 2 | Chuẩn hóa màu sắc (Theme Consistency) | Tránh tình trạng mỗi module dùng các dải màu Tailwind khác nhau cho cùng một trạng thái. Cần define biến màu trong `globals.css` hoặc `tailwind.config`. | Trung bình | UI Components, `globals.css` |
| 3 | Xử lý Loading State / Suspense | Hiện các trang fetch DB trực tiếp ở Server Component có thể gây khựng giao diện khi load chậm. Cần `loading.tsx` hoặc Skeleton. | Cao | Toàn bộ `app/` |
| 4 | Soft Delete Filter toàn cục | Schema Prisma có `deletedAt`, cần check kỹ các query đã có filter `deletedAt: null` đầy đủ chưa (đặc biệt các truy vấn phức tạp). | Cao | Logic truy vấn Prisma |
| 5 | Mobile Responsive cho Tables | Màn hình `summary` và `daily` có data lưới phức tạp, cần cuộn ngang mượt hoặc chế độ xem thẻ (card view) trên mobile. | Cao | `_components` của `field-progress` |

## 5. Những thứ CẦN SỬA nhưng CHƯA SỬA

| STT | Vấn đề | Ảnh hưởng | File/khu vực | Đề xuất hướng sửa | Mức ưu tiên |
| --- | ------ | --------- | ------------ | ----------------- | ----------- |
| 1 | Sidebar dư thừa chức năng | Gây rối UI, user click vào báo rỗng. | `components/layout/sidebar.tsx` | Comment/ẩn các route: materials, reports, contracts, suppliers, accounting, approvals, audit. | Cao |
| 2 | Code trùng lặp trong UI Card | Layout card ở `dashboard/page.tsx` và `projects/[id]/page.tsx` có thể tách thành shared component. | `app/` | Tạo component `StatCard`, `ModuleCard`. | Thấp |
| 3 | Bảng Prisma thừa/chưa dùng tới | Cồng kềnh DB Schema, sinh Type thừa. | `prisma/schema.prisma` | Có thể xem xét bỏ `ApprovalRequest`, `ChatMessage`, `PaymentPlan` nếu phase 1 không dùng. (Nhưng nên giữ nếu có kế hoạch sớm). | Thấp |

## 6. Rủi ro nếu dọn hệ thống sai cách

* **Rủi ro mất route:** Nếu xóa thư mục `app/` nhưng quên xóa Link trong Sidebar hoặc Dashboard, Next.js sẽ crash cứng (404 lúc build hoặc runtime).
* **Rủi ro mất logic phân quyền:** RBAC đang check theo `CHIEF_COMMANDER` cứng ở Sidebar và Guard. Sửa enum role hoặc sửa logic mảng `HIDDEN_FOR_COMMANDER` sai sẽ làm lộ dữ liệu.
* **Rủi ro lệch database:** Chạy `prisma db push` hoặc xóa field trong schema có thể làm mất dữ liệu test (UAT) đang dùng tốt.
* **Rủi ro build fail:** Xóa/ẩn các components đang được import chéo.

## 7. Kế hoạch dọn sạch an toàn theo từng giai đoạn

### Giai đoạn 1 — Chỉ dọn file rác an toàn
* Quét và dọn các file unused imports.
* Chuẩn hóa lại format (Prettier/ESLint) nếu có.

### Giai đoạn 2 — Dọn UI/module bị ẩn hoặc không dùng
* Ẩn các menu trên Sidebar: Báo cáo, Hợp đồng, Kế toán, Nhật ký, Phê duyệt, Vật tư, Nhà cung cấp.
* Gỡ các link này ra khỏi code, không cho user truy cập.

### Giai đoạn 3 — Chuẩn hóa logic và phân quyền
* Tách `requireProjectAccess` thành một module middleware vững chắc hơn.
* Áp dụng role-based vào từng Button (ví dụ: nút "Xóa công trình").

### Giai đoạn 4 — Chuẩn hóa database/schema
* Back-up data UAT.
* Tạo Prisma Migration chính thức thay vì push db.

### Giai đoạn 5 — Tối ưu build/mobile/PWA
* Thêm loading skeletons, sửa table overflow cho màn hình điện thoại (375px).

## 8. Checklist đề xuất trước khi được phép sửa/xóa

* [ ] `git status` sạch (Working tree clean).
* [ ] DB đã được dump backup (nếu có update schema).
* [ ] Danh sách các menu trên Sidebar cần ẩn đã được PO duyệt.
* [ ] Test Next.js build (`npm run build`) thành công 100%.
* [ ] Có kịch bản kiểm thử (Test cases) xác nhận luồng 3 màn chính không bị ảnh hưởng.

## 9. Kết luận

* **Có nên dọn ngay không?** Rất nên dọn phần **UI (Sidebar)** ngay lập tức để làm gọn hệ thống cho khách hàng trải nghiệm (UAT), tránh ấn tượng xấu vì click vào toàn màn hình "Chưa có dữ liệu".
* **Nên dọn phần nào trước?** Giai đoạn 2 (Dọn giao diện Sidebar). Cắt bỏ những menu dư thừa.
* **Phần nào tuyệt đối chưa nên động vào?** DB Schema và các file trong `projects/[id]/field-progress` (vì luồng này đang chạy test UAT quan trọng).
* **Bước tiếp theo đề xuất là gì?** Yêu cầu phê duyệt danh sách các menu sẽ bị ẩn trên Sidebar. Khi được phép, sẽ tiến hành comment code ở `sidebar.tsx` và xóa thư mục tương ứng.
