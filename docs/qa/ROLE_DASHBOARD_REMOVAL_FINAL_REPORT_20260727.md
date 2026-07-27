# 1. Kết luận

**PASS** cho phạm vi loại bỏ Dashboard cấp trên khỏi tài khoản cấp dưới.

- Ba role cấp trên `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR` vẫn ở `/dashboard`.
- Sáu role cấp dưới không còn link `/dashboard` trong desktop sidebar hoặc mobile navigation.
- `/dashboard` và `/` điều phối server-side trước khi truy vấn dữ liệu Dashboard.
- Đăng nhập trả trực tiếp route làm việc theo role; callback ngoài quyền hoặc khác origin bị thay bằng route mặc định.
- Runtime Chromium trên database QA riêng biệt: 10/10 ca PASS, không có console error và không có response 5xx.
- Production build, TypeScript, Prisma validate/generate và lint nguồn đều PASS.

Không có component giao diện, query đầu ra, route hay permission của Executive Dashboard bị thiết kế lại.

# 2. Role inventory

| Role | Tên hiển thị | Nhóm | Dashboard | Default route |
|---|---|---|---|---|
| `ADMIN` | Quản trị viên hệ thống | Cấp trên | Có | `/dashboard` |
| `DIRECTOR` | Giám đốc điều hành | Cấp trên | Có | `/dashboard` |
| `DEPUTY_DIRECTOR` | Phó giám đốc | Cấp trên | Có | `/dashboard` |
| `SUPERVISION_HEAD` | Trưởng ban giám sát | Cấp dưới | Không | `/reports/weekly-inspection` |
| `CONSTRUCTION_SUPERVISOR` | Cán bộ giám sát công trình | Cấp dưới | Không | `/reports/weekly-inspection` |
| `CHIEF_COMMANDER` | Chỉ huy trưởng | Cấp dưới | Không | `/projects` |
| `MANAGER` | Quản lý | Cấp dưới | Không | `/projects` |
| `ENGINEER` | Kỹ sư | Cấp dưới | Không | `/tasks?mine=1` |
| `STAFF` | Nhân viên | Cấp dưới | Không | `/tasks?mine=1` |

# 3. Thay đổi với cấp trên

| Role | Dashboard UI | Route | Dữ liệu/query | Runtime regression |
|---|---|---|---|---|
| `ADMIN` | Không sửa | Giữ `/dashboard` | Không đổi đầu ra | PASS |
| `DIRECTOR` | Không sửa | Giữ `/dashboard` | Không đổi đầu ra | PASS |
| `DEPUTY_DIRECTOR` | Không sửa | Giữ `/dashboard` | Không đổi đầu ra | PASS |

Thay đổi duy nhất tại page Dashboard là guard server-side dành cho nhóm cấp dưới. Guard chạy trước project context và trước `getDashboardData()`. Lớp query có guard phòng thủ thứ hai; ba role cấp trên đi qua nguyên luồng cũ.

# 4. Thay đổi với cấp dưới

| Role | Menu cũ | Menu mới | Route cũ | Route mới |
|---|---|---|---|---|
| `SUPERVISION_HEAD` | Có Tổng quan | Báo cáo công trình đứng đầu, không có Tổng quan | `/dashboard` | `/reports/weekly-inspection` |
| `CONSTRUCTION_SUPERVISOR` | Có Tổng quan | Báo cáo công trình đứng đầu, không có Tổng quan | `/dashboard` | `/reports/weekly-inspection` |
| `CHIEF_COMMANDER` | Có Tổng quan | Công trình đứng đầu, không có Tổng quan | `/dashboard` | `/projects` |
| `MANAGER` | Có Tổng quan | Công trình đứng đầu, không có Tổng quan | `/dashboard` | `/projects` |
| `ENGINEER` | Có Tổng quan | Nhiệm vụ đứng đầu, không có Tổng quan | `/dashboard` | `/tasks?mine=1` |
| `STAFF` | Có Tổng quan | Nhiệm vụ đứng đầu, không có Tổng quan | `/dashboard` | `/tasks?mine=1` |

# 5. Cơ chế điều phối

