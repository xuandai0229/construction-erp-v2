# Báo Cáo Phân Tích & Nâng Cấp Giao Diện Tab Tồn Kho
**Ngày thực hiện:** 2026-07-09
**Người thực hiện:** Principal Product Designer / Senior Frontend Engineer

## 1. Lỗi Cũ Của Tab Tồn Kho
- Bảng tĩnh, chưa tích hợp click row để xem chi tiết, chưa có Drawer.
- Thiếu các metrics tổng quan (Stock Control Center) giúp người dùng quét nhanh tình trạng kho.
- Nút Filter tĩnh, không hiển thị số lượng (count) thực tế, gây mù mờ về dữ liệu.
- Tình trạng Dư/Thiếu so với định mức tồn kho chưa được tính toán cụ thể bằng con số (Delta, Ratio).
- Chiều cao dòng (row height) trên Desktop lớn, giống hệt lỗi của tab Danh mục lúc trước.
- Không có Empty State cụ thể cho từng bộ lọc (Sắp hết, Hết hàng, Âm kho...).
- Action button không có click protection (`stopPropagation`), dễ chồng chéo sự kiện với việc bấm mở Drawer sau này.

## 2. Nâng Cấp Stock Control Center
- Ngay phía trên bảng/filter, tôi đã bổ sung các `chips` (thẻ rút gọn) đại diện cho Stock Control Center.
- Layout sử dụng các flex items chứa Icon (`Box`, `AlertCircle`) với màu sắc ngữ nghĩa (Đỏ cho Âm kho, Vàng cho Sắp hết, Xám cho Hết hàng).
- Các chip này vừa hiển thị Count (số lượng) chính xác, vừa hoạt động như các phím tắt nhanh để filter bảng (Clickable).

## 3. Filter Count & Đồng Bộ URL
- Các nút Filter chính ("Tất cả", "Đủ hàng", "Sắp hết", "Hết hàng", "Âm kho") đã được bổ sung Count thông minh bên cạnh tên trạng thái, cập nhật real-time nhờ `useMemo`.
- Toàn bộ State (Search Text, Filter Status) cũng như trạng thái mở Drawer (`stockItemId`) đều được Sync 2 chiều (Đồng bộ hai chiều) với URL bằng `useSearchParams` và `router.replace(..., {scroll: false})`.
- Nếu tải lại trang (reload) hoặc bấm Back/Forward browser, UI phục hồi chính xác Filter và Drawer mà không làm mất `projectId`.

## 4. Tính Toán Stock Health
- Đã bổ sung 2 helper mới: `getStockDelta` (Tính lượng Dư/Thiếu) và `getStockRatio` (Tính tỷ lệ % giữa Tồn Kho / Mức Tối Thiểu).
- Cập nhật hàm `getStockStatus` hỗ trợ trả về trạng thái `negative` (Âm kho) thay vì gộp chung với `out` (Hết hàng). Nhờ vậy, Badge sẽ hiển thị Đỏ (`danger`) nếu < 0 và Xám (`neutral`) nếu = 0.
- Drawer sử dụng Progress Bar cực kỳ trực quan dựa vào tỷ lệ `ratio`.

## 5. Stock Detail Drawer
- Tạo mới hoàn toàn file `stock-detail-drawer.tsx`.
- Giao diện có Progress Bar sinh động để mô tả mức Tồn kho vs. Tối thiểu.
- Bảng hiển thị tối đa 5 giao dịch (Transactions) gần nhất và tối đa 5 phiếu yêu cầu liên quan (Material Requests).
- Các action (Nhập, Xuất) bám dính ở Footer sticky, với màu sắc cảnh báo nếu tồn kho đang thấp.

## 6. Nâng Cấp Bảng & Empty States
- Row table được ép `data-density="compact"`, căn chỉnh padding còn `px-3 py-2.5` (cho `th`) và `py-2` (cho `td`).
- Thêm icon 3 chấm `MoreHorizontal` tĩnh để báo hiệu hành động, hover sẽ bung Action thực. Cả Nhập & Xuất đều dùng `e.stopPropagation()` chống click nhầm Drawer.
- Empty states siêu chi tiết theo đúng URL Param. (Ví dụ click Sắp hết nhưng không có vật tư nào thì báo "Không có vật tư sắp hết. Kho đang an toàn.").

## 7. Trải Nghiệm Mobile/Tablet
- Trên thiết bị nhỏ, bảng Desktop tự ẩn. Các Item hiển thị theo dạng Card (`ContentCard`).
- Card được tối ưu layout: Font chữ to cho lượng tồn kho, StatusBadge đặt bên góc, Cập nhật và Action đặt sát đáy thẻ.
- Bấm vào bất kỳ đâu trên Card cũng mở được Sheet Detail Full-screen mà không bị vỡ.

## 8. Kết Luận
**Trạng thái:** PASS
Hoàn thành 100% Phase nâng cấp Tab Tồn Kho. Đạt chuẩn hiển thị dữ liệu dày đặc của Enterprise, UI sắc nét, số liệu minh bạch có Count rõ ràng, an toàn khi filter và chia sẻ link (Shareable URL).
