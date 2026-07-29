# Bàn giao Phase UI/UX Implementation — 2026-07-29

## Kết luận điều hành

| Hạng mục | Kết luận | Bằng chứng |
|---|---|---|
| UI/UX implementation | **PASS STATIC; DASHBOARD COMPOSITION PASS MANUAL RUNTIME; AUTOMATED BLOCKED** | Ảnh runtime thủ công sau sửa xác nhận PORTFOLIO và PROJECT composition. TypeScript, lint phạm vi thay đổi, build và unit test PASS; Playwright chưa đăng nhập được vì thiếu biến xác thực bắt buộc. |
| Data static integrity | **PASS** | Giữ nguyên view model semantic từ phase trước: `plannedProgressPercent`, `actualProgressPercent`, `variancePercent`, `actualProgressDataStatus`, `completenessCategory`, `approvedActualQuantity`, `totalDesignQuantity`, `lastActualProgressAt`. |
| Data runtime parity | **BLOCKED** | Theo `DASHBOARD_ACTUAL_PROGRESS_DATA_INTEGRITY_2026-07-29.md`: môi trường QA chưa có bộ dữ liệu đối chiếu runtime an toàn/đầy đủ. |
| Production GO/NO-GO | **NO-GO** | Chưa có bằng chứng browser authenticated cho overflow, overlap, resize, ảnh trước/sau và parity runtime. Không có lỗi UI nào được che bằng `overflow-x: hidden` hoặc dữ liệu giả. |

Phase này trực tiếp thay lớp Dashboard cũ, không đổi aggregate nghiệp vụ và không tái lập fallback kế hoạch thành thực tế.

## Lỗi trước khi sửa và nguyên nhân kỹ thuật

| Khu vực | Hiện trạng | Nguyên nhân gốc | Xử lý đã triển khai |
|---|---|---|---|
| Sức khỏe danh mục | Donut 110px, legend rút gọn, list chỉ theo một mode và tên/badge/% cùng hàng | Component cũ đổi qua lại giữa `PROGRESS`, `MIXED`, `DATA_COMPLETENESS`; dùng grid theo viewport thay vì kích thước card; cấu trúc một hàng chứa quá nhiều nội dung | Viết lại hoàn toàn `ExecutiveStatusChart`: donut chỉ là partition completeness, donut 160–184px theo container, legend đầy đủ, list ưu tiên tối đa 5 item theo dữ liệu thật. |
| Danh sách ưu tiên | Có thể chỉ hiện một project có actual trong khi nhiều project thiếu dữ liệu | List dựa vào mode chart và lọc theo variance/actual | Một hàm ưu tiên dùng chung xếp `MISSING_BOTH` → `MISSING_ACTUAL` → `MISSING_PLAN` → chậm tiến độ → cảnh báo dữ liệu → cần chú ý. |
| Tiến độ/rủi ro | Tên, badge và % bị ép trên cùng hàng; thiếu actual hiển thị không nhất quán | Thiếu `min-w-0`, tên một dòng, layout `justify-between`, bar cũ dùng giá trị thay thế | Tổ chức lại item thành tên (2 dòng), metadata/badge (dòng 2), thanh hoặc hướng dẫn semantic (dòng 3). |
| Khoảng trắng Dashboard | Hai card bị kéo cao theo grid row dù nội dung khác chiều cao | Grid stretch + card `h-full` | Grid dashboard dùng `align-items: start`; không tạo chiều cao giả. |
| Horizontal overflow | App shell/container không chặn flex child mở rộng đúng cách; header mobile đặt title absolute | Thiếu `min-width: 0`/`max-width: 100%` ở tầng app shell; title header tách khỏi layout flow | Chuẩn hóa app shell, page container, content card, drawer; title mobile tham gia flex layout thay vì absolute. Không thêm `body { overflow-x: hidden }`. |
| Tên dài | Chỉ truncate, tooltip đo resize bằng listener window; chưa có touch/click rõ ràng | Primitive chưa container-aware và không có ResizeObserver | `ProjectName` + `OverflowTooltipText` mới: clamp 1/2 dòng, ResizeObserver, hover, focus, click/touch, `aria-label`/`aria-describedby`. |
| Trang status | Bar tự diễn tả tiến độ khi `actual` null; tên trong bảng chưa dùng primitive chung | CSS bar cũ và badge chung chung | Dùng `ProgressBar` chỉ khi actual khác null, nhãn `actualProgressDataStatus` cụ thể, `ProjectName` trong bảng. |

