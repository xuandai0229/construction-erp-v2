# Báo cáo Audit Regression UI Responsive & Mobile (Giai đoạn cuối)

## 1. Đánh giá từng ảnh UAT người dùng gửi
- **Ảnh project-detail mobile**: Nút "Xóa" bị rớt xuống dòng độc lập, layout nguy hiểm trên màn 430px. Đã chuyển toàn bộ cụm `Quay lại`, `Sửa`, `Xóa` thành cấu trúc Grid 2-row (Dòng 1 full-width cho "Quay lại", dòng 2 chia 50-50 cho "Sửa/Xóa"), đảm bảo tính cân đối và thân thiện touch target.
- **Ảnh 4 tab công trình mobile**: Gốc bị vỡ font, chữ ép xuống hàng (`Bảng khối lượng gốc`, `Nhập khối lượng`). Cấu trúc tab đã được thay thế thành Component dùng chung `ProjectModuleTabs`, hiển thị Grid 2x2 chuyên biệt cho mobile (viewport < 640px) và giữ thanh ngang nguyên bản trên desktop.

## 2. Danh sách file đã sửa
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/new/page.tsx`
- `src/components/projects/delete-project-button.tsx`
- `src/components/project/project-module-tabs.tsx`
- `src/components/field-progress/daily-entry-table.tsx`
- `src/lib/rbac.ts`
- Script kiểm thử UI/UX và RBAC trong thư mục `scripts/`

## 3. Cách sửa duplicate id
- Nguyên nhân: Các component dùng chung render song song Desktop table (`hidden md:table`) và Mobile card list (`md:hidden`) dẫn đến trùng mã HTML ID của field input.
- Khắc phục: Triển khai pattern hậu tố định danh `-desktop` và `-mobile`. Ví dụ, `id="daily-quantity-${item.id}-desktop"` và `id="daily-quantity-${item.id}-mobile"`. 

## 4. Cách sửa ProjectModuleTabs mobile
- Sửa đổi trực tiếp trong component dùng chung `ProjectModuleTabs`.
- Tách view thành 2 cấu trúc hiển thị khác nhau bằng Tailwind:
  - Mobile: `<div className="grid grid-cols-2 gap-2 sm:hidden w-full">`
  - Desktop: `<div className="hidden sm:flex border-b border-slate-200 overflow-x-auto hide-scrollbar">`
- Áp dụng logic match `exact: true` cho route gốc để xác định `active` chính xác mà không bị bắt nhầm prefix.

## 5. Cách sửa Project Detail mobile action buttons
- Trên màn hình detail, cấu trúc button được chia Grid:
```tsx
<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
  <Link className="w-full ...">Quay lại</Link>
  <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
    <Link className="w-full ...">Sửa</Link>
    <DeleteProjectButton className="w-full ..." />
  </div>
</div>
```
- Nút Xóa vẫn giữ popup Confirm đỏ rõ ràng, nút được chèn thêm prop `className` để scale full width khi nằm trong grid mobile.

## 6. Kết quả test RBAC direct URL
- Tài khoản: `commander1@construction.local` (CHIEF_COMMANDER).
- Kịch bản chạy giả lập Playwright:
  - Gõ trực tiếp `/projects/QA_RBAC_CT_002` (công trình không quản lý) -> Bị redirect từ chối truy cập.
  - Gõ trực tiếp `/users` -> Chặn thành công.
  - Gõ trực tiếp `/projects/new` -> Đã cập nhật Guard `requireManagementAccessOrRedirect` và test **Pass** chặn thành công.
  - Gõ URL sâu `/projects/[id_khac]/field-progress` và `material-requests` -> Test **Pass** bị chặn.

## 7. Kết quả screenshot mobile sau fix
Đã lưu trữ toàn bộ trong `docs/qa/screenshots/global-ui-responsive-audit/` (đã loại trừ Git):
- `project-detail-mobile-actions-fixed-430.png`
- `project-detail-mobile-modules-fixed-430.png`
- `master-mobile-tabs-fixed-430.png`
- `daily-mobile-tabs-fixed-430.png`
- `summary-mobile-tabs-fixed-430.png`
- `material-mobile-tabs-fixed-430.png`
- `commander-project-list-mobile-430.png`

## 8. Kết quả accessibility
Công cụ `AxeBuilder` đã chạy audit 6 routes trọng điểm trên cả mobile và desktop. Kết quả (log tại `docs/qa/GLOBAL_UI_RESPONSIVE_A11Y_AUDIT.txt`):
- KHÔNG CÒN lỗi: `Duplicate form field id in the same form`.
- KHÔNG CÒN lỗi: `A form field element should have an id or name attribute`.
- KHÔNG CÒN lỗi: `No label associated with a form field`.
- Tình trạng A11y DOM rất tốt và hoàn toàn đạt chuẩn cho vận hành UAT.

## 9. Kết quả build/test
- **Prisma Validate/Generate**: PASS
- **TypeScript (tsc --noEmit)**: PASS
- **Next.js Production Build (npm run build)**: PASS 
- Tất cả scripts regression (material requests, volume guards, RBAC test) đều chạy tốt không gặp crash.

## 10. Xác nhận Git
- **Không tự commit/push**: Đã tuân thủ 100%.
- **Không có file rác**: Thư mục `docs/qa/screenshots/` đã được ignore đúng quy định. Không có `.png`, `.jpg` hay `.webm` làm dơ repository. Khớp với check log từ `git status`.
