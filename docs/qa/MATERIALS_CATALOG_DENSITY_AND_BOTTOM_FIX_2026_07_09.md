# Báo Cáo Khắc Phục Lỗi UI/UX Bảng Danh Mục Vật Tư
**Ngày thực hiện:** 2026-07-09
**Người thực hiện:** Principal Product Designer / Senior Frontend Engineer

## 1. Nguyên Nhân Row Quá Cao (Density Issue)
- **Vấn đề cũ:** Row trong Catalog sử dụng padding mặc định khá lớn (`py-3`, `px-4`), tên vật tư dài có thể bẻ dòng làm tăng chiều cao, và cột số lượng hiển thị unit ở dòng thứ 2 (dưới `MetricCell`) khiến chiều cao tối thiểu của mỗi dòng rất lớn.
- **Giải pháp:** Đã đưa `data-density="compact"` và chủ động giảm padding của thẻ `th`, `td` xuống còn `px-3 py-2.5` và `px-3 py-2`. Fix chiều cao row cứng `h-12`. Cắt ngắn tên vật tư bằng `line-clamp-1` để không bị rớt dòng.

## 2. Tồn Kho + Đơn Vị Hiển Thị Gọn
- **Vấn đề cũ:** `QuantityCell` dùng `block` khiến unit luôn bị đẩy xuống dòng tiếp theo.
- **Giải pháp:** Refactor `QuantityCell` sang dùng flexbox (`flex items-baseline justify-end gap-1.5 whitespace-nowrap`). Hiện tại số lượng (font-mono) và đơn vị (text-xs) đã nằm trên cùng một dòng ngang gọn gàng. Chiều cao dòng giảm rõ rệt.

## 3. Khắc Phục Đáy Bảng Bị Khuất
- **Vấn đề cũ:** Có 2 lý do khiến dòng cuối bị khuất: 
  - `EnterpriseTable` bị bọc trong class `max-h-[600px]` giới hạn chiều cao mà không có scroll độc lập tốt.
  - Page wrapper (`.app-page`) không có đủ `padding-bottom` dự phòng cho màn hình nhỏ có taskbar/navbar.
- **Giải pháp:** 
  - Đã xóa bỏ class `max-h-[600px]` ở Desktop table.
  - Thêm class `pb-24` vào `.app-page` trong component `materials-workspace.tsx` để luôn đảm bảo có không gian đệm cuối trang. Đáy bảng và các thao tác (nếu có) không còn bị kẹt sát đáy màn hình.

## 4. Trực Quan Hóa Cột Thao Tác (Action Column)
- **Vấn đề cũ:** Ẩn hoàn toàn nút thao tác khi không hover giúp UI sạch, nhưng người dùng mới có thể không biết có thể tương tác (tưởng bảng tĩnh).
- **Giải pháp:** Thêm icon `MoreHorizontal` (Dấu 3 chấm `...`) tĩnh và nhạt màu ở cột thao tác. Khi user không hover, họ vẫn thấy dấu 3 chấm để biết có hidden menu. Khi hover vào dòng, dấu 3 chấm ẩn đi (opacity-0) và nhường chỗ cho khối ActionGroup (Nhập/Xuất/Sửa/Xóa) hiện ra (opacity-100).
- Các action click được thiết lập `e.stopPropagation()` để không trigger nhầm hàm mở Detail Drawer của `handleRowClick`.

## 5. Danh Sách File Đã Cập Nhật
1. `src/components/materials/materials-catalog.tsx`: Chỉnh density bảng, action hint, cắt title material.
2. `src/components/ui/enterprise.tsx`: Tối ưu hóa UI của `QuantityCell`.
3. `src/components/materials/materials-workspace.tsx`: Thêm `pb-24` vào layout container chính.

## 6. QA / Testing
- Đã test lại trên các phân giải 1440, 1366, 1024, 390. Desktop hiển thị được nhiều item hơn trên viewport do row density đã giảm.
- Mobile scroll cuối mượt, không bị che bởi browser bar.
- Action column UX tốt, rõ ràng hơn.

## 7. Kết Luận
**Trạng thái:** PASS
Các phản hồi về chiều cao dòng và padding đáy đã được xử lý triệt để mà không làm hỏng tính thẩm mỹ chung của hệ thống.
