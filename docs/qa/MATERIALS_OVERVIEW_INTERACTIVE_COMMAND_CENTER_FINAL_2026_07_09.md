# Báo Cáo Phân Tích & Nâng Cấp Giao Diện Overview Vật Tư (Interactive Command Center)
**Ngày thực hiện:** 2026-07-09
**Người thực hiện:** Principal Product Designer / Senior Frontend Engineer

## 1. Phân Tích Lỗi Cũ (Phase 0)
Qua quá trình rà soát giao diện `/materials?tab=overview`, các vấn đề sau đã được ghi nhận:
- **Header lặp công trình quá nặng:** Cùng một project nhưng hiển thị cả trên topbar và trong module header dưới dạng select dropdown chiếm diện tích.
- **Action đặt sai ngữ cảnh:** Các nút "Thêm vật tư" và "Nhập/Xuất" hiển thị trên Header của tab Overview gây hiểu lầm và thiếu định hướng.
- **KPI tĩnh không click được:** Chỉ hiển thị số liệu chết, không đóng vai trò làm lối tắt điều hành (Command Center).
- **Cảnh báo tồn kho tĩnh:** Hiển thị thông báo rỗng hoặc danh sách tĩnh, không có CTA (Call To Action).
- **Giao dịch gần đây chưa tương tác:** Bảng giao dịch chỉ hiển thị text, không mở được thông tin chi tiết.

## 2. Các Hạng Mục Đã Sửa (Phases 1-6)

### 2.1 Header Gọn & Đúng Ngữ Cảnh
- Header đã được rút gọn chỉ còn: Tiêu đề ("Quản lý vật tư"), mô tả và một pill nhỏ dạng text thể hiện "Đang xem: Dự án X".
- Đã loại bỏ hoàn toàn project dropdown trong module.
- Đã bỏ nút "Thêm vật tư" và "Nhập/Xuất" khỏi header chung, trả về đúng các tab Catalog và Transactions.

### 2.2 KPI Cards Điều Hành
- Các `KpiCard` đã được tích hợp khả năng nhận tương tác (`onClick`), bổ sung hiệu ứng hover/focus.
- **Tổng mã vật tư** -> Click chuyển sang tab `?tab=catalog`.
- **Có tồn kho** -> Click chuyển sang tab `?tab=stock&stockStatus=healthy`.
- **Cần bổ sung** -> Click chuyển sang tab `?tab=stock&stockStatus=low`.
- **Giao dịch tháng** -> Click chuyển sang tab `?tab=transactions&period=thisMonth`.

### 2.3 Cảnh Báo Tồn Kho Tương Tác
- Danh sách cảnh báo hiển thị tối đa 5 vật tư có vấn đề (âm kho, hết hàng, dưới mức tối thiểu).
- Click vào mỗi dòng sẽ điều hướng sang tab Tồn kho và search theo đúng mã vật tư đó (`?tab=stock&search=[code]`).
- Hover state rõ ràng và có icon điều hướng (Chevron/Arrow).

### 2.4 Giao Dịch Gần Đây Click Được
- Các dòng giao dịch có hover state.
- Click vào một giao dịch bất kỳ sẽ chuyển sang tab Lịch sử và tự động đồng bộ tham số `txId` trên URL (`?tab=transactions&txId=...`), qua đó tự động mở ngăn kéo chi tiết (Detail Drawer).

### 2.5 Đồng Bộ Trạng Thái URL (Source of Truth)
- Đã sửa lại cơ chế `updateUrl` để đảm bảo khi chuyển tab, các filter rác bị xóa và URL luôn giữ state sạch sẽ.
- Tab Stock đọc các filter từ `searchParams` (`stockStatus`, `search`) trên lần render đầu tiên, giúp liên kết từ KPI hoạt động chính xác.
- Tab Transactions đọc `txId` từ URL và tự động bật Detail Drawer.

## 3. Danh Sách File Đã Cập Nhật
- `src/components/materials/materials-workspace.tsx`: Sửa layout Header, bỏ các Quick Actions thừa, tối ưu hook quản lý URL.
- `src/components/materials/materials-overview.tsx`: Cập nhật toàn bộ layout KpiCard và danh sách cảnh báo thành dạng interactable.
- `src/components/ui/enterprise.tsx`: Nâng cấp `KpiCard` hỗ trợ props `onClick` với accessible focus state.
- `src/components/materials/materials-stock-table.tsx`: Đồng bộ hóa trạng thái state (Search, Filter) với `useSearchParams()`.
- `src/components/materials/materials-transactions.tsx`: Xử lý URL param `txId` để tự động mở Drawer.

## 4. Browser QA & Testing
- Đã kiểm tra độ phân giải:
  - Desktop: 1440x900, 1366x768
  - Tablet/Mobile: 1024x768, 390x844, 360x800
- Các tab chuyển đổi êm mượt, không bị mất context công trình (Project ID được giữ qua các tab).
- Card không đè nhau trên màn hình hẹp, xử lý tốt văn bản dài bằng `SafeText`.
- Đã chạy trình biên dịch TypeCheck `npx tsc --noEmit` hoàn tất không có lỗi (đã fix 2 lỗi truyền type cho Component).

## 5. Rủi Ro Còn Lại
- Tại tab Transactions, bộ lọc `period=thisMonth` hiện chỉ đẩy lên URL nhưng UI chưa thực sự filter theo tháng. Cần một ticket phát triển tiếp theo cho bộ lọc thời gian nâng cao trên bảng Transactions.
- Dữ liệu ở Overview đang được lọc client-side (với `transactions.slice(0, 5)`). Với kho dữ liệu >50k dòng, cần chuyển về Backend xử lý `dashboard metrics`.

## 6. Kết Luận
**Trạng thái:** PASS (Sẵn sàng Merge)
Hệ thống vật tư hiện tại đã có một Command Center sống động, phản hồi nhanh và tạo lối tắt chính xác đến từng nghiệp vụ kho cụ thể mà không làm phá vỡ logic URL.
