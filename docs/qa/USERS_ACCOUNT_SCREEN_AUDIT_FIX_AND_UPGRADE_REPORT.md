# Audit, sửa lỗi và nâng cấp màn hình Tài khoản (`/users`)

Ngày thực hiện: 13/07/2026 (ICT)

## 1. Kết luận

**PASS có điều kiện.** Lỗi Server/Client Component gây crash đã được xử lý tại nguồn. Màn hình được bổ sung lọc theo công trình, sắp xếp, phân trang cục bộ, drawer chi tiết và các ràng buộc server-side cho dữ liệu tài khoản. TypeScript, lint phạm vi, Prisma, build và audit RBAC tĩnh đều pass.

Chưa có bằng chứng UI runtime trực tiếp vì yêu cầu không chạy `npm run dev`; các Playwright hiện có cần server đang chạy và một số script tạo/xóa dữ liệu QA nên không được chạy.

## 2. Bảo vệ repository

- Worktree đã có các thay đổi chưa commit từ audit ngôn ngữ trước đó; các file này được giữ nguyên.
- Không chạy `git checkout`, `git reset --hard`, `git clean`, seed, migration, thao tác xóa dữ liệu, commit hoặc push.
- Không đổi Prisma schema hoặc migration.

## 3. Nguyên nhân gốc của crash

### Bằng chứng

- Route server: `src/app/(dashboard)/users/page.tsx:9` là Server Component và render bốn `KpiCard` tại dòng 72–94.
- Shared component: `src/components/ui/enterprise.tsx` trước sửa nhận `onClick`, truyền `onClick`, `role`, `tabIndex` và luôn tạo `onKeyDown` vào `ContentCard`.
- `ContentCard` cuối cùng render một thẻ `div`, vì thế React Server Components cố gửi event handler cho DOM từ cây server. Đây chính là cấu trúc xuất hiện trong exception: `div ... onClick ... role ... tabIndex ... onKeyDown`.
- Lỗi chỉ lộ tại `/users` vì đây là page Server Component duy nhất đang render `KpiCard` trực tiếp. Các nơi dùng KPI có tương tác thuộc client workspace.

### Cách sửa

1. `KpiCard` trong `src/components/ui/enterprise.tsx:104` nay là component trình bày tĩnh, không còn nhận hoặc phát sinh event handler.
2. Tạo `src/components/ui/interactive-kpi-card.tsx` với `"use client"`; chỉ component này nhận `onClick` và dùng thẻ `button` native.
3. `materials-overview.tsx` và `materials-ui.tsx` dùng `InteractiveKpiCard` khi KPI cần click, nên không mất tương tác đã có của mô-đun Vật tư.
4. `users/page.tsx` vẫn là Server Component, tiếp tục query Prisma/SSR và chỉ truyền dữ liệu JSON-serializable vào `UserManagementClient`.

Phương án này không biến cả trang hoặc shared enterprise UI thành Client Component, nên tránh tăng bundle không cần thiết và giữ SSR của `/users`.

## 4. Màn hình trước khi sửa

| Hạng mục | Bằng chứng | Hiện trạng đã audit |
| --- | --- | --- |
| Header | `users/page.tsx:65` | Tiêu đề, mô tả, không có action ở header. |
| KPI | `users/page.tsx:72–94` | Tổng tài khoản, GĐ/Phó GĐ, Chỉ huy trưởng, Đang hoạt động. |
| Tìm kiếm | `user-management-client.tsx:394` | Tên, email, username và số điện thoại. |
| Bộ lọc | `user-management-client.tsx:396–409` | Vai trò, trạng thái; thiếu lọc công trình trước sửa. |
| Bảng desktop | `user-management-client.tsx:421+` | Người dùng, đăng nhập/email, SĐT, vai trò, công trình, trạng thái, thao tác. |
| Card mobile | `user-management-client.tsx:488+` | Có card và nút Xem/Sửa/Khóa/Xóa/Khôi phục. |
| Detail | phần `detailUser` | Là modal giữa màn hình, chưa là drawer và chưa đóng bằng Esc. |
| Form | phần create/edit | Có tạo, sửa, role, công trình, ghi chú. |
| Gán công trình | `assignProjectToUser`, `unassignProjectFromUser` | Có dialog gán và chip gỡ. |
| Sorting/paging | client | Chưa có trước sửa. |
| Last login | `prisma/schema.prisma:217–255` | Không có field thực, nên không thêm cột dữ liệu giả. |

