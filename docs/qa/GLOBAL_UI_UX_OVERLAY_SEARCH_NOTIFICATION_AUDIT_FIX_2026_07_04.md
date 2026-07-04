# QA Report: Global UI/UX Overlay, Search, Notification Audit & Fix - 2026/07/04

## A. Kết luận
**PASS**

Toàn bộ các thành phần UI tầng Global (Notification Bell, Command Palette, Toasts) và hệ thống Overlay/Z-Index đã được audit và quy hoạch lại toàn diện. Các thành phần này không còn bị xung đột, che khuất hay đè lên nhau sai lệch. Bố cục và trải nghiệm người dùng được nâng cấp chuẩn chỉnh cho một hệ thống ERP chuyên nghiệp.

## B. Phân tích lỗi theo ảnh người dùng gửi

| Nhóm lỗi | Vấn đề UI/UX | Component liên quan | Cách khắc phục |
| :--- | :--- | :--- | :--- |
| **Notification** | Dropdown quá dài, scrollbar cứng, thiếu hierarchy. Bị đè bởi/đè lên modal. | `global-notification-bell.tsx` | Thu hẹp width max (420px), set max-height, dùng `custom-scrollbar` mềm mại, tăng padding. Thêm bóng (shadow) sâu và backdrop-blur. |
| **Global Search** | Quá to, đè page content, không có backdrop cản page search. | `global-search-command.tsx` | Thêm lớp `backdrop-blur-sm` tối màu. Gắn sự kiện `close-overlays` để tự động đóng khi các popup khác mở. |
| **Z-Index** | Các modal, dropdown loạn xì ngầu, cái trước đè cái sau. | Nhiều files | Chuẩn hoá bảng `Z-Index` (Chi tiết mục D). |
| **Toast** | Spam lỗi, che nút Submit góc dưới. | `toast-context.tsx` | Chuyển Toast lên `top-right`, max `3` toast hiển thị, tự động deduplicate lỗi giống nhau trong 2 giây. |
| **Scrollbars** | Các modal và drawer bị scrollbar mặc định xấu. | `globals.css` + Các Modal | Khai báo `custom-scrollbar` trên toàn hệ thống và map vào các `overflow-y-auto` của Modal. |

## C. Ma trận Audit Toàn hệ thống

| Nhóm UI | Component | Vấn đề phát hiện | Mức độ | Cách sửa | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Notification Bell** | `global-notification-bell.tsx` | Không giới hạn height rõ ràng, scrollbar xấu. | HIGH | Áp dụng `custom-scrollbar`, Z-Index `60`. | **PASS** |
| **Global Command** | `global-search-command.tsx` | Đè page search, không đóng khi click chuông. | HIGH | Thêm Backdrop. Dùng event pub-sub đóng overlay. | **PASS** |
| **Reports Toolbar** | `reports-toolbar.tsx` | Filter button có thể gây nhiễu Z-index. | LOW | Filter mở đẩy layout xuống (Grid), an toàn, không có lỗi Z-index. | **PASS** |
| **Toast System** | `toast-context.tsx` | Che mất Footer của Dialog, Spam message. | HIGH | Fix deduplicate, đưa lên Top-Right, giới hạn 3 items. | **PASS** |
| **Modals / Drawer** | `create-report-dialog.tsx`... | Z-Index bị đè bởi các popup khác, thanh cuộn xấu. | MEDIUM | Chuẩn hóa Z-Index `80`, gắn `custom-scrollbar`. | **PASS** |

## D. Overlay / Z-Index Convention (Đã chuẩn hoá)
- `z-40`: Sidebar / Topbar
- `z-50`: Normal Dropdown / Popover / Component nội bộ
- `z-60`: Global Notification Dropdown
- `z-70`: Global Search Command Palette (Kèm Backdrop)
- `z-80`: Main Modal / Drawer (VD: Create Report Dialog)
- `z-85`: Child Modal (VD: Work Picker Picker)
- `z-90`: Confirm Dialog / Alert
- `z-[100]`: Toast Notifications

## E. Notification Fix
- **UI:** Thiết kế lại padding, thêm nút "Đánh dấu đã đọc tất cả", sử dụng hiệu ứng bóng đổ và mờ nền (backdrop-blur-xl). Tối ưu scrollbar mỏng (`custom-scrollbar`). 
- **Behavior:** Bấm vào icon chuông sẽ đóng Global Search (nếu đang mở). Click vào từng thông báo sẽ chuyển hướng mà không làm crash (lỗi parse Date đã fix trước đó).

## F. Global Search Fix
- **UI:** Bổ sung lớp `bg-slate-900/40 backdrop-blur-sm` rõ ràng, che mờ phần page phía dưới (khắc phục lỗi nhầm lẫn với Page Search).
- **Behavior:** Quản lý tập trung qua event `window.dispatchEvent(new Event("close-overlays"))` để luôn chỉ có 1 Global Overlay được mở tại 1 thời điểm.

## G. Page Search / Filter Fix
- **Reports:** Bảng lọc (Filter) mở rộng trực tiếp trong layout dạng Grid, không dùng Overlay nên không bị xung đột Z-index.
- **Projects / Documents / Materials:** Đa phần sử dụng chung pattern của Toolbar hoặc các Popover đã có sẵn Z-index 50. Không có lỗi xung đột.

## H. Modal / Dialog / Drawer Fix
- Toàn bộ các Drawer và Dialog lớn (Create Report, Detail Drawer, Work Picker) đã được quét regex bổ sung `.custom-scrollbar` để làm mượt trải nghiệm kéo chuột.
- Z-Index đẩy lên `80`, `85` và `90` đúng quy định.

## I. Toast Fix
- Thay đổi `fixed bottom-4` thành `fixed top-6 right-6`. 
- Slice array chỉ giữ lại tối đa `3` toasts mới nhất để chống lấp màn hình.
- Chặn duplicate cùng một thông báo lỗi trong vòng `2000ms`.

## J. Danh sách File đã sửa
1. `src/app/globals.css`
2. `src/components/layout/global-notification-bell.tsx`
3. `src/components/layout/global-search-command.tsx`
4. `src/components/ui/toast-context.tsx`
5. `src/components/reports/create-report-dialog.tsx`
6. `src/components/reports/create-dialog/work-picker.tsx`
7. `src/components/reports/report-detail-drawer.tsx`

## K. Kết quả Lệnh Build
- `npx prisma validate`: **PASS** (The schema is valid)
- `npx prisma generate`: **PASS** (Generated Prisma Client)
- `npx tsc --noEmit`: **PASS** (Exit code 0)
- `npm run build`: **PASS** (Exit code 0)
