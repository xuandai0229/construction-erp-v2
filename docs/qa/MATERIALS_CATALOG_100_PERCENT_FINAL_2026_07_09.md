# Báo Cáo Phân Tích & Nâng Cấp Giao Diện Danh Mục Vật Tư
**Ngày thực hiện:** 2026-07-09
**Người thực hiện:** Principal Product Designer / Senior Frontend Engineer

## 1. Lỗi Cũ Của Tab Danh Mục
- Bảng danh mục trước đó quá tĩnh, chưa tích hợp được tương tác click mở detail.
- Dữ liệu tồn kho hiển thị dạng số thô không có format hàng nghìn (ví dụ: `17500 kg` thay vì `17.500 kg`), gây khó đọc khi dữ liệu lớn.
- Cột thao tác hiển thị 4 nút (Nhập, Xuất, Sửa, Xóa) ngang nhau, gây chật chội và dễ dẫn đến thao tác nhầm, nhất là nút "Xóa".
- Bộ lọc tĩnh chỉ hỗ trợ search và chọn nhóm (filter ở client), không đồng bộ lên URL, khi reload trang hoặc back/forward thì bị mất filter.
- Thiếu header metadata hiển thị số lượng mã/nhóm vật tư hiện có và số lượng sau khi lọc.

## 2. Nâng Cấp Format Số Lượng
- Đã nâng cấp component `QuantityCell` trong `enterprise.tsx`. Khi nhận giá trị là `number`, nó tự động xử lý qua hàm `formatQuantity` sử dụng chuẩn `Intl.NumberFormat('vi-VN')` với tối đa 2 số thập phân.
- Nhờ vậy, số lượng như `17500` sẽ được định dạng chuẩn thành `17.500`. Số âm sẽ có định dạng màu cảnh báo (amber-700) ngay trong `QuantityCell`.
- Áp dụng trên toàn bộ bảng Desktop cũng như Card view trên Mobile.

## 3. Detail Drawer Vật Tư
- Đã xây dựng mới component `MaterialDetailDrawer`.
- Drawer chứa đầy đủ thông tin:
  - Header: Tên vật tư (line-clamp), Mã vật tư, Nhóm.
  - Tổng quan tồn kho: Số lượng tồn kho hiện tại (font lớn), mức tồn kho tối thiểu, cảnh báo thiếu vật tư/âm kho hiển thị rõ ràng.
  - Thông tin bổ sung: Ghi chú, Đơn vị, Nhóm.
  - Giao dịch gần đây: Truyền xuống 5 giao dịch nhập/xuất gần nhất liên quan tới mã vật tư này.
  - Action footer: Sửa, Xóa, Nhập kho, Xuất kho được bố trí ở cuối, luôn sticky. Nút xóa đổi màu nguy hiểm (Rose).

## 4. Gọn & An Toàn Hóa Action Column
- Các action trên table Desktop (Nhập, Xuất, Sửa, Xóa) hiện nay được ẩn đi và chỉ xuất hiện khi hover vào dòng (`group-hover:opacity-100`), giúp UI bảng trở nên cực kỳ sạch sẽ và thoáng đãng.
- Thêm dấu divider dọc (`|`) giữa nhóm action nghiệp vụ (Nhập/Xuất) và nhóm action quản lý (Sửa/Xóa).
- Hành động "Xóa" đã có `window.confirm` cảnh báo xác nhận trước khi thực hiện, tránh thao tác xóa nhầm nguy hiểm.

## 5. Bộ Lọc Nâng Cao Đồng Bộ
- Bổ sung filter theo trạng thái tồn kho (`stockStatus`): Mọi trạng thái, Đủ hàng, Sắp hết, Hết hàng, Âm kho.
- Các giá trị filter (`q`, `group`, `stockStatus`, `materialId` của Drawer) đều được đồng bộ hai chiều với URL params thông qua `useSearchParams` và `router.replace`.
- Empty state: Có thông báo rõ ràng "Đang lọc kết quả" và nút "Xóa lọc" ở Header Metadata khi có bất kỳ filter nào được kích hoạt.

## 6. Xử Lý Mobile / Tablet
- Bảng Desktop bị ẩn ở màn hình hẹp (`md:hidden` / `hidden md:block`). 
- Màn hình nhỏ sử dụng `ContentCard` để render từng vật tư.
- Toàn bộ card có thể bấm được để bung Detail Drawer toàn màn hình (Sheet), giúp thao tác quản lý trên điện thoại dễ dàng như một ứng dụng native.

## 7. QA / Testing / Rủi Ro
- `npx tsc --noEmit` hoàn tất `0 errors`.
- `npm run build` chạy thành công không có lỗi trong module vật tư.
- Browser QA được thực hiện tốt với các màn 1440, 1024, 390. UI không vỡ, text dài không tràn, URL params hoạt động đúng nguyên lý SPA không làm reload trang.
- Không có thay đổi schema nào, sử dụng hoàn toàn data structure hiện hành.
- **Rủi ro còn lại:** Hiện tại filter và search đang xử lý ở Client-Side (`filtered` array). Nếu số lượng vật tư vượt quá vài nghìn mã (ví dụ >10,000), có thể gây nghẽn ở trình duyệt. Cần có lộ trình chuyển filter xuống API/Server-Side Pagination trong các Phase lớn tiếp theo.

## 8. Kết Luận
**Trạng Thái:** PASS (Đạt Chuẩn 100%)
