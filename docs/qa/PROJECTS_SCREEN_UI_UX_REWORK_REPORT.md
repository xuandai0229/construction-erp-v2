# Báo Cáo Rework UI/UX Màn Hình Công Trình

**Ngày thực hiện:** 19/06/2026
**Trạng thái:** Hoàn tất Rework UI/UX, Build PASS.

---

## 1. Mục Tiêu
Nâng cấp thẩm mỹ và trải nghiệm (UI/UX) cho phân hệ Quản lý Công trình (`/projects`), giải quyết các vấn đề tồn đọng từ bản nháp ban đầu, hướng tới giao diện Premium chuẩn SaaS ERP cho ngành xây dựng. Đồng thời, tuyệt đối không thay đổi schema, RBAC, hay logic nền tảng đang chạy tốt.

## 2. File Đã Cập Nhật
1. `src/components/projects/project-form.tsx` (Form Tạo / Sửa công trình)
2. `src/app/(dashboard)/projects/page.tsx` (Màn hình danh sách công trình)
3. `src/app/(dashboard)/projects/[id]/page.tsx` (Màn hình chi tiết công trình)
4. `src/app/(dashboard)/projects/loading.tsx` (Thêm mới)
5. `src/app/(dashboard)/projects/error.tsx` (Thêm mới)

---

## 3. Các Thay Đổi Chi Tiết

### 3.1. Màn Tạo / Sửa Công Trình (`project-form.tsx`)
- **Fix lỗi "Nền đen"**: Chuyển toàn bộ CSS input/select/textarea sang nền sáng (`bg-white`), text đen (`text-slate-900`) và placeholder rõ ràng (`placeholder:text-slate-400`). Xóa bỏ hoàn toàn cảm giác input bị disabled hay lỗi theme.
- **Bố cục 2 cột (Desktop)**: Giao diện form chính nằm bên trái, cột bên phải là thẻ thông tin nổi bật "Sau khi tạo công trình..." giúp màn hình không bị quá rộng và trống trải. Trên Mobile, các cột tự động dồn thành 1.
- **Gom nhóm trường dữ liệu**: Sử dụng các thẻ `h3` (`Thông tin cơ bản`, `Trạng thái & thời gian`, `Mô tả / Ghi chú`) kèm đường kẻ ngăn cách (`border-t`) để form trông gọn gàng, có trình tự khai báo.
- **Dấu sao (*) bắt buộc**: Đã hiển thị rõ ràng bên cạnh các trường quan trọng (Mã công trình, Tên công trình).

### 3.2. Màn Danh Sách Công Trình (`projects/page.tsx`)
- **Thẩm mỹ Bảng (Table Premium)**: Header chuyển sang màu xám cực nhạt (`bg-slate-50`), text `text-slate-700` thanh lịch. Các dòng table có hiệu ứng hover mượt mà (`hover:bg-slate-50/70`). Cột "Thời gian" được gom gọn và bổ sung ký hiệu "→" đẹp mắt.
- **Thao tác nhanh**: Thêm cụm nút tác vụ ở bên phải mỗi dòng. Các nút "Xem", "Sửa" có màu nhạt, trong khi "Nhập KL" (xanh ngọc) và "Tổng hợp" (tím) được làm nổi bật với icon. Trên desktop, chúng sẽ mờ đi đôi chút và hiện rõ 100% khi hover vào dòng (`group-hover`), giúp bảng không bị rối mắt.
- **Xóa bỏ chữ "Chưa cập nhật"**: Thay thế toàn bộ các ô rỗng bằng ký tự `—` gọn gàng.
- **Phân trang (Pagination)**: Đã bổ sung thành công cơ chế phân trang an toàn. Truy vấn Prisma đã thêm `take: 15` và `skip`. Giao diện phân trang dưới cùng báo rõ: "Hiển thị x đến y trong số z công trình".
- **Điều chỉnh Breakpoint**: Đổi từ `xl` (1280px) xuống `lg` (1024px). Máy tính laptop màn hình trung bình giờ đây sẽ thấy được giao diện Bảng, chỉ có điện thoại và tablet dọc mới hiển thị Card list.

### 3.3. Màn Chi Tiết Công Trình (`projects/[id]/page.tsx`)
- **Xóa bỏ chữ "Chưa cập nhật"**: Thay bằng ký tự `—` trên toàn bộ các trường thông tin cơ bản.
- **Bổ sung trạng thái nhanh (Real-time Status)**: Phía dưới Tên công trình, đã dùng lệnh `_count` của Prisma để hiển thị 2 thẻ trạng thái rất thực dụng:
  - **WBS**: Báo "Đã thiết lập" (chấm xanh lá) nếu có hạng mục, "Chưa thiết lập" (chấm cam) nếu chưa có.
  - **Hôm nay**: Báo "Đã nhập (n)" nếu có phiếu khối lượng trong ngày hiện tại (giờ Việt Nam), hoặc báo "Chưa nhập".
- Việc thêm `_count` vào truy vấn Prisma có sẵn chỉ tốn 1 câu lệnh join ảo, không hề gây áp lực lên DB.

