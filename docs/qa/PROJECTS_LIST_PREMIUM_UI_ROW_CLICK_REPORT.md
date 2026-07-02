# Báo cáo Cập nhật UI Premium, Fix Lỗi Decimal & Chống Tràn Bảng (Horizontal Scroll)

## 1. Lỗi Decimal và cách fix
- **Vấn đề**: Next.js (app router) báo lỗi ở console/terminal: `Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported`. Lỗi xảy ra vì `prisma.project.findMany()` trả về field `budget` kiểu `Decimal` và các kiểu `Date`, sau đó truyền thẳng vào `<ProjectsListClient>`.
- **Cách fix**: Đã tạo bước trung gian map dữ liệu (Data Transfer Object - DTO) ở Server Component.
  ```ts
  const projectRows = projects.map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
    investor: project.investor ?? null,
    location: project.location ?? null,
    status: project.status,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    endDate: project.endDate ? project.endDate.toISOString() : null,
  }));
  ```
  Trường `budget` (kiểu Decimal) không được dùng ở giao diện nên đã bỏ hoàn toàn khỏi object này. Chuyển `startDate` và `endDate` thành ISO string trước khi qua Client Component. Sau đó truyền `<ProjectsListClient projects={projectRows} ... />`. 

## 2. Các file đã sửa
- **`src/app/(dashboard)/projects/page.tsx`**: DTO mapper để fix lỗi Decimal; thiết kế lại filter card, tối ưu toolbar gọn gàng hơn.
- **`src/components/projects/project-list-client.tsx`**: Xử lý triệt để layout bảng `table-fixed`, chỉnh typography gọn, thêm format thời gian dạng `15/01/2026 → 30/12/2026`, implement row click.

## 3. Vì sao không còn horizontal scrollbar trên Desktop
- Bảng HTML thông thường sẽ co giãn cột tuỳ vào độ dài của content, gây bể khung màn hình. 
- **Đã xử lý bằng cách**:
  - Dùng class `table-fixed w-full` trên thẻ `<table>`.
  - Khai báo độ rộng cột cố định ở `<thead>`: `w-[150px]`, `w-[230px]`, `w-[190px]`, `w-[230px]`, `w-[150px]`, `w-[170px]`, `w-[180px]`.
  - Sử dụng responsive grid cho các cột ít quan trọng hơn: Chủ đầu tư (`hidden xl:table-cell`) và Địa điểm (`hidden lg:table-cell`). Nghĩa là màn hình nhỏ thì sẽ ẩn đi, tránh nhồi nhét.
  - Sử dụng class `truncate` để text quá dài bị cắt đi một cách sạch sẽ (`...`) thay vì đẩy giãn row.

## 4. Cách implement bấm cả dòng (Row Click)
- Màn hình sử dụng `<ProjectsListClient>` (Client Component).
- Trên thẻ `<tr>`, bổ sung sự kiện: `onClick={() => handleRowClick(project.id)}`. 
- Bổ sung Keyboard Accessibility: Thêm `role="button"`, `tabIndex={0}` và handle sự kiện ấn phím `Enter` hoặc `Space` trên dòng. Cập nhật con trỏ chuột thành `cursor-pointer`.

## 5. Cách chặn event (stopPropagation) cho các action
- Để khi người dùng click vào nút "Sửa" hoặc "Xem chi tiết" mà không bị mở trang chi tiết trồng chéo (kích hoạt `handleRowClick`), tôi đã thêm `onClick={(e) => e.stopPropagation()}` trực tiếp vào mỗi thẻ `<Link>` của action.

## 6. Action đã xoá khỏi màn danh sách
- **Nhập KL** (`/projects/[id]/field-progress/daily`): Xóa.
- **Tổng hợp** (`/projects/[id]/field-progress/summary`): Xóa.
- Cột thao tác hiện tại cực kỳ gọn với 2 nút: `Xem` và `Sửa` kèm icon thay vì text dài nhằng, không có thanh phân cách (separator) thừa.

## 7. Kết quả Verification
- `npx prisma validate`: **PASS** (The schema at prisma\schema.prisma is valid 🚀)
- `npx tsc --noEmit`: **PASS**
- `npm run build`: **PASS** (Compiled successfully, Exit code: 0)

## 8. Manual UAT checklist

- [x] Không còn lỗi đỏ Decimal ở console khi render danh sách.
- [x] Không còn nút Nhập KL trên bảng.
- [x] Không còn nút Tổng hợp trên bảng.
- [x] Không có scrollbar ngang trên giao diện desktop.
- [x] Cột thao tác không bị cắt chữ (đã làm gọn thành text nhỏ "Xem", "Sửa" kèm icon).
- [x] Bấm cả dòng (bất kỳ ô nào) đều mở đúng trang chi tiết.
- [x] Bấm Sửa không kích hoạt trang chi tiết trước.
- [x] Hover row có nền mượt `hover:bg-blue-50/35` và action icon dịch chuyển mượt đồng bộ hệ thống Dashboard.
- [x] Build pass (không lỗi build, không lỗi type).
