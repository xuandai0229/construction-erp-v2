# Materials Catalog - 100% Audit
**Date:** 2026-07-09

## 1. Phân tích trạng thái bảng hiện tại
- **Các trường hiện có trong bảng:** Mã VT, Tên vật tư, Đơn vị, Nhóm, Tồn kho, Thao tác.
- **Có đủ dữ liệu làm detail drawer không?**
  - Có: `MaterialItemDto` có id, code, name, unit, group, description, isActive.
  - Tồn kho: `ProjectStockDto` có stock, minStockLevel, lastUpdated.
  - Giao dịch gần đây: Phải fetch từ API hoặc lấy từ `transactions` truyền xuống từ `materials-workspace.tsx`. Hiện tại workspace truyền `initialTransactions`, có thể lọc theo `materialId` để lấy 5 giao dịch gần nhất.
- **Lịch sử nhập/xuất theo vật tư:** 
  - Có thể sử dụng `transactions.filter(t => t.materialItemId === materialId)` ở client hoặc load từ Server. Do `materials-workspace.tsx` đã truyền `transactions` vào Overview và Transactions tab, ta có thể dùng luôn danh sách `transactions` đó. (Cần pass `transactions` vào `MaterialsCatalog`).
- **Filter hiện tại hỗ trợ:**
  - Search theo tên, mã, nhóm.
  - Select nhóm (Tất cả, từng nhóm, chưa phân loại).
- **URL Query quản lý tab/search/filter ra sao:**
  - Hiện tại `materials-catalog.tsx` chỉ dùng state cục bộ (`search`, `selectedGroup`), chưa sync lên URL query. Cần dùng `useSearchParams` để lấy `q`, `group`, `stockStatus`, `unit` như ở `materials-stock-table.tsx`.
- **Những gì sửa được ngay:**
  - Định dạng số lượng (format quantity) cho mobile card. (Table đã dùng QuantityCell nên có thể đang thiếu format bên trong QuantityCell hoặc format ở mobile card). 
  - Đưa filter lên URL.
  - Click row mở drawer (tạo component `MaterialDetailDrawer`).
  - Gọn action column (Menu dropdown).
  - Header metadata nhỏ (tổng quan filter/metadata).
  - Mobile card view update.

## 2. Các hành động tiếp theo
- Kiểm tra lại `QuantityCell` trong `enterprise.tsx` xem đã gọi `formatQuantity` chưa.
- Cập nhật `materials-catalog.tsx` để thêm Drawer, sync URL params, refactor Actions, thêm Metadata header.
- Tạo component `MaterialDetailDrawer`.