## Layout sau sửa

```text
Dashboard progress-health container
├─ >= 68rem container width: 7/12 “Tình trạng tiến độ và rủi ro” + 5/12 “Sức khỏe danh mục”
└─ nhỏ hơn: stack dọc trước khi text bị bó hẹp

Sức khỏe danh mục
├─ donut completeness (160–184px theo container)
├─ legend: 1 cột / 2 cột khi card đủ rộng
└─ tối đa 5 project ưu tiên
   ├─ Dòng 1: ProjectName (tối đa 2 dòng)
   ├─ Dòng 2: mã + completeness badge + thời điểm actual gần nhất
   └─ Dòng 3: actual progress bar hoặc hướng dẫn bổ sung dữ liệu
```

Donut chỉ dùng bốn nhóm loại trừ lẫn nhau:

`COMPLETE` + `MISSING_PLAN` + `MISSING_ACTUAL` + `MISSING_BOTH` = tổng project trong scope.

Nó không trộn “đúng tiến độ/chậm tiến độ” vào cùng biểu đồ.

## Component và contract đã chuẩn hóa

| Component / primitive | Contract áp dụng |
|---|---|
| `ProjectName` | `min-width: 0`, clamp 1/2 dòng, luôn có full label bằng hover/focus/click khi bị cắt. |
| `OverflowTooltipText` | Đo theo `ResizeObserver`; tooltip portal không đổi layout; Escape và click ngoài để đóng. |
| `ProgressBar` | Chỉ nhận `number \| null`; `null` là unavailable, không render phần trăm 0 giả. |
| `StatusBadge` | `shrink-0`, `max-w-full`; không được đặt absolute cạnh tên DB dài. |
| `ResponsiveChartCard` | Header wrap action/title an toàn, content `min-w-0`. |
| `ChartLegend` | Label đầy đủ, count và tỷ lệ tách vùng `shrink-0`, grid tự wrap. |
| `DashboardEmptyState` | Tái sử dụng làm empty state khi scope Dashboard không có công trình; không dựng donut 0 giả. |
| `dashboard-project-presentation` | Một nơi quyết định nhãn actual-data, completeness presentation, required action, thứ tự ưu tiên. |
| `ContentCard`, `AppDrawer`, `ConfirmDialog`, `AppShell` | Củng cố `min-w-0`/`max-w-full`, modal title chừa chỗ nút đóng, drawer đúng viewport. |

## File thay đổi trong phase này

- `src/app/globals.css`
- `src/app/(dashboard)/dashboard/projects-status/projects-status-client-view.tsx`
- `src/components/dashboard/chart-legend.tsx`
- `src/components/dashboard/responsive-chart-card.tsx`
- `src/components/dashboard/dashboard-project-overview.tsx`
- `src/components/dashboard/executive/executive-dashboard.tsx`
- `src/components/dashboard/executive/executive-kpi-grid.tsx`
- `src/components/dashboard/executive/executive-project-progress.tsx`
- `src/components/dashboard/executive/executive-status-chart.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/global-project-context-switcher.tsx`
- `src/components/layout/header.tsx`
- `src/components/project/project-name.tsx`
- `src/components/ui/app-drawer.tsx`
- `src/components/ui/confirm-dialog.tsx`
- `src/components/ui/enterprise.tsx`
- `src/components/ui/overflow-tooltip-text.tsx`
- `src/components/ui/progress-bar.tsx`
- `src/components/ui/status-badge.tsx`
- `src/lib/dashboard/dashboard-project-presentation.ts`
- `src/lib/dashboard/tests/executive-status-chart-model.test.ts`
- `scripts/qa/dashboard-ui-integrity.spec.ts`

Các thay đổi Data-Integrity, report và migration đã có trong worktree trước phase này không được ghi nhận là thay đổi UI của phase này.

## Route và surface đã kiểm tra