Không có API route riêng cho Users. Các mutation chạy qua server actions trong `src/app/(dashboard)/users/actions.ts`.

## 5. Cải tiến đã thực hiện

- Thêm lọc theo Công trình, sắp xếp Người dùng/Vai trò/Trạng thái và phân trang 10 bản ghi/trang tại `user-management-client.tsx:123–174`, `404`, `426–431`, `540+`.
- Hàng desktop mở drawer bằng click, Enter hoặc Space; mọi nút con gọi `stopPropagation`, nên không mở drawer khi thao tác gán/gỡ/sửa/khóa/đặt lại mật khẩu/ngừng dùng.
- Detail chuyển thành drawer bên phải tại `user-management-client.tsx:626+`; đóng bằng nút, overlay hoặc Esc. Các dialog còn lại cũng đóng bằng Esc.
- Chuẩn hóa nhãn trạng thái: `Đang hoạt động`, `Đã khóa`, `Ngừng sử dụng`; không hiển thị enum trực tiếp.
- Ẩn các thao tác nhạy cảm với chính tài khoản đang đăng nhập tại `canPerformSensitiveAction` (`user-management-client.tsx:60`); form vẫn cho phép sửa thông tin của chính mình nhưng khóa chọn vai trò (`:760+`).
- Error boundary `/users` hiển thị tiếng Việt theo ngữ cảnh; production không lộ `error.message`, development vẫn xem được chi tiết. Có Thử lại, Quay lại và Về trang tổng quan.
- Server action kiểm tra role hợp lệ, tên/email, email/username, số điện thoại, công trình active và chống mã công trình trùng lặp trong input.
- Khi đổi role bằng gọi trực tiếp mà không gửi lại danh sách công trình, membership active được đồng bộ về `CHIEF_COMMANDER` hoặc `VIEWER`.

## 6. Chức năng thực và phần chưa hỗ trợ

### Hoạt động thật

- Danh sách tài khoản và project assignment query bằng Prisma trên server (`users/page.tsx:14–37`).
- Tạo, cập nhật, khóa/mở khóa, đặt mật khẩu tạm, gán/gỡ công trình, ngừng sử dụng mềm và khôi phục đều là server action có ghi audit log/revalidate.
- Không xóa vật lý User; ngừng sử dụng đặt `deletedAt` và `isActive: false`.
- Role mapping dùng `ROLE_DISPLAY_NAMES`; quyền dùng `USER_ROLE_LEVEL` và `assertRoleHierarchy` trong `src/lib/rbac.ts`.

### Chưa hỗ trợ / không có dữ liệu thật

- Không có `lastLogin`/`lastLoginAt` trong schema, nên không hiển thị “Đăng nhập gần nhất”.
- Không có bảng session/token revocation; session là cookie JWT ký (`src/lib/auth.ts`, `src/lib/session-token.ts`), nên reset mật khẩu hoặc khóa tài khoản không thể thu hồi tức thời mọi cookie đã phát hành.
- Không gửi email thực khi tạo/đặt lại mật khẩu; mật khẩu tạm chỉ hiển thị một lần trong UI.
- `getUsers()` và `getProjectsForAssignment()` là action có thật nhưng không được page hiện tại gọi; page tự query SSR để có cả bản ghi ngừng sử dụng.
- Không dùng mock runtime; các script QA có dữ liệu QA riêng và không chạy trong task này.

## 7. Bảng phân quyền

