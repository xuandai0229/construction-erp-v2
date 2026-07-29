# Báo cáo audit UI/UX toàn hệ thống - đợt ban đầu

Ngày audit: 2026-07-29  
Phạm vi: toàn bộ route giao diện trong `src/app`, component trong `src/components`, styles trong `src/app/globals.css` và `src/components/layout/sidebar.module.css`, cùng các query/model dashboard liên quan.  
Phương pháp: static source audit. Chưa thay đổi UI, dữ liệu, query hay CSS trong đợt này.

## Kết luận chặn trước khi sửa giao diện

`Sức khỏe danh mục công trình` có lỗi dữ liệu mức P0. `src/lib/dashboard/dashboard-queries.ts` hiện gán `actualProgressPercent` luôn là `null` (dòng 464), rồi dùng `plannedProgressPercent` làm `progressPercent` (dòng 495). `ExecutiveStatusChart` lại ưu tiên `progressPercent` khi gán giá trị hiển thị là thực tế (dòng 109), và ghi nhãn `TT` trong danh sách. Vì vậy không được chỉ thiết kế lại biểu đồ trước khi thay query/model để lấy tiến độ thực tế từ nguồn dữ liệu nghiệp vụ đã tồn tại.

Nguồn dữ liệu thật có sẵn để điều tra và tái sử dụng là `FieldProgressItem.designQuantity` và `FieldProgressEntry.quantity` với trạng thái phê duyệt, đồng thời các trang `field-progress/summary` đã có logic rollup. Không được tạo dữ liệu demo hoặc suy diễn phần trăm thực tế từ kế hoạch.

## Danh sách route UI đã kiểm tra

| Nhóm | Route |
|---|---|
| Public | `/`, `/login`, `/supervision-export/[id]` |
| Dashboard | `/dashboard`, `/dashboard/actions`, `/dashboard/projects-status` |
| Công trình | `/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`, `/projects/[id]/material-requests`, `/projects/[id]/field-progress`, `/projects/[id]/field-progress/summary`, `/projects/[id]/field-progress/daily` |
| Tài liệu | `/documents`, `/documents/[projectId]` |
| Báo cáo | `/reports`, `/reports/weekly-inspection`, `/reports/weekly-inspection/[id]/edit`, `/reports/weekly-inspection/[id]/preview`, `/reports/field`, `/reports/field/weekly-summary`, `/print/reports/[reportId]`, `/print/reports/field/weekly-summary` |
| Giám sát tuần | `/supervision/weekly`, `/supervision/weekly/[id]`, `/supervision/weekly/[id]/edit`, `/supervision/weekly/[id]/preview` |
| Điều hành và quản trị | `/approvals`, `/materials`, `/tasks`, `/audit`, `/users`, `/settings` |

Các API route được phân biệt với UI route và không tính là màn hình audit. Chúng vẫn phải được kiểm tra lại ở lớp dữ liệu khi sửa dashboard.

## Bản đồ biểu đồ hiện có

Không phát hiện Recharts, Chart.js, ECharts, ApexCharts, Nivo hay Victory trong dependencies/source. Biểu đồ đang là SVG và thanh CSS tự dựng.

| Vị trí | Component | Kiểu hiện tại | Dữ liệu | Đánh giá |
|---|---|---|---|---|
| `/dashboard` | `executive/executive-status-chart.tsx` | SVG donut 110 x 110 + thanh tiến độ dạng danh sách | `DashboardData.projectOverview` | P0: nhãn tiến độ thực tế có thể đang nhận số kế hoạch; P1: chart cố định 110 px, legend bị rút gọn. |
| `/dashboard` | `executive/executive-project-progress.tsx` | KPI và thanh tiến độ/rủi ro | `DashboardData` | P1: phải đồng bộ cùng một nguồn progress với donut, danh sách đầy đủ và trang chi tiết. |
| `/dashboard/projects-status` | `projects-status-client-view.tsx` | Bảng tiến độ/kế hoạch | `DashboardProjectOverview[]` | P0: đang hiển thị `progressPercent` dưới nhãn “Tiến độ thực tế / Kế hoạch”. |
| `/projects/[id]/field-progress/*` | `summary-*`, `master-table`, `daily-entry-table` | Bảng và rollup khối lượng | `FieldProgressItem`, `FieldProgressEntry` | Nguồn nghiệp vụ thật cần được chuẩn hóa thành aggregate dashboard; bảng có scroll cục bộ hợp lệ nhưng cần chiến lược mobile rõ ràng. |

## Audit rủi ro ban đầu

