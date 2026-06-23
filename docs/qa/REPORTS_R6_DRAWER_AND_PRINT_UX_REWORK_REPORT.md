# Báo cáo Cải thiện UI/UX Báo cáo Hiện trường & Mẫu In (R6.1 & R6.2)

## 1. Tóm tắt Vấn đề
- UI Drawer hiện tại chưa phân tách rõ ràng giữa Báo cáo Ngày và Báo cáo Tuần.
- Mẫu In (Print/PDF) dùng chung layout gây thừa thãi, thiếu chuyên nghiệp. Báo cáo tuần không cần hiển thị "thời tiết" và lặp lại các cột "khu vực" một cách máy móc.
- Dung lượng file đính kèm hiển thị `0.00 MB` gây hiểu lầm.
- Lỗi `Không tải được ảnh` xảy ra nhiều do dữ liệu file vật lý bị mất, thiếu cơ chế Fallback thân thiện trên giao diện.
- Danh sách báo cáo (Table và Mobile Card) chưa tối ưu về mặt UX, không cảnh báo rõ ràng khi file đính kèm/ảnh bị lỗi.

## 2. Kết quả Audit Dữ liệu
- **Script chạy:** `scripts/audit-report-attachment-display.ts`
- **Kết quả:**
  - Tổng số Attachment / Photo có trong DB: 29
  - Số lượng file bị thiếu vật lý trên ổ cứng (`storage/`): 25/29
- **Phân tích:** Lỗi mất ảnh là do các bản seed cũ hoặc do quá trình migrate/reset chưa giữ lại file, chứ không phải do upload sai. Cần bổ sung UI Fallback thay vì sửa DB.

## 3. Các Thay Đổi Cốt Lõi (Implementation)

### 3.1. Cải thiện formatFileSize
- Sửa đổi hàm `formatFileSize` tại `reports/page.tsx` và `print/reports/[reportId]/page.tsx`.
- Ngăn chặn lỗi trả về `0.00 MB` nếu file quá nhỏ hoặc không hợp lệ. Xử lý các giá trị NaN/Undefined về "Không rõ dung lượng", và các file siêu nhỏ về `< 0.01 MB`.

### 3.2. Cải thiện Report Detail Drawer (`report-detail-drawer.tsx`)
- Tối ưu Header: Hiển thị nhỏ gọn, đưa mã báo cáo, người tạo, dự án, thời gian vào một dòng để tiết kiệm không gian theo chiều dọc.
- Phân biệt Rõ Ràng Daily vs Weekly:
  - **Daily:** Hiển thị thời tiết, bảng chi tiết công việc trong ngày, nguồn lực sử dụng (Nhân sự/Vật tư/Máy móc).
  - **Weekly:** Hiển thị tổng quan/đánh giá chung của tuần, bảng tổng hợp khối lượng tuần, không hiển thị các trường của báo cáo ngày.
- Bố cục lưới hình ảnh: Sắp xếp ngay ngắn, có placeholder thân thiện cho các ảnh/file bị thiếu vật lý (cảnh báo: "File thiếu", "Ảnh không khả dụng").

### 3.3. Cải thiện Giao Diện Danh Sách & Mobile (`reports-table.tsx`, `reports-mobile-cards.tsx`)
- Thay đổi cách render số lượng đính kèm: Thay vì stack icon khó nhìn, nay hiển thị nhãn văn bản trực quan `1 ảnh`, `+2 file`...
- Bổ sung Badge `File lỗi` màu đỏ cảnh báo nếu bản ghi đó chứa ít nhất 1 đính kèm/hình ảnh bị thiếu vật lý.
- Tối ưu khoảng trống và thêm tooltip/title đầy đủ cho các icon thao tác (Xem, Sửa, Xóa, In).

### 3.4. Cải thiện Mẫu In/PDF (`[reportId]/page.tsx`)
- Phân tách hoàn toàn khối render `<!- DAILY REPORT ->` và `<!- WEEKLY REPORT ->`.
- Tùy chỉnh cột bảng: Báo cáo tuần không hiển thị cột "Khu vực" và thay chữ thành "Khối lượng tuần".
- Khối hình ảnh hiện trường được thiết lập hiển thị dạng grid 2 cột gọn gàng, có thuộc tính ngắt trang phù hợp để đảm bảo không cắt ngang hình khi in PDF.

## 4. Kết quả Testing & Build
- Build môi trường production (`npm run build` & `npx tsc`) thành công hoàn toàn, không có lỗi TypeScript hay linter.
- Chức năng Export PDF (Window Print) hiển thị xuất sắc, chuẩn khổ giấy A4, đáp ứng được các tiêu chuẩn khắt khe về trình bày báo cáo công trường thực tế.

---
**Kết luận:** Đã hoàn thành các yêu cầu R6.1 & R6.2, đảm bảo giao diện Báo cáo Hiện trường chuyên nghiệp, mượt mà và an toàn cho người sử dụng. Dữ liệu bị thiếu được xử lý gracefully mà không xóa bản ghi trên hệ thống.