| Thao tác | UI | Server action / direct call |
| --- | --- | --- |
| Xem `/users` | Sidebar/route hạn chế | `canManageUsers` chỉ ADMIN, DIRECTOR, DEPUTY_DIRECTOR; page redirect người khác. |
| Tạo tài khoản | Role select chỉ các role actor được cấp | `requireHighLevelUser`, `VALID_ROLES`, `assertRoleHierarchy`. |
| Sửa thông tin/role | Ẩn khi actor không đủ cấp; tự đổi role bị khóa | `requireHighLevelUser`, hierarchy, self-role guard, last-admin guard. |
| Khóa/mở khóa | Không hiện cho chính actor hoặc user cao hơn | Server chặn self, hierarchy, admin active cuối cùng. |
| Ngừng sử dụng | Không hiện cho chính actor hoặc user cao hơn | Server soft-delete, hierarchy, admin active cuối cùng. |
| Khôi phục | Chỉ role đủ cấp | Server hierarchy, xung đột email/username/phone. |
| Đặt lại mật khẩu | Không hiện cho chính actor hoặc user cao hơn | Server hierarchy và self-reset guard. |
| Gán/gỡ Công trình | UI action trong bảng | `requireHighLevelUser`, hierarchy, project active validation; gỡ dùng soft deactivation của membership. |
| Gọi API trực tiếp | Không có API Users riêng | Server actions tự kiểm tra session/RBAC, không chỉ dựa UI. |

## 8. An toàn dữ liệu và nghiệp vụ

- Không thay đổi schema/migration: **Không**.
- Không chạy seed hoặc sửa dữ liệu hiện hữu: **Không**.
- User bị ngừng sử dụng vẫn giữ quan hệ báo cáo, phê duyệt, hợp đồng, thanh toán, tài liệu và audit log.
- Gán/gỡ công trình không xóa record `ProjectMember`; gỡ chỉ đặt `isActive: false`, `deletedAt`.
- Kiểm tra mới: phone duplicate với tài khoản active, project ID có tồn tại/active, role hợp lệ khi gọi action trực tiếp.
- Rủi ro còn lại: chưa có session revocation thật do kiến trúc hiện tại không lưu session server-side; cần thay đổi schema/kiến trúc riêng nếu muốn thu hồi token ngay lập tức.

## 9. File sửa trong task này

- `src/app/(dashboard)/users/page.tsx`
- `src/app/(dashboard)/users/actions.ts`
- `src/app/(dashboard)/users/error.tsx`
- `src/components/users/user-management-client.tsx`
- `src/components/ui/enterprise.tsx`
- `src/components/ui/interactive-kpi-card.tsx` (mới)
- `src/components/ui/page-error.tsx`
- `src/components/materials/materials-overview.tsx`
- `src/components/materials/materials-ui.tsx`

Các file ngôn ngữ đã thay đổi trước task này được giữ nguyên, không bị hoàn tác.

## 10. Kết quả kiểm thử

| Lệnh | Kết quả |
| --- | --- |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| ESLint phạm vi Users/UI liên quan | PASS, 0 warning/error |
| `npx tsx scripts/qa-users-rbac-static.ts` | PASS toàn bộ guard RBAC tĩnh |
| `npm run build` | PASS; còn 1 cảnh báo trace có sẵn từ `next.config.ts`/storage provider, không thuộc `/users` |
| UI browser/Playwright | Chưa chạy; không khởi động dev server và các test UI có mutation DB |

## 11. Hướng dẫn tự test

1. Đăng nhập bằng ADMIN, DIRECTOR và DEPUTY_DIRECTOR; vào `/users` và xác nhận trang render không crash.
2. Tìm theo tên/email/SĐT; thử từng lọc Vai trò, Công trình, Trạng thái; bấm header Người dùng/Vai trò/Trạng thái để sắp xếp.
3. Với hơn 10 kết quả, dùng nút Trước/Sau.
4. Bấm khoảng trống trên hàng desktop, Enter và Space: drawer phải mở. Bấm X, overlay và Esc: drawer phải đóng.
5. Bấm các icon gán/gỡ/sửa/khóa/đặt lại mật khẩu/ngừng dùng: drawer không được mở đồng thời.
6. Thử khóa hoặc ngừng sử dụng quản trị viên active cuối cùng; thử tự thay đổi vai trò hoặc tự đặt lại mật khẩu: action phải bị chặn.
7. Tạo/cập nhật bằng email, username hoặc số điện thoại trùng; thử gán một công trình đã ngừng sử dụng qua direct action: phải nhận lỗi tiếng Việt.
8. Tạm thời gây lỗi query ở môi trường development nếu cần: error boundary Users phải hiển thị thông điệp tiếng Việt; production không được hiển thị exception kỹ thuật.
