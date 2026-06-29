# Báo Cáo Cân Chỉnh Dashboard Đơn Giản & Cao Cấp (Simple Premium Polish)

## 1. Yêu Cầu Cân Chỉnh
Mục tiêu là tinh chỉnh Dashboard để giao diện trở nên hoàn hảo, tăng giá trị sử dụng thực cho quản lý công trình/khối lượng hiện trường, đồng thời bảo đảm hệ thống tuân thủ nghiêm ngặt rule "100% dữ liệu thật".

## 2. Các Thay Đổi Chính Đã Thực Hiện

### 2.1. Footer Sidebar (`src/components/layout/sidebar.tsx`)
- **Bỏ nút "Thu gọn" giả mạo**: Vì tính năng collapse sidebar chưa được ưu tiên phát triển, việc giữ lại nút này có thể gây hiểu nhầm về tính năng.
- **Bổ sung thẻ Company Identity**: Thay thế vào đó là một khối nhận diện nội bộ (Company Card) sang trọng:
  - Background `slate-50` kết hợp bo tròn `rounded-2xl`.
  - Icon logo CT2 thu nhỏ bên trái.
  - Text chính: "CT2 Hà Nội" (đậm). Text phụ: "Nội bộ công ty".

### 2.2. Trạng Thái Cảnh Báo Sống Động (`src/app/(dashboard)/dashboard/page.tsx`)
- **KPI Cảnh báo**: Đã cập nhật tính năng biến đổi giao diện theo số liệu thời gian thực.
  - Khi `totalWarnings > 0`: Sử dụng viền cam, chữ cam, nền cam nhạt và icon `Bell` cam nhạt kèm text "Cần kiểm tra".
  - Khi `totalWarnings === 0`: Tự động fallback về màu xanh/neutral êm dịu, kèm dòng text helper "Không có cảnh báo". Không còn gây áp lực giả cho người quản trị.

### 2.3. Cải Tiến Chiều Cao Card (`src/app/(dashboard)/dashboard/page.tsx`)
- Đã set `items-start` cho thẻ `grid` cha.
- Thay đổi cả 2 thẻ con thành `h-fit`. Từ giờ các khối card này sẽ tự co gọn đúng theo lượng dữ liệu bên trong.

### 2.4. Chuẩn hóa Timeline "Hoạt động gần đây"
- **Thời gian gọn gàng**: Đã bỏ hoàn toàn thông tin giờ/phút, chỉ giữ lại ngày tháng theo định dạng thuần túy `dd/MM/yyyy`.
- **Tính chính xác dữ liệu (100% Real Data)**: Không còn hiện tượng gọi sai tên hoạt động.
  - Nếu là dữ liệu từ `FieldProgressEntry`: Đổi tên hiển thị thành "Nhập khối lượng hiện trường".
  - Chuyển Badge "Tiến độ" thành "Khối lượng" hoặc trạng thái thật nếu status là DRAFT/SUBMITTED/APPROVED.
  - Tự động detect các status có sẵn từ DB: "Đã duyệt" (APPROVED), "Đã gửi" (SUBMITTED), "Nháp" (DRAFT).
  - Tương tự đối với `Document` ("Tải lên tài liệu") và `Contract` ("Cập nhật hợp đồng"). Đều mapping dữ liệu thật 100%.