- Đăng nhập: API xác thực server-side trả `redirectTo` từ registry role duy nhất. Client dùng `router.replace`, không đi qua Dashboard.
- `/dashboard`: Server Component gọi `requireAuth()`, rồi redirect role cấp dưới trước mọi truy vấn Dashboard.
- `/`: xác thực và điều phối thẳng theo role; không còn redirect cứng tới `/dashboard`.
- Callback URL: chỉ chấp nhận same-origin route được role cho phép. URL ngoài origin, `/dashboard` của role cấp dưới hoặc route ngoài quyền đều rơi về default route.
- Proxy: lưu cả pathname và query string trong `next`; session đang mở `/login` đi qua `/` để được điều phối theo role, không đi qua Dashboard.
- Direct API/query: `getDashboardData()` gọi `assertCanAccessExecutiveDashboard()` trước khi đọc dữ liệu.
- Project scope: trang task loại bỏ `projectId` ngoài scope; runtime STAFF cố chèn Project A nhưng chỉ nhận dữ liệu Project B được giao.

# 6. File đã sửa trong phạm vi này

| File | Thay đổi | Lý do | Rủi ro |
|---|---|---|---|
| `src/lib/roles/role-workspace-policy.ts` | Registry nhóm role, default route, default navigation, route/callback policy | Một nguồn sự thật cho routing | Thấp; exhaustiveness được TypeScript kiểm tra |
| `src/lib/navigation-permissions.ts` | Navigation dùng role policy | Không rải logic role | Thấp |
| `src/app/(dashboard)/dashboard/page.tsx` | Redirect cấp dưới trước data query | Chặn direct URL an toàn | Thấp; cấp trên giữ nhánh cũ |
| `src/lib/dashboard/dashboard-queries.ts` | Guard tại DAL | Chặn gọi trực tiếp | Thấp |
| `src/app/api/auth/login/route.ts` | Trả `redirectTo` theo role/callback | Landing đúng ngay sau login | Thấp |
| `src/app/login/page.tsx` | Gửi `next`, dùng `replace` | Không lưu Dashboard vào history | Thấp |
| `src/app/page.tsx` | Root route theo role | Không dùng Dashboard trung gian | Thấp |
| `src/proxy.ts` | Giữ query callback; session `/login` về root dispatcher | Không mất context, không qua Dashboard | Thấp |
| `src/components/layout/sidebar.tsx` | Ẩn Dashboard và đưa module chính lên đầu cho cấp dưới | Desktop navigation đúng vai trò | Thấp; cấp trên trả nguyên thứ tự cũ |
| `src/components/layout/mobile-bottom-nav.tsx` | Lọc và sắp navigation theo role | Mobile navigation đúng vai trò | Thấp; cấp trên dùng danh sách cũ |
| `src/components/layout/header.tsx` | Home link theo role, thêm route Tasks | Không quay về Dashboard sai quyền | Thấp |
| `src/app/(dashboard)/reports/page.tsx` | Fallback theo role | Không đẩy cấp dưới về Dashboard | Thấp |
| `src/app/(dashboard)/reports/weekly-inspection/page.tsx` | Truyền quyền tạo thật | UI action đúng quyền | Thấp |
| `src/app/(dashboard)/tasks/task-workspace.tsx` | Responsive/empty-state workspace | Landing tác nghiệp không tràn màn hình | Thấp |
| `src/lib/roles/role-workspace-policy.test.ts` | Unit regression cho 9 role/callback | Bảo vệ policy | Không có runtime risk |
| `scripts/qa/role-dashboard-removal.spec.ts` | Authenticated Playwright 9 role, root/dashboard/menu/scope/console/5xx | Bằng chứng runtime | Không có production risk |
| `playwright.role-dashboard.config.ts` | Config Chromium QA riêng | Lặp lại test | Không có production risk |

# 7. Test runtime

Database: `construction_erp_v2_qa_e2e_20260723`, được kiểm tra bởi `assert-safe-qa-database.ts`.

