# Global UI Interaction And Project Context Final Report

## 1. Kết luận

**PASS CÓ ĐIỀU KIỆN.**

Điều kiện còn lại: `npm run lint` toàn repo vẫn fail vì nợ lint tồn tại sẵn trong nhiều script/audit và một vài file ngoài phạm vi sửa. Phần TypeScript, production build và static QA guard cho lỗi UAT này đã pass. Tôi không chạy `npm run dev` và không kết luận dựa riêng vào build.

## 2. Danh sách file đã sửa trong phạm vi prompt

- `docs/qa/GLOBAL_UI_INTERACTION_AND_PROJECT_CONTEXT_PRE_FIX_ANALYSIS.md`
- `docs/qa/GLOBAL_UI_INTERACTION_AND_PROJECT_CONTEXT_FINAL_REPORT.md`
- `scripts/qa-global-ui-interaction-project-context-static.js`
- `src/hooks/use-body-scroll-lock.ts`
- `src/lib/project-status.ts`
- `src/lib/project-context.ts`
- `src/lib/dashboard/dashboard-queries.ts`
- `src/components/layout/global-search-command.tsx`
- `src/components/layout/global-project-context-switcher.tsx`
- `src/components/dashboard/dashboard-project-overview.tsx`
- `src/components/dashboard/executive/executive-kpi-grid.tsx`
- `src/app/(dashboard)/projects/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/reports/actions.ts`
- `src/app/(dashboard)/reports/page.tsx`
- `src/components/reports/types.ts`
- `src/components/reports/reports-workspace.tsx`
- `src/components/reports/report-detail-drawer.tsx`
- `src/app/(dashboard)/materials/page.tsx`
- `src/app/(dashboard)/materials/actions.ts`
- `src/components/materials/materials-workspace.tsx`
- `src/components/contracts/contracts-workspace.tsx`
- `src/components/contracts/contract-detail-drawer.tsx`
- `src/app/(dashboard)/accounting/components/accounting-workspace.tsx`
- `src/app/(dashboard)/accounting/components/payment-request-detail-drawer.tsx`
- `src/app/(dashboard)/approvals/page.tsx`
- `src/app/(dashboard)/approvals/components/approval-center-client.tsx`
- `src/app/(dashboard)/documents/page.tsx`
- `src/components/documents/document-viewer.tsx`

## 3. Lỗi cũ từ ảnh UAT đã xử lý

- Search UI cũ ở Dashboard: root cause là search state nằm trong shared header/layout nhưng không reset theo `pathname/searchParams`, và Reports còn tự đọc URL bằng `window.location.search`.
- Đã sửa `GlobalSearchCommand` để đóng/reset khi route/search param đổi, auto focus input khi mở, đóng bằng outside click, ESC, click kết quả, và đổi công trình.
- Đã thêm static guard kiểm tra không còn text cũ `Đang sử dụng hệ thống tìm kiếm`, `Nhập từ khóa để tìm kiếm`, không còn duplicate search official path, và search phải dùng route lifecycle hooks.

## 4. Kiểm tra riêng Dashboard search sau F5 và route change

- `Header` vẫn chỉ dùng một `GlobalSearchCommand`.
- `GlobalSearchCommand` dùng `usePathname()` và `useSearchParams()` để đóng/reset search khi F5 hydrate lại, chuyển Dashboard -> Reports/Documents/Materials, hoặc đổi query param.
- Search input auto focus khi mở; debounce được clear khi đóng; overlay/body/focus không bị giữ bởi state cũ.
- Static QA guard: PASS.

## 5. Kiểm tra riêng project selector toàn hệ thống

- Global project selector cập nhật cookie + URL `projectId`, đóng dropdown khi route/query đổi, hỗ trợ ESC.
- Dashboard lấy `selectedProjectId` từ `getGlobalProjectContext`.
- Reports dùng `useSearchParams` thay vì `window.location.search`, giữ `projectId` khi mở/đóng `reportId`.
- Materials bỏ fallback `projects[0]`; chưa có project thì yêu cầu chọn, không tự lấy công trình đầu.
- Contracts và Accounting đồng bộ filter project vào URL/cookie và KPI tính theo dữ liệu đã lọc.
- Approvals nhận `initialProjectId` từ global context, cập nhật URL/cookie khi đổi project, KPI tính theo danh sách đã lọc.
- Documents `/documents?projectId=...` hoặc cookie context sẽ redirect vào `/documents/[projectId]`.

## 6. Kiểm tra riêng status "công tác chuẩn bị"

- Tạo mapping duy nhất tại `src/lib/project-status.ts`.
- `PLANNING` hiển thị là `Công tác chuẩn bị`, không còn fallback thành `Đang thi công`.
- Status chưa nhận diện hiển thị `Chưa xác định`.
- Đã áp dụng cho Dashboard overview, Dashboard executive KPI, Project list, Project detail, Report detail, Project selector và project context warning.

## 7. Kiểm tra riêng drawer/dialog click outside/ESC/close button

- Reports drawer: giữ `projectId` và filter, xóa riêng `reportId` khi đóng; có outside click, ESC, close button và body scroll lock.
- Contract detail drawer: thêm ESC và `useBodyScrollLock`.
- Payment request detail drawer: thêm outside click, ESC và `useBodyScrollLock`.
- Approval detail drawer: thêm outside click, ESC và `useBodyScrollLock`.
- Document viewer: đã có outside click/ESC/close; thêm `useBodyScrollLock`.
- Các create/edit/delete dialog hiện hữu không bị đổi submit/save/delete flow.

## 8. Lệnh test đã chạy và kết quả

- `node scripts\qa-global-ui-interaction-project-context-static.js`: PASS.
- `rg -n -F "Đang sử dụng hệ thống tìm kiếm" src`: không có kết quả.
- `rg -n -F "Nhập từ khóa để tìm kiếm" src`: không có kết quả.
- `rg -n -F "new URLSearchParams(window.location.search)" src\components\reports src\components\layout`: không có kết quả.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS. Có warning Turbopack NFT trace từ `src/lib/storage/local-storage-provider.ts` qua API report attachments, không chặn build.
- `npx eslint <các file đã sửa chính>`: 0 errors, còn warnings không chặn.
- `npm run lint`: FAIL toàn repo với 382 problems, 108 errors, 274 warnings. Nguyên nhân thật là nợ lint repo-wide, chủ yếu các script/audit CommonJS cũ bị rule `@typescript-eslint/no-require-imports`, một số `@ts-ignore`, `prefer-const`, và unused vars. Lỗi này không xuất phát từ TypeScript/build của thay đổi hiện tại.

## 9. Các điểm cần UAT thủ công trên browser

- F5 tại Dashboard rồi mở search: xác nhận command palette mới, không thấy text cũ.
- Dashboard -> Reports -> Documents -> Materials -> Dashboard: mở search ở từng màn và xác nhận UI đồng nhất.
- Chọn công trình trạng thái `Công tác chuẩn bị`: kiểm tra Dashboard card, Project selector, Project list/detail, Report detail đều không hiển thị `Đang thi công`.
- Đổi công trình ở topbar: kiểm Dashboard, Reports, Documents, Materials, Contracts, Payments/Accounting, Approvals đều theo cùng project.
- Reports: mở `/reports?projectId=...&reportId=...&status=ISSUE`, đóng drawer bằng outside/ESC/X/Đóng và xác nhận URL chỉ xóa `reportId`, giữ project/filter hợp lý.
- Documents, Contracts, Accounting, Approvals: bấm item mở chi tiết; outside/ESC/X/Đóng đều đóng, không kẹt overlay hoặc scroll.
