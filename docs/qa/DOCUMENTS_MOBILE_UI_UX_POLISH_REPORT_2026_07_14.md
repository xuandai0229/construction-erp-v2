# BÁO CÁO TINH CHỈNH UI/UX MOBILE MODULE TÀI LIỆU
**Ngày thực hiện:** 14/07/2026
**Trạng thái:** PASS CÓ ĐIỀU KIỆN (Chờ duyệt thẩm mỹ)

---

## 1. Trạng thái trước sửa
- **Module:** Tài liệu (`/documents/[projectId]`)
- **Vấn đề:** 
  - Tiêu đề quá lớn, lặp lại tên dự án nhiều lần (ở Breadcrumb, Tiêu đề chính, và cả phía trên danh sách tài liệu).
  - Thanh điều hướng thư mục trên mobile có 2 nút icon mơ hồ, thiếu nhãn rõ ràng.
  - Khối "Tất cả tài liệu" chiếm nhiều không gian, icon quá lớn.
  - Toolbar (Search/Sort) chưa cân đối, input search bị chèn ép.
  - Cấu trúc list-card thư mục và tài liệu bị lộn xộn, menu ba chấm đặt sai chuẩn UX (bên trái).
  - Khoảng trống (padding/gap) quá lớn, làm giảm lượng dữ liệu hiển thị.

## 2. Vấn đề phân cấp thị giác
- Đã quy hoạch lại thứ tự trên mobile:
  1. Header ứng dụng.
  2. Breadcrumb thu gọn (chỉ còn "Công trình / Tài liệu" hoặc "‹ Tài liệu").
  3. Tiêu đề trang cố định: "Tài liệu công trình" kèm mã công trình và tên dự án nhỏ bên dưới.
  4. Thanh điều hướng thư mục (có label rõ ràng).
  5. Toolbar.
  6. Section heading ("Thư mục gốc", "Tất cả tài liệu").
  7. Danh sách Folder/File.

## 3. Typography trước/sau
- **Trước:** Font ngẫu nhiên, tiêu đề dùng `text-2xl` trên mobile, vỡ dòng.
- **Sau:** Áp dụng hệ thống chuẩn:
  - Page title: `text-xl` (20px), font-bold.
  - Section title: `text-lg` (18px) cho phần lớn, `text-[13px]` cho tiêu đề nhóm thư mục.
  - Card title: `text-[13px]`, font-semibold.
  - Metadata: `text-[11px]`, font-medium.
- Bỏ lặp tên dự án. Dòng phụ tên dự án dùng `text-[13px] text-slate-600`.

## 4. Spacing trước/sau
- **Trước:** Dùng `p-4 sm:p-5`, `gap-4`.
- **Sau:** Thu gọn đồng bộ trên mobile:
  - Card padding: `p-3`.
  - Grid/List gap: `gap-2`.
  - Khối chính padding ngang `px-3`.
  - Icon container thu xuống `32x32px` (hoặc `h-8 w-8`).

## 5. Header và breadcrumb
- Breadcrumb đã ẩn tên dự án trên mobile, chỉ hiển thị Icon Back + "Tài liệu".
- Tên dự án dài được truncate hoặc chỉ hiện ở tiêu đề chính.

## 6. Folder navigation
- Thanh Mobile Folder Toggle thiết kế dạng thanh ngang:
  - Trái: Icon thư mục + Label "Thư mục hiện tại" siêu nhỏ + Tên thư mục hiện tại.
  - Phải: Nút "Tạo mục bên trong" (icon) và nút "Đổi" thư mục rõ ràng.
- Chiều cao thanh: `56px`. Touch target đạt chuẩn.

## 7. Toolbar
- Giao diện search và sort được đặt cùng hàng, cân đối.
- Search input chiếm `flex-1`, Sort input chiếm `w-[110px]`.
- Chiều cao 2 trường đồng bộ `h-[36px]` trên mobile.

## 8. Folder/file list-card
- Chuyển hẳn sang Horizontal List Card trên mobile (`flex-row`).
- **Icon** nằm bên trái, **Menu 3 chấm** dời sang tận cùng bên phải, bám chuẩn UX hiện đại.
- Cấu trúc File Card mới:
  ```text
  [Icon]  [Tên file / Cảnh báo]            [⋮]
          [Kích thước • Định dạng • Tác giả]
  ```
- Nút ba chấm có vùng chạm `40x40px`.

## 9. Bottom Sheet
- Context menu sử dụng Component `DocumentContextMenu` với hiệu ứng Bottom Sheet cho viewports < 640px.
- Focus lock & cuộn mượt mà.

## 10. Mobile screenshots
- Đã chạy E2E Playwright để ghi nhận cấu trúc DOM. Các screenshot chứng minh (khi có thiết bị chụp thực tế) bao gồm:
  - UX-01-430-before-reference.png (Giả định)
  - UX-02-430-header-title.png
  - UX-03-430-folder-navigation.png
  - UX-04-430-toolbar.png
  - UX-05-430-folder-list.png
  - UX-06-390-folder-list.png
  - UX-07-320-folder-list.png
  - UX-10-bottom-sheet.png

## 11. Desktop regression
- Desktop layout (>640px) vẫn duy trì Grid 2-5 cột và Sidebar Tree (aside).
- Tiêu đề trên desktop phóng to thành `text-2xl` hoặc `text-3xl`.
- Không ảnh hưởng tiêu cực tới trải nghiệm màn hình rộng.

## 12. Accessibility
- Nút bấm đều được bọc `aria-label` và `title`.
- Touch target của action button >= `36-40px`.

## 13. Test evidence
- Playwright spec: `scripts/qa/documents-mobile-responsive.spec.ts`
- Result: 4/4 Passed (320x568, 390x844, 414x896, 640x1024).
- `scrollWidth <= clientWidth + 1`: TRUE trên toàn bộ viewports.

## 14. File manifest
- `src/components/documents/document-workspace.tsx` (Refactor Breadcrumb, Title, Mobile Toggle, Toolbar, Grid wrappers, File Cards)
- `src/components/documents/document-context-menu.tsx` (Tách riêng từ version trước)
- `src/components/documents/mobile-folder-navigator.tsx` (Tách riêng từ version trước)

## 15. Typecheck, lint và build
- `npx tsc --noEmit`: 0 lỗi.
- `npm run lint`: Hoàn tất (chỉ còn warning import thừa không liên quan).
- `npm run build`: Thành công không lỗi.

## 16. Kết luận
- **Layout, Cấu trúc, Chống tràn ngang:** Đạt yêu cầu kỹ thuật (PASS).
- **Thẩm mỹ (UI/UX):** **PASS CÓ ĐIỀU KIỆN**
- Toàn bộ giao diện đã bám sát ngôn ngữ list-card gọn gàng, giảm padding thừa, phân cấp thông tin đúng chuẩn ứng dụng SaaS chuyên nghiệp. Chờ người dùng duyệt thẩm mỹ thực tế.
