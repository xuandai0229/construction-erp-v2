# UI/UX STYLE GUIDE — CONSTRUCTION ERP

## 4.1. Page layout

- Page container: `max-width: 1600px`, căn giữa, full width.
- Desktop padding: 24px; laptop/tablet: 20–24px; mobile: 16px.
- Page section gap: 24px desktop, 20px mobile.
- Card padding: 20–24px desktop, 16px mobile.
- Surface chính: nền `slate-50`; card `white`; border `slate-200`.
- Shadow mặc định: rất nhẹ; ưu tiên border để giữ cảm giác enterprise.

## 4.2. Typography

- Page title: 24px, weight 700, `slate-950`, tracking nhẹ.
- Section title: 16–18px, weight 650–700, `slate-900`.
- Body: 14px, `slate-700`; nội dung phụ `slate-600`.
- Caption/helper: 12px, `slate-500`; không dùng text nhạt hơn cho nội dung quan trọng.
- Badge: 11–12px, weight 600, một dòng.
- Error: 13–14px, `rose-700` trên `rose-50`.

## 4.3. Buttons

- **Primary:** blue 600, chữ trắng, dùng cho action chính của màn hoặc modal.
- **Secondary:** nền trắng, border slate 300, chữ slate 700.
- **Ghost:** không border, hover slate 100; dùng cho action phụ.
- **Danger:** rose 600; chỉ dùng trong bước xác nhận hoặc action nguy hiểm rõ nghĩa.
- **Icon button:** 36–40px, rounded 8px, có `title` và `aria-label`.
- Disabled giữ độ tương phản đọc được; loading giữ nguyên width nếu có thể.
- Không đặt danger sát primary nếu người dùng có thể bấm nhầm; dùng khoảng cách hoặc nhóm riêng.

## 4.4. Badges

| Trạng thái | Variant |
| --- | --- |
| Nháp | neutral |
| Chờ duyệt / Đã gửi | warning |
| Đã duyệt | success |
| Từ chối | danger |
| Phát sinh | warning |
| File lỗi | danger |
| Hoạt động | success |
| Khóa | danger |

Badge phải dùng `StatusBadge`, không hardcode span màu rải rác nếu trạng thái đã có trong bảng trên.

## 4.5. Table

- Header: `slate-50`, chữ 12px semibold, `slate-600/700`.
- Row: padding dọc 12–16px; text chính `slate-900`, phụ `slate-600`.
- Hover: `slate-50/80`, không đổi màu quá mạnh.
- Action column: căn phải, icon button cùng kích thước và thứ tự Xem → Sửa → In → Danger.
- Pagination: footer border-top, mô tả bên trái, controls bên phải; stack trên mobile.
- Dưới breakpoint phù hợp, chuyển sang card thay vì ép table tràn ngang.

## 4.6. Drawer/modal

- Overlay: `slate-950/45–60` và blur nhẹ.
- Header: nền trắng, border-bottom, title 18px, close icon 40px.
- Content: section rõ, label 14px semibold, input 40–44px.
- Footer: nền trắng hoặc slate-50 rất nhẹ, border-top, sticky khi content dài.
- Mobile: bottom sheet hoặc panel gần full-screen, max-height theo `dvh`, padding 16px.
- Danger action chỉ xuất hiện khi cần và phải qua confirm.

## Shared interaction contract

- Focus ring: blue 500, offset trắng, không được xóa.
- Touch target: tối thiểu 40px cho action chính; icon-only tối thiểu 36px.
- Empty state: icon nhẹ, title, description và CTA tùy ngữ cảnh.
- Error copy: tiếng Việt, nói rõ người dùng nên làm gì; không lộ stack trace.
- Loading: dùng text động từ rõ nghĩa như “Đang lưu…”, “Đang tải…”.
