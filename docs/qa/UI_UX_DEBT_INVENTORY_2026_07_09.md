# UI/UX DEBT INVENTORY
**Date:** 2026-07-09

| File | Pattern | Rủi ro UI | Có sửa không | Component chuẩn thay thế |
|---|---|---|---|---|
| `dashboard/executive/executive-site-report-highlights.tsx` | `div.flex > span.line-clamp-1` | Text dài bị đè sang card khác do thiếu min-w-0 | Có | Thêm `min-w-0 flex-1` |
| `dashboard/executive/executive-action-list.tsx` | `id="action-items"` | Anchor link bị topbar sticky che mất (cắt top) | Có | Thêm `scroll-mt-24` |
| `dashboard/executive/executive-project-progress.tsx` | Thiếu `id="project-progress"` | Anchor từ Header không hoạt động và bị che | Có | Thêm id và `scroll-mt-24` |
| `dashboard/executive/executive-header.tsx` | Mobile view: Title dài bị badge đè, pill tràn phải | Mobile bị mất chữ, pill đâm ra ngoài padding | Có | CSS flex wrap / text-sm, bỏ absolute |
| `reports-mobile-cards.tsx` | `<div className="bg-white rounded-xl...">` | Dễ lệch chuẩn shadow/border | Có (từ phase trước) | `ContentCard` |
| `materials-transactions.tsx` | Code cũ bị mất map() | App crash hoặc rỗng data trên Mobile | Có | Khôi phục logic map |
| `settings-workspace.tsx` | `lg:grid-cols-[280px_minmax(0,1fr)]` | Click menu sidebar mobile không tự cuộn xuống form | Có | Thêm logic `scrollIntoView` và `scroll-mt-24` |
| `approval-center-client.tsx`| Giá trị tiền tệ quá dài | Tràn card hiển thị trên Desktop | Có | Thêm `min-w-0` và `truncate` vào SummaryCard |
| `accounting-workspace.tsx` | `sticky right-0` trên Table | Cột thao tác đè chữ bị trong suốt (transparent) trên Mobile | Có | Giới hạn chỉ sticky trên `md+` (desktop) |
| `reports-workspace.tsx` | `sticky top-0` cho Toolbar | Toolbar đè lên Header chính (h-16) trên Mobile | Có | Đổi thành `sticky top-16` |
