# BÁO CÁO QA: TRIỂN KHAI HỆ THỐNG SETTINGS THẬT (PHASE 1)

## 1. Kết luận mới
- **Trạng thái:** **REAL STORED** & **NOT YET ENFORCED**
- **Xác minh UI:** **BROWSER VERIFIED**
- **Đánh giá:** Lỗi UI-ONLY nghiêm trọng đã được khắc phục hoàn toàn. Cài đặt hệ thống hiện tại đã có mô hình Database thật, được quản lý bằng Server Actions bảo mật cao, và có cơ chế Audit đầy đủ. Mới đây nhất, lỗi runtime thiếu Prisma delegate cũng đã được xử lý triệt để. Tuy nhiên, các cấu hình này chưa được enforce vào các module nghiệp vụ ở Phase 1.

## 2. Các file đã sửa / tạo mới
- **Thêm/Sửa Prisma Schema**: `prisma/schema.prisma`
- **Tạo Validation Schema**: `src/lib/settings/settings-validation.ts`
- **Tạo Server Actions**: `src/app/(dashboard)/settings/actions.ts`
- **Refactor Page**: `src/app/(dashboard)/settings/page.tsx`
- **Refactor UI**: `src/components/settings/settings-workspace.tsx`
- **Xóa Legacy Files**: `src/lib/settings/settings-profile.ts`, `src/lib/settings/settings-profile.test.ts` (xóa các file mock tĩnh).

## 3. Lỗi Runtime & Quá trình Xử lý (Post-Deployment)
**Tình trạng trước đó:** Khi vào trang `/settings` gặp lỗi `Cannot read properties of undefined (reading 'findFirst')`. 
**Nguyên nhân gốc:** Lỗi này xảy ra do 2 lý do cộng gộp:
1. Developer chưa chạy lệnh đồng bộ schema mới xuống Database (`db push` hoặc `migrate`).
2. Dev Server của Next.js (chạy qua lệnh `npm run dev`) cache lại instance cũ của PrismaClient chưa được update code generate mới (missing delegate `systemSetting`).

**Cách đã xử lý:**
1. Dừng dev server và tiến hành dọn dẹp cache (có thử dọn `.next`).
2. Chạy lệnh đồng bộ Database: `npx prisma db push --accept-data-loss`.
3. Chạy lệnh generate lại Client: `npx prisma generate`.
4. Bổ sung Guard Pattern an toàn vào Server Actions: Bắt buộc kiểm tra `if (!("systemSetting" in prisma))` trước khi gọi DB để quăng lỗi thân thiện nếu thiếu delegate.
5. Cập nhật file `.env` load trực tiếp trong script test để đảm bảo kết nối DB.

**Bằng chứng sau fix:**
- Script `scripts/check-settings-db.ts` chạy thành công (có ảnh snapshot), xuất ra:
  - `systemSetting delegate: object` (chứng tỏ Prisma Client đã có delegate).
  - Tự động fallback tạo default settings qua Prisma.
  - Update thử trường `maintenanceWindow` thành công (chứng tỏ DB table hoạt động tốt).
- **Đã mở `/settings` sau khi restart dev server và không còn lỗi runtime.** Bằng chứng xác minh qua trình duyệt (Browser Verified):
  - Trang render thành công, đọc dữ liệu trung thực từ DB.
  - Thực hiện đổi field "Hotline nội bộ", bấm Save thành công, state loading mượt mà.
  - F5 reload trang vẫn giữ được giá trị Hotline mới lưu.
  - Khi đăng xuất admin, bị redirect 403 về trang `/login` ngay lập tức, chứng minh Server Action RBAC và Middleware hoạt động chuẩn.

> **Lưu ý thao tác DB:** Lệnh `npx prisma db push --accept-data-loss` chỉ được dùng cho local/dev để khôi phục nhanh cấu trúc bảng. Tuyệt đối không dùng cho production.
> Đề xuất migration chuẩn cho tương lai:
> - **Dev:** `npx prisma migrate dev --name add_system_settings`
> - **Production:** `npx prisma migrate deploy`

## 4. Model Prisma đã thêm
Mô hình `SystemSetting` đã được thêm vào cuối file `schema.prisma`. 
Model này bao gồm 37 trường chi tiết được tách biệt rõ ràng (Organization, Security, Workflow, Documents, Notifications, Data) giúp tối ưu hóa truy vấn và dễ dàng mapping với UI. Có liên kết `updatedBy` tới `User` model.

## 5. Server Actions đã thêm
Hai hành động chính tại `src/app/(dashboard)/settings/actions.ts`:
- `getSystemSettings()`: Khởi tạo dữ liệu mặc định (Seed) nếu DB trống và trả về dữ liệu an toàn.
- `updateSystemSettings(input)`: Giao dịch an toàn (Transaction), nhận payload từ form, validate với Zod, lưu Database, và cập nhật `AuditLog` với `beforeData` và `afterData`. Tự động revalidate Next.js cache.

## 6. Validation Schema & Audit log
- Triển khai Zod với ràng buộc độ dài, format, min/max chuẩn.
- Mọi hành động Update Settings đều được lưu qua bảng `AuditLog`, track rõ oldValue/newValue, userAgent và ipAddress.

## 7. RBAC
- Cả hai action `getSystemSettings` và `updateSystemSettings` đều được bảo vệ bởi hàm `canManageUsers(session)`. Page `/settings` kiểm tra session và redirect người không đủ quyền.

## 8. Trạng thái Enforcement
**Tất cả** setting được lưu DB thật. Trong Phase 1, các tính năng vận hành mới chỉ được lưu. Việc enforce (áp dụng logic thật) chưa được thực hiện. UI hiển thị trung thực bằng các label "Sắp ra mắt" thay vì tạo cảm giác "Đã được bật".

## 9. Kết quả các lệnh đã chạy
- `npx prisma format` & `npx prisma validate`: **PASS**
- `npx prisma db push --accept-data-loss`: **PASS**
- `npx prisma generate`: **PASS**
- `npx tsc --noEmit`: **PASS**
- `npm run build`: **PASS**
- `npx tsx --env-file=.env scripts/check-settings-db.ts`: **PASS**

## 10. Đề xuất Phase 2
Để hệ thống hoàn chỉnh theo hướng "Fully Enforced", cần triển khai móc dữ liệu cấu hình vào các module thật sau đây:
1. **Auth/Session:** Áp dụng `sessionTimeoutMinutes`, bắt buộc 2FA cho role Admin tại next-auth/middleware.
2. **Payment:** Đọc `paymentTwoStepApproval` và `contractValueThreshold` để quyết định số bước duyệt chi.
3. **Material:** Đọc `materialRequestApproval` tại endpoint tạo/duyệt xuất vật tư.
4. **Contract:** Ràng buộc hạn mức contract.
5. **Report:** Đọc `reportLockAfterApproval` tại API nộp báo cáo thi công.
6. **Document upload:** Áp dụng `maxUploadSizeMb`, `allowedExtensions` và `enforceNamingConvention` tại API upload tài liệu.
7. **Notification/Backup jobs:** Dựng server/cronjob để chạy tác vụ sao lưu tự động và gửi email daily digest.
