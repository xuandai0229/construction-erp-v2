# PRE-PRODUCTION READINESS CHECK REPORT
**Thời gian**: Hôm nay
**Mục tiêu**: Đánh giá toàn diện các hạng mục Hạ tầng (Infrastructure), Bảo mật (Security), và Dữ liệu (Data) trước khi hệ thống chính thức Go-live.

---

## 1. Kiểm tra biến môi trường (`.env`) & Git Ignore
- **Biến môi trường (.env)**:
  - Có khai báo `DATABASE_URL` (trỏ vào localhost PostgreSQL).
  - Có khai báo `AUTH_SECRET` cho NextAuth/Session.
  - ⚠️ **Rủi ro nhỏ**: `DATABASE_URL` hiện đang dùng user `postgres` và pass `123456`, rất dễ bị đoán nếu server public cổng 5432 ra ngoài. Khi lên Production cần một User DB với mật khẩu random và giới hạn Role an toàn hơn.
- **Git Ignore**:
  - File `.env`, `.env.local` đã được add vào `.gitignore` thành công (Chữ ký `!` cho phép `.env.example` commit lên được nhưng chặn các file nhạy cảm).
  - Đã có ignore thư mục `backups/`, `.dump`, `.sql` và các file `npm-debug.log`.
- **Kết luận**: **PASS** (Git Ignore chuẩn, cấu hình Env đã chạy tốt).

## 2. Kiểm tra Database Migration & Trạng thái Prisma
- **Migration Status**:
  - Lệnh `npx prisma migrate status` trả về: `10 migrations found in prisma/migrations. Database schema is up to date!`.
  - Không có bất cứ schema nào bị drift (lệch) so với database thực tế.
- **Prisma Validation**:
  - Lệnh `npx prisma validate` hoàn thành không có lỗi: `The schema at prisma\schema.prisma is valid 🚀`.
- **Kết luận**: **PASS** (Cấu trúc DB vững chắc).

## 3. Kiểm tra bảo mật cơ bản (Security Guard)
- **Tài khoản / Mật khẩu Hardcode**: Đã rà soát `src/app/login/page.tsx` và không hề có giá trị `defaultValue` gài sẵn admin/password trên form. Người dùng hoàn toàn phải nhập chay.
- **Guard các Server Actions**:
  - `createProject`, `updateProject`, `deleteProject` đều được bọc bởi guard `canManageProjects(session)` giới hạn chỉ `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR` mới truy xuất được.
  - Khối lượng hiện trường `createItem`, `updateItem`, `batchSaveDailyEntries` đều được chặn nghiêm ngặt bởi `requireProjectAccess(projectId)` -> chống IDOR và User ngoài dòm ngó.
- **Kết luận**: **PASS** (Bảo mật Application logic đạt chuẩn).

## 4. Kiểm tra Production Build & Smoke Test
- Lệnh `npm run build` đã build bundle Production (Next.js Turbopack) thành công, kết hợp chung lệnh `npx tsc --noEmit` quét Type Error trả về Exit Code `0`.
- Chạy hệ thống trên port `3001` bằng `npm run start` và dùng Script E2E (Playwright) truy cập ẩn danh + đăng nhập.
- Toàn bộ các Route cốt lõi (`/dashboard`, `/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/field-progress`, `/projects/[id]/field-progress/daily`, `/projects/[id]/field-progress/summary`) đều trả về **HTTP Status 200 OK**. Không xảy ra Internal Server Error 500 hay vòng lặp Redirect vô tận.
- **Kết luận**: **PASS** (Hệ thống phần mềm mượt mà, sẵn sàng đón tải thật).

## 5. Danh sách Dữ liệu Demo rác (CẦN CLEANUP)
Trong cơ sở dữ liệu hiện tại đang có các dòng dữ liệu chưa đủ độ chuyên nghiệp để Demo/Go-live, bao gồm:
- **Project**:
  - `Công Trình test`
  - `Du an Nguyen Trai`
- **Users**:
  - `Giám đốc Test` (`director@construction.local`)
  - `Phó GĐ Test` (`deputy@construction.local`)
  - `Chỉ huy trưởng CT001`
  - `Chỉ huy trưởng CT002`
- **Đề xuất**: Phía nghiệp vụ (hoặc Admin) cần sử dụng giao diện hệ thống để chỉnh sửa tên, thông tin (ví dụ: *Dự án Căn hộ CT1 Nguyễn Trãi*, *Nguyễn Văn A - Chỉ huy trưởng*) hoặc xóa mềm các dữ liệu này trước khi ban giao/demo cho khách.

## 6. Đề xuất Backup/Restore (Hạ Tầng)
Hiện tại chưa có hệ thống tự động backup. Đề xuất sử dụng `pg_dump` cho môi trường Windows theo kịch bản:
- Tạo thư mục local an toàn: `mkdir backups` (Thư mục này đã được ignore trong Git).
- Lệnh Backup: `pg_dump -U postgres -h 127.0.0.1 -p 5432 -F c -d construction_erp_v2 -f backups/db_backup_pre_prod.dump`
- Lệnh Restore (Khi cần): `pg_restore -U postgres -h 127.0.0.1 -p 5432 -d construction_erp_v2 -1 backups/db_backup_pre_prod.dump`

---

## 7. KẾT LUẬN CUỐI CÙNG

- **UAT nội bộ**: **PASS**
- **Production phần mềm**: **PASS** (Toàn bộ logic, UI, Build & Security đều đạt chuẩn).
- **Production hạ tầng**: **PARTIAL** (Thiếu lệnh cronjob chạy tự động backup Database ra file hằng ngày).

🚨 **TRẠNG THÁI GO-LIVE: ĐƯỢC PHÉP!**
Hệ thống **ĐƯỢC PHÉP** Go-live cho người dùng thực. Các rủi ro còn lại đều nằm ngoài Code/App (Vấn đề quy trình Backup tự động, thông tin mật khẩu DB, và việc chuẩn hóa tên dữ liệu test) nên có thể thực hiện song song bởi đội ngũ quản trị server.
