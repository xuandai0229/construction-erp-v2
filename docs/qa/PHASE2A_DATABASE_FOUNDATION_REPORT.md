# Báo Cáo Phase 2A: Nền Móng Database, Package, Thư Mục & Lib (Construction ERP v2)

**Ngày giờ thực hiện**: 2026-06-08 (theo giờ địa phương)
**Workspace hiện tại**: `D:\construction-erp-v2`

## 1. Môi trường & Version Thực Tế
- **Next.js**: `16.2.7`
- **React**: `19.2.4`
- **TypeScript**: `^5`
- **Prisma**: `7.8.0`

## 2. Các Gói Phần Mềm (Packages)
**Đã cài đặt bổ sung:**
- `zod`, `decimal.js`, `lucide-react`, `clsx`, `tailwind-merge`, `date-fns`, `bcryptjs`, `xlsx`, `react-hook-form`
- Các gói bổ trợ cho Prisma 7.8.0: `pg`, `@prisma/adapter-pg`
- Các gói dev/types: `tsx`, `@types/bcryptjs`, `@types/pg`

## 3. Cấu Trúc Thư Mục Nền (Foundation Structure)
Đã khởi tạo đúng theo cấu trúc `src/app` của Next.js:
- `src/app/dashboard`, `src/app/projects`, `src/app/documents`, `src/app/reports`, `src/app/accounting`, `src/app/settings`, `src/app/api`
- `src/components/layout`, `src/components/ui`, `src/components/dashboard`, `src/components/projects`, `src/components/documents`, `src/components/reports`, `src/components/accounting`, `src/components/forms`
- `src/lib`, `src/lib/validations`
- `docs/qa`, `docs/architecture`
- `storage/projects`

## 4. Cơ Sở Dữ Liệu & Prisma Schema
- **Database url**: `postgresql://postgres:******@localhost:5432/construction_erp_v2?schema=public` (Đã lưu tại `.env`).
- Đã cấu hình adapter `PrismaPg` để tương thích chuẩn với Prisma 7.8.0.
- **Enums đã tạo**: `UserRole`, `ProjectRole`, `ProjectStatus`, `ContractType`, `ContractStatus`, `MaterialMovementType`, `PaymentStatus`, `ApprovalStatus`, `SiteReportStatus`.
- **Models đã tạo**: `User`, `Project`, `ProjectMember`, `WBSItem`, `Supplier`, `Contract`, `DocumentFolder`, `Document`, `SiteReport`, `SiteReportPhoto`, `MaterialItem`, `MaterialMovement`, `PaymentPlan`, `PaymentRecord`, `ApprovalRequest`, `ChatMessage`, `AuditLog`.
- **Thiết kế**: Quan hệ đầy đủ, dùng `Decimal` cho giá trị tiền tệ/phần trăm, soft delete (`deletedAt`), index các khoá chính/ngoại.
- **Migration**: Đã chạy thành công lệnh migrate sinh ra file `init_core_schema`.

## 5. Seed Database & Tài Khoản Admin Dev
- Đã tạo seed script tại `prisma/seed.ts`.
- Lệnh cấu hình trong `prisma.config.ts` để gọi via `npx tsx`.
- **Admin**: `admin@construction.local` / Mật khẩu: `123456` (đã hash qua `bcryptjs`).
- Chạy seed thành công vào CSDL.

## 6. Các Thư Viện Nền Tảng (Core Libs)
1. `src/lib/prisma.ts`: Singleton client tích hợp `adapter-pg`.
2. `src/lib/money.ts`: Các hàm wrapper cho `decimal.js` và format tiền VNĐ.
3. `src/lib/audit.ts`: Hàm ghi log `writeAuditLog`.
4. `src/lib/permissions.ts`: Các hàm kiểm tra quyền truy cập dự án (`canViewProject`, `canEditProject`).
5. `src/lib/storage.ts`: Hàm cấp phát storage path bảo mật không expose đường dẫn vật lý ra frontend.

## 7. Kết Quả Kiểm Tra Hệ Thống (QA Validation)
- **`npx prisma validate`**: Passed (Hợp lệ).
- **`npx tsc --noEmit`**: Passed (Không có lỗi TypeScript hay mismatch version của client).
- **`npm run build`**: Passed (Dự án build tĩnh thành công).
- **Tình trạng lỗi**: Không có lỗi tồn đọng. Mọi cảnh báo về tương thích với Prisma 7.8 (bỏ datasource url) đã được xử lý triệt để thông qua pg adapter.

## 8. Đề Xuất Phase Tiếp Theo (Phase 2B / Phase 3)
- Bắt đầu xây dựng UI/UX nền tảng cho Next.js (Layout shell, Header, Sidebar, Auth module).
- Xây dựng Auth system cho phép Admin đăng nhập dựa trên bcryptjs và cookie/session.