| Role | Tài khoản QA | Sau đăng nhập | `/dashboard` | Menu | Console | Network | Kết quả |
|---|---|---|---|---|---|---|---|
| `ADMIN` | fixture `ADMIN` | `/dashboard` | Ở lại | Có Tổng quan | 0 | 0 response 5xx | PASS |
| `DIRECTOR` | fixture `REVIEWER` | `/dashboard` | Ở lại | Có Tổng quan | 0 | 0 response 5xx | PASS |
| `DEPUTY_DIRECTOR` | fixture `DEPUTY_DIRECTOR` | `/dashboard` | Ở lại | Có Tổng quan | 0 | 0 response 5xx | PASS |
| `SUPERVISION_HEAD` | fixture `SUPERVISION_HEAD` | `/reports/weekly-inspection` | Redirect đúng | Không Tổng quan | 0 | 0 response 5xx | PASS |
| `CONSTRUCTION_SUPERVISOR` | fixture `OFFICER_A` | `/reports/weekly-inspection` | Redirect đúng | Không Tổng quan | 0 | 0 response 5xx | PASS |
| `CHIEF_COMMANDER` | fixture `CHIEF_COMMANDER` | `/projects` | Redirect đúng | Không Tổng quan | 0 | 0 response 5xx | PASS |
| `MANAGER` | fixture `MANAGER` | `/projects` | Redirect đúng | Không Tổng quan | 0 | 0 response 5xx | PASS |
| `ENGINEER` | fixture `ENGINEER` | `/tasks?mine=1` | Redirect đúng | Không Tổng quan | 0 | 0 response 5xx | PASS |
| `STAFF` | fixture `STAFF` | `/tasks?mine=1` | Redirect đúng | Không Tổng quan | 0 | 0 response 5xx | PASS |

Ca scope riêng: STAFF truyền `projectId` của Project A không được giao; trang không hiển thị Project A và vẫn hiển thị Project B đúng scope — PASS.

# 8. Test tự động

| Command | Exit | Pass | Fail | Ghi chú |
|---|---:|---:|---:|---|
| `npx prisma validate` | 0 | 1 | 0 | Schema valid |
| `npx prisma generate` | 0 | 1 | 0 | Prisma Client 7.8.0 |
| `npx tsc --noEmit` | 0 | 1 | 0 | 0 TypeScript errors |
| `npx vitest run src/lib/roles/role-workspace-policy.test.ts` | 0 | 11 | 0 | Unit policy |
| `npm run lint -- src` | 0 | 1 | 0 | 0 errors, 197 pre-existing warnings |
| `npx eslint --no-ignore scripts/qa/role-dashboard-removal.spec.ts` | 0 | 1 | 0 | QA spec lint |
| `npx playwright test --config=playwright.role-dashboard.config.ts` | 0 | 10 | 0 | 9 role + project injection; console/5xx asserted |
| `npm run build` | 0 | 1 | 0 | Next.js 16.2.7 production build |

`package.json` không có script `test` hoặc `typecheck`. Một lần chạy thăm dò `npx vitest run` toàn repository không được tính là gate vì nó thu nhầm Playwright specs và các file dùng `node:test`; nó cũng lộ một assertion cũ không thuộc scope tại `src/lib/document-folders.test.ts` (`"ok 1"` so với `"ok_1"`).

# 9. Screenshot

Baseline Dashboard cấp trên:

- `artifacts/role-dashboard-removal/baseline/admin-dashboard-1366x768.png`
- `artifacts/role-dashboard-removal/baseline/admin-dashboard-1920x1080.png`
- `artifacts/role-dashboard-removal/baseline/director-dashboard-1366x768.png`
- `artifacts/role-dashboard-removal/baseline/director-dashboard-1920x1080.png`
- `artifacts/role-dashboard-removal/baseline/deputy-director-dashboard-1366x768.png`
- `artifacts/role-dashboard-removal/baseline/deputy-director-dashboard-1920x1080.png`

Sau thay đổi:

- `artifacts/role-dashboard-removal/after/admin-dashboard-1366x768.png`
- `artifacts/role-dashboard-removal/after/admin-dashboard-1920x1080.png`
- `artifacts/role-dashboard-removal/after/director-dashboard-1366x768.png`
- `artifacts/role-dashboard-removal/after/director-dashboard-1920x1080.png`
- `artifacts/role-dashboard-removal/after/deputy_director-dashboard-1366x768.png`
- `artifacts/role-dashboard-removal/after/deputy_director-dashboard-1920x1080.png`
- Landing của sáu role cấp dưới và responsive STAFF nằm trong cùng thư mục `after/`.

# 10. Vấn đề còn lại

- `npm run lint` không truyền target sẽ quét nhiều thư mục build tùy biến như `.next-qa` và `.next-construction-supervisor-final`; lint nguồn thực tế `npm run lint -- src` PASS.
- Repository không định nghĩa unit/integration test script tổng hợp; dùng `npx vitest run` mù quáng sẽ trộn Vitest, Node test runner và Playwright.
- Có 197 lint warnings nền trong `src`, không có lint error.
- Production build có một cảnh báo NFT trace từ `src/lib/storage/local-storage-provider.ts`, không liên quan role routing và không làm build fail.
- Không reset database, không tạo migration, không đổi role của tài khoản thật. Runtime chỉ dùng database QA riêng.