### 3.4. Loading & Error States
- Bổ sung `loading.tsx`: Sử dụng Skeleton Loading với animation "pulse" cực kỳ chi tiết, mô phỏng đúng bố cục của bảng và các thẻ card. Khi người dùng load dữ liệu hoặc qua trang, sẽ không còn màn hình trắng chớp nhoáng.
- Bổ sung `error.tsx`: Màn hình báo lỗi tiếng Việt, có icon Alert và nút "Thử lại".

---

## 4. Bảo Toàn Logic (Không Can Thiệp)
1.  **RBAC**: Các logic `canManageProjects`, `getAccessibleProjectIds` được giữ nguyên. Truy vấn danh sách và chi tiết đều vẫn nằm trong khung quyền.
2.  **Audit Log**: Quá trình tạo / sửa / xóa (soft delete) không bị can thiệp.
3.  **Transaction**: Form tạo công trình vẫn gọi đúng server action `createProject` chứa transaction sinh 8 thư mục.

---

## 5. Kết Quả Kỹ Thuật
-   `npx prisma validate`: **PASS**
-   `npx tsc --noEmit`: **PASS**
-   `npm run build`: **PASS** (Zero Next.js errors/warnings)

---

## 6. Khuyến Nghị Về Dữ Liệu Demo (Dành Cho Triển Khai)
Giao diện đã đẹp, nhưng dữ liệu mẫu vẫn còn khá "thô". Khuyến nghị anh/chị quản trị viên đăng nhập vào hệ thống và dùng form **Sửa công trình** để đổi tên:
-   `Công Trình test` 👉 `Dự án Khu Đô Thị Nam Thăng Long`
-   `Du an Nguyen Trai` 👉 `Dự án Đường Nguyễn Trãi`
-   `Chủ đầu tư test1` 👉 `Ban QLDA Giao thông HN`
*(Điều này giúp bản thân ứng dụng khi đưa cho Sếp xem UAT sẽ toát lên sự chuyên nghiệp)*

---

## 7. Kết Luận
**Màn Công trình đã được nâng cấp UI/UX theo hướng sáng, gọn, chuyên nghiệp; form tạo/sửa không còn input nền tối gây lỗi thẩm mỹ; danh sách có khả năng mở rộng tốt hơn (nhờ pagination); giữ nguyên RBAC, audit log, transaction và sẵn sàng UAT.**

---

## 8. Visual polish sau ảnh chụp UAT
- Đã đổi nút Lọc từ màu tối sang xanh primary để đồng bộ giao diện.
- Đã thêm padding đáy (pb-24) cho form tạo/sửa công trình để các nút không bị sát đáy màn hình.
- Đã thêm `title` và `aria-label` cho quick action “Nhập KL” và “Tổng hợp” để rõ nghĩa hơn.

---

## 9. Final polish sau ảnh UAT lần 2
- Đã tăng khoảng cách đáy form tạo/sửa công trình lên `pb-32` để cụm nút có khoảng thở rộng rãi hơn, hoàn toàn không bị sát taskbar.
- Đã tăng nhẹ độ tương phản cho action “Xem/Sửa” trong bảng danh sách (từ `text-slate-600 font-medium` sang `text-slate-700 font-semibold`), giúp người dùng dễ dàng nhận biết có thể tương tác mà không lấn át nút "Nhập KL".
- Đã kiểm tra nút "Xóa" ở màn chi tiết công trình: Nút này ĐÃ có confirm dialog rất an toàn, nay được cập nhật wording chuẩn: "Dữ liệu sẽ được ẩn khỏi danh sách nhưng vẫn được lưu trong hệ thống để truy vết." Nút xác nhận đổi thành "Xóa công trình" và nút Hủy rõ ràng.
- Đã kiểm tra card “Đề xuất vật tư”: Module này hiện đang hoạt động bình thường, route `/projects/[id]/material-requests` đã hoàn thiện ở phase trước, nên giữ nguyên để phục vụ luồng công việc.
- Prisma validate PASS.
- TypeScript PASS.
- Build PASS.
- Desktop/Mobile layout giữ vững, không có thanh cuộn ngang rác.

**Kết luận:**
Màn Công trình đã được polish cuối theo ảnh UAT thực tế: form tạo/sửa thoáng hơn, action bảng rõ nghĩa hơn, thao tác xóa an toàn hơn, module chưa hoàn thiện không gây nhầm lẫn, giữ nguyên RBAC/Audit/Transaction và sẵn sàng chốt UAT.

---

## 10. Fix cuối cụm nút form tạo/sửa
- Ảnh UAT lần 2 cho thấy cụm nút cuối form vẫn sát đáy dù đã tăng `pb-32`.
- Đã chuyển cụm nút vào footer riêng bên trong form/card: `mt-8 border-t border-slate-100 pt-6 pb-12`.
- Footer có border-top nhẹ và padding top/bottom rõ ràng, tạo khoảng thở lớn.
- Thiết kế responsive: Desktop căn phải (`sm:flex-row sm:justify-end`), mobile dễ bấm với `flex-col-reverse` và full width (`w-full`).
- Không thay đổi logic submit, RBAC, AuditLog, Transaction.
- Prisma validate PASS.
- TypeScript PASS.
- Build PASS.

**Kết luận:**
Form tạo/sửa công trình đã xử lý triệt để vấn đề nút sát đáy: cụm action được đặt trong footer riêng, có khoảng thở rõ ràng, không bị taskbar che, giữ nguyên logic nghiệp vụ và sẵn sàng chốt UAT.
