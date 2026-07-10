# Báo cáo Phân tích UI/UX Phân hệ Vật Tư (Phase 0)

## 1. Tab Tổng quan (Overview)
- **Lỗi UI/UX:**
  - Header quá lớn, chứa nhiều khoảng trắng thừa, đẩy nội dung quan trọng xuống dưới.
  - Khi cuộn, context của phân hệ (đang ở tab nào, công trình nào) bị mất.
  - Card "Cảnh báo tồn kho" chiếm diện tích lớn nhưng lại trống rỗng (empty state chưa được tối ưu).
- **Lỗi nghiệp vụ/Thiếu sót:**
  - KPI chỉ ở mức cơ bản (Số mã vật tư, số có tồn kho, cần bổ sung, giao dịch). Thiếu các chỉ số quản trị quan trọng như: Tổng giá trị tồn kho ước tính, Tồn kho dưới mức tối thiểu, Phiếu chờ duyệt, Vật tư âm kho.
  - Giao dịch gần đây chỉ liệt kê tên, thiếu thông tin truy vết: người thực hiện, mã phiếu chứng từ, tồn sau giao dịch.
- **Mức độ ưu tiên:** Cao
- **File liên quan:** `materials-overview.tsx`
- **Sửa trong phase này:** Có.

## 2. Tab Danh mục vật tư (Catalog)
- **Lỗi UI/UX:**
  - Thanh search/filter còn yếu, chưa có các bộ lọc nâng cao như nhóm vật tư, trạng thái, nhà cung cấp. Search input có nguy cơ bị tràn trên màn hình nhỏ.
  - Các nút hành động trên mỗi dòng (Nhập, Xuất, Sửa, Xóa) quá nhiều, dễ gây rối mắt và thao tác nhầm lẫn.
  - Tên vật tư dài không có cơ chế `truncate/line-clamp`.
- **Lỗi nghiệp vụ/Thiếu sót:**
  - Bảng chưa có sticky header, gây khó khăn khi xem danh sách dài.
  - Thiếu chức năng Import/Export Excel hàng loạt.
- **Mức độ ưu tiên:** Trung bình
- **File liên quan:** `materials-catalog.tsx`
- **Sửa trong phase này:** Có.

## 3. Tab Tồn kho (Stock)
- **Lỗi UI/UX:**
  - Giao diện dạng bảng nhưng chưa tận dụng màu sắc để biểu diễn mức độ tồn kho một cách trực quan (chưa có cảnh báo màu cho các trạng thái: đủ, sắp hết, hết, âm).
  - Tồn kho và tồn tối thiểu chưa được căn phải cho dễ so sánh.
- **Lỗi nghiệp vụ/Thiếu sót:**
  - Thiếu cột "Tồn khả dụng", "Đang chờ xuất", "Đã đặt mua".
  - Hành động Nhập/Xuất lặp lại quá nhiều trên bảng.
  - Thiếu bộ lọc theo trạng thái tồn (Đủ hàng, Sắp hết, Hết hàng).
- **Mức độ ưu tiên:** Cao
- **File liên quan:** `materials-stock-table.tsx`
- **Sửa trong phase này:** Có.

## 4. Tab Yêu cầu vật tư (Requests)
- **Lỗi UI/UX:**
  - Tên người tạo bị cắt (truncate) nhưng thiếu tooltip/title để xem chi tiết.
  - Thiếu detail drawer để xem nhanh thông tin phiếu mà không phải chuyển trang.
- **Lỗi nghiệp vụ/Thiếu sót:**
  - KPI chưa bao quát được toàn bộ quy trình (Đang xử lý, Chờ duyệt, Quá hạn).
  - Bảng thiếu các trường thông tin: Hạng mục, Đội thi công, Trạng thái cấp phát.
- **Mức độ ưu tiên:** Cao
- **File liên quan:** `purchase-request-placeholder.tsx` (Có thể cần tách/đổi tên thành `materials-requests.tsx`)
- **Sửa trong phase này:** Có.

## 5. Modal Thêm/Sửa vật tư
- **Lỗi UI/UX:**
  - Form thiết kế đơn giản, chưa chia section rõ ràng cho các nhóm thông tin (thông tin chung, đơn vị/tồn kho, thông tin bổ sung).
  - Thiếu nút "Lưu & thêm tiếp" để tăng tốc độ nhập liệu.
- **Lỗi nghiệp vụ/Thiếu sót:**
  - Thiếu các trường: Tồn tối thiểu, Quy đổi đơn vị, Nhà cung cấp.
  - Validate mã trùng lặp/chuẩn hóa dữ liệu chưa chặt chẽ.
- **Mức độ ưu tiên:** Trung bình
- **File liên quan:** `material-form-dialog.tsx`
- **Sửa trong phase này:** Có.

## 6. Modal Tạo đề xuất vật tư
- **Lỗi UI/UX:**
  - Giao diện nhập nhiều dòng vật tư chưa tối ưu cho màn hình nhỏ, dễ gây vỡ layout.
  - Footer không sticky, gây khó khăn khi form dài.
- **Lỗi nghiệp vụ/Thiếu sót:**
  - Dòng vật tư chưa hiển thị tồn hiện tại, tồn khả dụng.
  - Thiếu cảnh báo khi số lượng yêu cầu vượt mức tồn kho.
  - Chưa chia section rõ cho Hạng mục/Công trình/Khu vực.
- **Mức độ ưu tiên:** Cao
- **File liên quan:** Sẽ tạo mới hoặc cập nhật file tương ứng.
- **Sửa trong phase này:** Có.

## 7. Tab Nhập/Xuất (Transactions)
- **Lỗi UI/UX:**
  - Cột ghi chú dài bị cắt nhưng không có cách nào xem toàn bộ nội dung.
  - Số lượng nhập/xuất chưa được định dạng màu sắc (nhập xanh, xuất đỏ) và căn phải.
- **Lỗi nghiệp vụ/Thiếu sót:**
  - Thiếu khả năng click row để mở drawer xem chi tiết giao dịch (mã phiếu, chứng từ, tồn trước/sau).
  - Cần bộ lọc chi tiết hơn (loại, vật tư, ngày, người thực hiện).
- **Mức độ ưu tiên:** Cao
- **File liên quan:** `materials-transactions.tsx`
- **Sửa trong phase này:** Có.
