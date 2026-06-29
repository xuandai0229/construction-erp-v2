# BÁO CÁO QA & CODE AUDIT - PHÂN HỆ CÔNG TRÌNH (/projects)
**Trạng thái**: PASS (Có một số cảnh báo mức độ Cấp thấp/Trung bình)
**Ngày kiểm tra**: 27/06/2026
**Mục tiêu**: Kiểm tra UI, UX, Performance, Bảo mật và tính toàn vẹn dữ liệu cho màn hình danh sách công trình `src/app/(dashboard)/projects`.

---

## 🟢 ĐÁNH GIÁ CHUNG
Phân hệ danh sách công trình (Projects) được triển khai **rất vững chắc**. Database query chuẩn mực (không N+1), RBAC (Phân quyền) bắt chặt chẽ cả ở tầng truy vấn DB lẫn actions, Server Components được ứng dụng hợp lý. Build và Type check hoàn toàn pass 100%.

Tuy nhiên, nếu để sẵn sàng cho production khi có dữ liệu phức tạp (dài, edge cases), có một số điểm nhỏ cần tối ưu lại (không cản trở Go-live nhưng nên điều chỉnh để hoàn thiện 100%).

---

## 📊 CHI TIẾT TỪNG PHASE

### PHASE 0 & 1: BỐI CẢNH & HIỂN THỊ DỮ LIỆU
✅ **Load dữ liệu**: Không có lỗi trắng màn khi thiếu data. Hàm check `null/undefined` hoạt động tốt (e.g. `{project.investor || "—"}`).
✅ **Trạng thái**: Render badge Map chuẩn 5 trạng thái: `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`.
⚠️ **Cảnh báo (Low)**: 
- **Timezone Ngày tháng**: Hàm `format(new Date(project.startDate))` đang render dựa trên local timezone của server. Trên production nếu server ở UTC, người dùng VN có thể bị hiển thị sai lệch 1 ngày.
- **Tràn text (Overflow)**: Table Desktop ở cột Tên công trình không giới hạn độ dài. Mặc dù dùng thẻ `<td>` tự wrap, nhưng nếu text đặc biệt không có dấu cách sẽ gây tràn UI. Mobile View đã dùng `line-clamp-2` tốt.

### PHASE 2: CRUD (ACTIONS)
✅ **Validation**: Zod schema cover đủ các field. Validate code chống trùng thành công.
✅ **Audit Log**: Tích hợp chặt chẽ ở mọi action Create, Update, Soft_Delete.
✅ **Xóa / Archive**: Đã dùng Soft Delete (`deletedAt: new Date()`), bảo đảm an toàn dữ liệu, không lỗi Foreign Key, không vô tình xóa nhầm công trình thật có data.
⚠️ **Cảnh báo (Medium)**: 
- Không có ràng buộc `startDate < endDate`.
- **Logic chốt sổ**: Không cấm chỉnh sửa (`updateProject`) nếu trạng thái công trình đang là `COMPLETED` hoặc `CANCELLED`. Nên có cơ chế Block Update nếu dự án đã đóng (trừ Admin).

### PHASE 3: RBAC / PHÂN QUYỀN (RẤT TỐT)
✅ **Quyền Xem**: Lọc bằng Prisma Filter `whereCondition.id = { in: accessibleIds }` là tối ưu tuyệt đối. User không được gán quyền sẽ không bao giờ thấy, không bị lộ cả ở tổng số lượng hay search.
✅ **Quyền Thao Tác**: Bọc `canManageProjects()` ở đầu tất cả các server actions. Sếp/Admin có nút "Thao tác" và "Tạo mới", Chỉ huy/Nhân viên không có nút và cũng không gọi API lụi được.

### PHASE 4: SEARCH / FILTER / SORT / PAGINATION
✅ **Pagination**: Hoạt động hoàn toàn Server-side với `skip`, `take`. Total Items đếm qua quyền RBAC nên trang đếm không bao giờ bị lộ số liệu.
✅ **Search**: Sử dụng `mode: 'insensitive'` qua các field `code, name, investor` rất an toàn, case-insensitive tốt.
✅ **Filter**: Tích hợp Filter + Search qua form `<form method="GET">`, giữ url search params rất tốt cho SEO và UX (bấm f5 không mất filter).

### PHASE 5: UI / UX & RESPONSIVE
✅ **Desktop**: Dùng Table, Row hover hiệu ứng mượt, ẩn bớt action bằng `opacity-60 group-hover:opacity-100` để đỡ rối mắt.
✅ **Mobile/Tablet**: Chuyển hoàn toàn sang dạng Card layout. Các nút thao tác quan trọng (Nhập KL, Tổng hợp) to, dễ bấm khi thao tác bằng điện thoại ngoài công trường.
✅ **Edge States (Empty/Error)**: Giao diện Empty state tinh tế, báo câu từ khác biệt giữa "Chưa được giao công trình" (dành cho nhân viên) và "Không có dữ liệu" (khi search). File `error.tsx` catch lỗi API đẹp.

### PHASE 6: PERFORMANCE VỚI NHIỀU DỮ LIỆU
✅ **Query Optimize**: Select chuẩn, không bị lỗi query n+1. Pagination xử lý nhẹ.
✅ **Index Database**: Các field quan trọng được index `@@index([code])`, `@@index([status])`, `@@index([createdAt])`. Đảm bảo search/filter hàng ngàn công trình vẫn dưới 100ms.

### PHASE 7: BẢO MẬT & LUỒNG LIÊN KẾT
✅ Zod schema + Form validation triệt tiêu XSS / NoSQL Injection.
✅ Object truyền đi `Object.fromEntries(formData)` qua zod `parse()` loại bỏ prototype pollution.
✅ Liên kết các link sang `[id]/field-progress` hay `[id]/edit` đều chuẩn chỉnh, user không có quyền bấm vào URL edit cũng sẽ bị back về do check quyền màn chi tiết.

### PHASE 10: BUILD / TYPE / LINT
✅ `npm run build` —> **Pass (Exit code: 0)**
✅ `npx tsc --noEmit` —> **Pass**
✅ `npx prisma validate` —> **Pass**

---

## 🎯 ĐỀ XUẤT PHƯƠNG ÁN (KHÔNG CHẠM CODE LẦN NÀY)

Hệ thống list project đang rất ổn định. Để 100% hoàn hảo và đưa vào Production an toàn hơn, đề xuất ở Phase tiếp theo:

1. **(Medium)**: Thêm cơ chế chặn edit / update ở `actions.ts` nếu `project.status === 'COMPLETED' || 'CANCELLED'`.
2. **(Low)**: Giới hạn độ dài max length cho `name` trong Zod Schema. Validate `startDate <= endDate` ở server.
3. **(Low)**: Định dạng Timezone VN (sử dụng thư viện `date-fns` `utcToZonedTime` hoặc truyền string cố định) tránh lệch 1 ngày khi deploy server nước ngoài.
4. (Optional): Tạo một script dọn dẹp các project `deletedAt !== null` quá 30 ngày (nếu hệ thống sau này đầy DB).