| Route | Component | Lỗi/rủi ro | Nguyên nhân gốc | Mức độ | Hướng sửa ở lớp gốc |
|---|---|---|---|---|---|
| `/dashboard` | `executive-status-chart.tsx` | “TT” có thể bằng kế hoạch, các mode và chú thích không phản ánh dữ liệu thực tế | Query dashboard luôn đặt thực tế là `null`, sau đó fallback kế hoạch sang `progressPercent` | P0 | Tạo aggregate dashboard từ field-progress đã phê duyệt; giữ `planned`, `actual`, `variance`, `completeness` tách biệt tuyệt đối và kiểm thử invariant tổng nhóm. |
| `/dashboard`, `/dashboard/projects-status` | `dashboard-queries.ts`, `projects-status-client-view.tsx` | Số dashboard và trang đầy đủ có thể cùng sai theo một fallback, không thể coi là đối chiếu hợp lệ | Cùng dùng `DashboardProjectOverview.progressPercent` với ngữ nghĩa lẫn kế hoạch/thực tế | P0 | Thay view model có trường semantic rõ ràng, dùng chung một query scope/filter cho dashboard, “Xem đầy đủ” và chi tiết. |
| `/dashboard` | `executive-status-chart.tsx` | Tên công trình chỉ một dòng; hai badge `shrink-0` cạnh tên làm phần tên quá hẹp ở tablet/laptop | Row gồm tên, badge trạng thái và % cùng hàng | P1 | Chuẩn hóa `ProjectName`: tiêu đề tối đa 2 dòng, mã/trạng thái/% ở dòng metadata có wrap; tooltip đầy đủ bằng hover, focus và touch. |
| `/dashboard` | `executive-status-chart.tsx` | Legend bị cắt/rút gọn như “Thiếu K/Hoạch”, “Thiếu T/Tế”, “Chưa đủ D/L” | Dùng `truncate` và thuật ngữ viết tắt để ép vào grid 2 cột | P1 | `ChartLegend` dùng label đầy đủ, số đếm tách cột, grid 1-2 cột tùy container, không overlay chart. |
| `/dashboard` | `executive-status-chart.tsx` | Donut nhỏ và thừa khoảng trắng; không resize theo container | SVG hard-code `width=110 height=110`, layout fixed col 5/7 tại `sm` | P1 | `ResponsiveChartCard` dùng container-aware layout: 35-40% chart, 60-65% list ở desktop lớn; stack khi danh sách không đủ chiều rộng; kích thước SVG theo container có giới hạn đọc được. |
| `/dashboard` | `executive-status-chart.tsx` | Nhóm donut chỉ an toàn nếu category độc quyền, nhưng component tính theo enum lẫn điều kiện nullable | Logic đếm lặp predicate `dataCompleteness` và nullability, chưa có invariant `sum == total` | P1 | Query trả về đúng một `completenessCategory` cho mỗi project; unit test partition/exhaustive, donut chỉ dùng khi tổng bằng total. |
| `/dashboard` | `executive-status-chart.tsx` | Tooltip SVG chỉ mouse hover, text tooltip state nằm trong flow và có thể làm layout nhảy | `onMouseEnter/onMouseLeave` trên `circle`, tooltip render trong card | P2 | Tooltip chart có focus/touch semantics, vị trí overlay an toàn; nội dung quan trọng vẫn nằm trong legend. |
| Toàn hệ thống | `globals.css`, `enterprise.tsx`, `status-badge.tsx`, `overflow-tooltip-text.tsx` | Có design primitives nhưng chưa đủ contract chung về long text/badge/row layout | `StatusBadge` đã nowrap; `OverflowTooltipText` có focus/touch nhưng chỉ dùng rải rác; KPI label còn nowrap | P1 | Chuẩn hóa `ProjectName`, `OverflowTooltip`, `StatusBadge`, `ProgressBar`, `ResponsiveDataList`, `ResponsiveChartCard`; cập nhật caller thay vì CSS vá từng màn. |
| `/projects`, `/reports`, `/materials`, `/approvals`, `/documents`, `/supervision/weekly` | Bảng/list và filter toolbar | Nhiều `min-w`, `whitespace-nowrap`, table fixed và toolbar ngang; một phần là đúng cho bảng, nhưng chưa có rule phân biệt container scroll với body scroll | Quy ước table mobile không thống nhất giữa module; một số filter bắt đầu scroll từ form/page | P1 | Chuẩn hóa `ResponsiveDataList`: mobile card/list, desktop table; chỉ table wrapper được `overflow-x-auto`; filter wrap/stack trước khi scroll. |
| `/projects/[id]/field-progress/*`, report/supervision tables | `table-styles.ts`, `result-data-tables.tsx`, report dialogs | Cột có min-width 700-980 px, table rất rộng | Nghiệp vụ nhiều cột, nhưng cần verify scroll ở đúng wrapper, sticky header và drawer/modal | P1 | Giữ scroll cục bộ của bảng, thêm test boundary; cung cấp mobile summary thay cho ép toàn bộ bảng vào viewport. |
| `/documents`, `/projects`, `/reports`, `/projects/[id]/field-progress/summary` | Filter bars | `overflow-x-auto` ở form/filter cùng `min-w-[150px]` đến `min-w-[220px]` | Thiếu AdaptiveGrid/filter primitive; overflow được giải quyết từng màn | P1 | `AdaptiveGrid`/filter layout chuẩn: 1 cột mobile, 2+ cột tùy breakpoint, action wrap; không dùng body scroll hoặc `overflow-hidden` để che. |
| `/reports` dialogs, `/users`, drawer/modal toàn hệ thống | `work-picker`, user dialogs, `AppDrawer`, `ConfirmDialog` | Một số dialog có viewport cap/scroll tốt; các dialog có table `min-w-[800px]` hoặc body fixed-height cần test overflow/focus | Không có contract modal content/body/footer dùng chung hoàn chỉnh | P2 | Chuẩn hóa dialog shell: `max-h: 100dvh`, scroll thân modal, footer sticky, table scroll cục bộ, focus trap và viewport tests. |
| Toàn hệ thống | `app-shell`, layout/header/sidebar | Chưa có evidence runtime toàn bộ ma trận desktop/tablet/mobile và sidebar toggle | Test hiện có không bao phủ đủ route, viewport và role | P1 | Chỉ sửa container mechanics (`minmax(0,1fr)`, `min-w-0`, padding/breakpoint tokens); thêm Playwright role/viewport matrix trước khi kết luận. |

