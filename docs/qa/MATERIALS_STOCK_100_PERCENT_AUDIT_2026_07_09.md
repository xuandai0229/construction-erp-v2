# Phân Tích Thực Trạng Tab Tồn Kho (Stock) - 2026-07-09

## 1. Dữ Liệu & Field Hiện Có Của Tab Tồn Kho
- `ProjectStockDto`:
  - `id`: Mã tồn kho.
  - `stock`: Số lượng tồn hiện tại.
  - `minStockLevel`: Số lượng tồn kho tối thiểu.
  - `lastUpdated`: Ngày cập nhật gần nhất.
  - `materialItem`: Object chứa thông tin vật tư (`code`, `name`, `unit`, `group`, `isActive`).
- Bảng hiện tại hiển thị: Mã VT, Tên vật tư, Nhóm, Tồn kho, Tồn tối thiểu, Trạng thái (StockStatusBadge), Cập nhật (DateCell).
- Hành động: Nhập, Xuất.

## 2. Khả Năng Mở Rộng (Detail Drawer, Transactions, Requests)
- **Detail Drawer:** Tab tồn kho hiện chưa có hàm mở Drawer. Tuy nhiên, có thể tái sử dụng `MaterialDetailDrawer` đã làm ở tab Danh Mục, hoặc tạo mới `StockDetailDrawer` nếu cần cấu trúc hiển thị khác biệt (chú trọng vào Health/Progress bar của tồn kho). Dựa trên yêu cầu, tạo file `stock-detail-drawer.tsx` là hợp lý.
- **Transactions:** Component `MaterialsWorkspace` có truyền `initialTransactions` xuống các tab khác. Có thể truyền thêm `transactions={initialTransactions}` xuống `MaterialsStockTable` để sử dụng ở Detail Drawer.
- **Requests:** Tương tự, `MaterialsWorkspace` có `materialRequests`, có thể truyền xuống `MaterialsStockTable` (là mảng `initialRequests`) để hiển thị ở Drawer.

## 3. Filter & URL Hiện Tại
- `stockStatus` filter có 5 tuỳ chọn: Tất cả, Đủ hàng, Sắp hết, Hết hàng, Âm kho. Đã có đồng bộ URL param thông qua `useSearchParams` (`?stockStatus=...`).
- `search` filter: Lọc theo mã, tên, nhóm. Cũng đã có trên URL `?search=...`.
- Tuy nhiên, Filter đang là thẻ button tĩnh, không có count.

## 4. Những Gì Làm Được Ngay Bằng Dữ Liệu Hiện Có
- **Stock Control Center:** Có thể đếm số lượng vật tư ở từng nhóm trạng thái trực tiếp từ mảng `stocks` để hiển thị trên top cards/chips.
- **Filter Có Count:** Có thể tính toán số lượng từng trạng thái và gắn vào UI của filter chips.
- **Tính Stock Health:** Tạo helper `getStockHealth` tính toán "Dư/Thiếu" bằng cách lấy `stock - minStockLevel`, và "Tỷ lệ" `(stock / minStockLevel) * 100`.
- **Detail Drawer:** Truyền `initialTransactions` và `materialRequests` vào component và gọi Drawer. Drawer có đầy đủ Tồn, Tối thiểu, Dư/Thiếu, Lịch sử, Phiếu yêu cầu.
- **Empty States:** Trả về Component với Text và CTA tùy thuộc vào `urlStatus`.
- **Mobile/Tablet:** Chỉnh sửa Card View của mobile, thêm Progress bar hoặc rút gọn thông tin hợp lý. Đảm bảo UI density tốt.

## 5. Những Gì Cần API/Schema Phase Sau
- Pagination API: Hiện dữ liệu filter đang là client-side (`stocks.filter`). Nếu số vật tư > 5000, sẽ cần API phân trang và filter backend.
- Vị trí kho (Warehouse location): Chưa có trong schema.
- Giá trị tồn kho (Inventory Valuation): Chưa có `unitPrice` chính xác hoặc dữ liệu định giá trong `ProjectStockDto`, không thể hiển thị tổng giá trị. (Bỏ qua theo yêu cầu "không bịa").