Build đã enumerate thành công toàn bộ route ứng dụng: `/dashboard`, `/dashboard/actions`, `/dashboard/projects-status`, `/projects`, `/projects/[id]`, `/projects/[id]/field-progress`, `/projects/[id]/field-progress/daily`, `/projects/[id]/field-progress/summary`, `/documents`, `/documents/[projectId]`, `/reports`, `/reports/field`, `/reports/field/weekly-summary`, `/reports/weekly-inspection/*`, `/materials`, `/approvals`, `/tasks`, `/users`, `/settings`, `/supervision/weekly/*`, `/audit` và các print/API route liên quan.

Đã cập nhật trực tiếp Dashboard, projects-status, dashboard overview, app shell/header/switcher và primitives chung cho card/drawer/dialog/badge/progress. Các route còn lại nhận các guard layout chung qua `AppShell`, `ContentCard`, `PageHeader`/`FilterBar` và `AppDrawer`; kiểm chứng runtime từng route vẫn bị chặn bởi QA authentication.

## Regression test đã thêm

`scripts/qa/dashboard-ui-integrity.spec.ts` định nghĩa 14 Playwright tests:

- overflow có chẩn đoán selector/bounding box tại 11 viewport từ 360px đến 1920px;
- overlap giữa `ProjectName` và metadata/badge trong cả hai danh sách Dashboard;
- long-name fixture đúng yêu cầu: `Nhà văn phòng điều hành 5 tầng – Khu công nghiệp Từ Hiệp và hạ tầng kỹ thuật phụ trợ`;
- focus/click tooltip khi text bị clamp;
- resize donut desktop → mobile và console check width/height 0 hoặc ResizeObserver;
- capture evidence desktop/tablet/mobile.

Test long-name chỉ chạy khi fixture QA cô lập thực sự tồn tại — không tạo mock hoặc record production để làm test pass.

## Kết quả lệnh

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint` trên toàn bộ file phase UI | PASS, 0 error |
| `npx vitest run …dashboard…` | PASS — 4 files, 14 tests |
| Semantic guard scan | PASS — không thấy `actualProgressPercent ?? plannedProgressPercent`, `actualProgressPercent || plannedProgressPercent` hoặc field mơ hồ `progressPercent` trong presentation flow Dashboard |
| `npm run build` | PASS — Next.js 16.2.7; có 1 warning TurboPack/NFT đã tồn tại quanh `next.config.ts` và `local-storage-provider.ts`, không thuộc UI phase |
| `npx playwright test --list scripts/qa/dashboard-ui-integrity.spec.ts --config=playwright.config.ts` | PASS — Playwright nạp đủ 14 tests |
| `npx playwright test scripts/qa/dashboard-ui-integrity.spec.ts --config=playwright.config.ts` | BLOCKED tại global setup: `QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD are required. No default credentials are allowed.` |

## Viewport và ảnh trước/sau

Ma trận đã mã hóa trong Playwright: 1366×768, 1440×900, 1536×864, 1920×1080, 1024×768, 820×1180, 768×1024, 430×932, 390×844, 375×812, 360×800.

Ảnh runtime thủ công sau sửa do người dùng cung cấp đã xác nhận composition PORTFOLIO/PROJECT và phải được xem là bằng chứng nghiệm thu thủ công. Bộ ảnh tự động desktop/tablet/mobile vẫn **BLOCKED** vì Playwright bị chặn trước khi có session QA. Không dùng screenshot giả, DOM injection hoặc dữ liệu local để thay thế. Khi có credential QA read-only, test sẽ ghi ảnh vào `test-results/dashboard-ui-integrity/`.

## Hạng mục còn chặn và bước tiếp theo

1. Cung cấp `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD` và `PLAYWRIGHT_BASE_URL` của QA an toàn cho runner; không cần quyền mutation.
2. Chuẩn bị fixture QA có project tên dài yêu cầu và ít nhất các nhóm completeness thiếu cả hai / thiếu actual / thiếu plan / đủ dữ liệu.
3. Chạy 14 Playwright tests, kiểm tra console, lưu screenshots trước/sau ở cùng viewport và duyệt các bảng nghiệp vụ có scroll cục bộ.
4. Chỉ khi Dashboard = projects-status = field-progress summary được xác thực runtime, cập nhật Data Runtime Parity sang PASS và xem xét Production GO.