### 2.5. Đổi KPI Theo Hướng Công Trường / Khối Lượng Hiện Trường
- **Loại bỏ KPI "Tài liệu" và "Hợp đồng"**: Hai KPI này đang hiển thị 0, không phản ánh đúng trọng tâm MVP hiện tại (nhập khối lượng hiện trường). Đã chuyển sang các KPI thực dụng hơn.
- **4 KPI mới**:
  1. **Công trình đang thi công**: Đếm project ACTIVE theo RBAC. Helper text: "X đang thi công, Y hoàn thành".
  2. **Cập nhật hôm nay**: Đếm `FieldProgressEntry` có `createdAt` trong ngày hôm nay (giờ Việt Nam UTC+7). Nếu > 0 hiện xanh lá kèm số bản ghi. Nếu = 0 hiện xám "Chưa có cập nhật".
  3. **Lượt nhập hôm nay**: Cùng dữ liệu entriesToday, hiển thị số bản ghi khối lượng đã nhập trong ngày. Không cộng quantity vì nhiều đơn vị khác nhau — chỉ đếm bản ghi an toàn.
  4. **Cần chú ý**: Thay thế cho KPI "Cảnh báo" cũ. Đếm công trình ACTIVE thiếu WBS HOẶC chưa có bản ghi nhập trong ngày hôm nay. Màu cam/xanh theo trạng thái.

### 2.6. Thêm Giá Trị Điều Hành Vào Card "Công Trình Cần Theo Dõi"
- **Trạng thái WBS**: Mỗi công trình hiển thị "WBS: Đã thiết lập" (xanh lá) hoặc "WBS: Chưa thiết lập" (cam). Dữ liệu lấy thật từ `fieldProgressTemplates` relation.
- **Trạng thái nhập hôm nay**: Hiển thị "Hôm nay: Đã nhập (N)" hoặc "Hôm nay: Chưa nhập" (cam). Dữ liệu thật từ `_count.fieldProgressEntries` với filter theo ngày Vietnam.
- **Ngày cập nhật gần nhất**: Hiển thị `updatedAt` của project dạng `dd/MM/yyyy`.
- **Thao tác nhanh**: Mỗi công trình có 3 link nhỏ gọn:
  - "Mở" → `/projects/[id]`
  - "Nhập hôm nay" (Nút xanh nổi bật) → `/projects/[id]/field-progress/daily`
  - "Tổng hợp" → `/projects/[id]/field-progress/summary`
- Thiết kế nhỏ gọn, sắp xếp cùng dòng với trạng thái, dễ bấm trên mobile.

### 2.7. Tối Ưu Empty State
- "Hoạt động gần đây" empty state gọn hơn: icon nhỏ + text + không chiếm chiều cao dư.
- Card "Công trình" empty state giữ nguyên cấu trúc thanh lịch trước đó.

## 3. Rủi Ro & Đánh Giá Kỹ Thuật
- Tất cả dữ liệu hiển thị, số liệu, trạng thái cảnh báo hay dòng thời gian đều là dữ liệu thật lấy từ Prisma ORM, không fake số liệu.
- **Kết quả Build & Validate**:
  - `npx prisma validate` → PASS.
  - `npx tsc --noEmit` → PASS.
  - `npm run build` → PASS.
- **Kết quả UI/Responsive**:
  - Desktop 1920×1080 → PASS.
  - Laptop 1366×768 → PASS.
  - Mobile 390×844 → PASS.
  - Mobile 430×932 → PASS.
  - Không có scroll ngang. Sidebar/footer không vỡ. KPI xếp 2 cột trên mobile. Card công trình xếp dọc đẹp. Link thao tác nhanh dễ bấm.

## 4. Khuyến Nghị Chuẩn Hóa Dữ Liệu Demo

> [!WARNING]
> Khi demo cho khách/sếp, cần chuẩn hóa dữ liệu test trong DB:
> - Đổi tên "Công Trình test" thành tên công trình thực tế có dấu đầy đủ.
> - Đổi "Du an Nguyen Trai" thành "Dự án Nguyễn Trãi" hoặc tên thật.
> - Đổi "Chủ đầu tư test1" thành tên chủ đầu tư thực tế.
> - Thao tác này chỉ cần sửa trực tiếp trong DB hoặc qua form Edit Project, không cần sửa code UI.

## 5. Kết Luận
Dashboard giữ phong cách đơn giản cao cấp, các KPI đã được chuẩn hóa đúng nghiệp vụ hiện trường, không gây hiểu nhầm khối lượng/cảnh báo, dùng dữ liệu thật và sẵn sàng UAT.