## Các vị trí có nguy cơ overflow đã lập chỉ mục

1. Bảng nghiệp vụ có min-width rõ ràng: field-progress (760 px), reports (700-980 px), supervision results (800-900 px), work picker (800 px), approvals (500-800 px), reports workspace/details (900-980 px). Đây là scroll nghiệp vụ hợp lệ nếu wrapper là tầng scroll duy nhất.
2. Filter/toolbars dùng `overflow-x-auto` cùng input tối thiểu: documents, projects, field-progress summary, reports workspace/work picker và weekly editor. Các điểm này phải ưu tiên wrap/stack ở màn hẹp.
3. Text/badge nowrap: `StatusBadge`, enterprise KPI label, project/report/material/approval tables, tab bars và action buttons. Không phải mọi `nowrap` là lỗi, nhưng text từ database không được nằm cùng một row với badge/action mà không có `min-w-0` và chiến lược wrap/ellipsis.
4. Positioning: app drawer, dialogs, notification/dropdown, report image/gallery overlay và login background dùng `fixed`/`absolute`. Audit runtime phải kiểm tra clipping, z-index và keyboard focus, không được thêm `overflow-hidden` ở parent để che popover.

## Component dùng chung hiện có và hướng chuẩn hóa

| Nhu cầu | Hiện có | Hành động dự kiến |
|---|---|---|
| Page container/header/section | `app-page-container`, `PageHeader`, `PageHeading`, `SectionHeader` | Mở rộng contract responsive, không tạo bản sao. |
| Badge | `StatusBadge` | Giữ variant/tokens, bổ sung usage contract cho badge cạnh long text. |
| Tooltip long text | `OverflowTooltipText` | Chỉnh để dùng được với title 2 dòng, keyboard/touch, aria description và ResizeObserver. |
| Table wrapper | `EnterpriseTable` | Tách responsive list/mobile renderer khỏi horizontal table wrapper. |
| Drawer/dialog | `AppDrawer`, `ConfirmDialog` | Chuẩn hóa scrolling/focus cho các modal lớn còn lại. |
| Responsive chart/legend/progress/project name | Chưa có primitive chuyên biệt | Tạo tối thiểu `ResponsiveChartCard`, `ChartLegend`, `ProjectName`, `ProgressBar` sau khi chốt model dữ liệu. |

## Khoảng trống test hiện tại

Playwright hiện đã có overflow, screenshot và console checks, nhưng chưa đáp ứng tiêu chí nghiệm thu toàn hệ thống:

- `full-app-mobile-overflow.spec.ts` mới kiểm tra một tập route và viewport mobile, chưa có desktop/tablet trong yêu cầu.
- `full-system-premium-ui-visual.spec.ts` có screenshot nhiều viewport nhưng mới đi qua 8 route chính và không assert failure khi overflow.
- Chưa có test overlap bounding boxes giữa tên, badge, action và icon.
- Chưa có fixture long project name dùng cùng query thật hoặc fixture database cách ly.
- Chưa có test resize chart khi sidebar open/close, filter project thay đổi, F5/route transition và role matrix đầy đủ.
- Test `executive-status-chart-model.test.ts` có mock view-model. Nó cần bổ sung invariant từ query thật/fixture thật để không che việc `actualProgressPercent` đang null ở runtime.

## Thứ tự thực hiện sau audit

1. Sửa model/query tiến độ thật và test parity, trước UI chart.
2. Chuẩn hóa primitives container/text/badge/tooltip/progress/list.
3. Làm lại portfolio health theo model đã xác minh và layout container-aware.
4. Refactor table/filter/modal primitives theo module, ưu tiên thay đổi từ component gốc.
5. Viết Playwright regression matrix, chạy typecheck/build/lint/role/runtime/visual evidence.

## Trạng thái audit

**NO-GO cho việc kết luận hoàn thành UI/UX ở thời điểm này.** Không được bắt đầu “làm đẹp” biểu đồ dashboard trước khi sửa nguồn `actualProgressPercent`, vì làm vậy sẽ tạo giao diện rõ ràng hơn nhưng dữ liệu nghiệp vụ vẫn sai.
