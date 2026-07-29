# Dashboard Context & Information Architecture Fix — 2026-07-29

## 1. Kết luận điều hành

Ảnh runtime đầu vào là bằng chứng hợp lệ rằng composition cũ **FAIL** về kiến trúc thông tin: hai card dùng cùng project, cùng thứ tự, cùng lý do và cùng CTA; khi chọn một project vẫn dựng Dashboard danh mục một phần tử.

Phase này đã thay đổi code ở cấp context, selector và composition, không chỉ đổi title/CSS:

| Hạng mục | Kết luận sau triển khai | Bằng chứng |
|---|---|---|
| Code checks | **PASS** | TypeScript, lint phạm vi thay đổi, unit test và build PASS. |
| Data static integrity | **PASS** | Không thay aggregate; không có fallback actual → planned; semantic fields được giữ nguyên. |
| Portfolio Dashboard | **PASS STATIC / RUNTIME UNVERIFIED** | Có composition và selector riêng; cần phiên QA authenticated để nghiệm thu hình ảnh/bounding box. |
| Project Dashboard | **PASS STATIC / RUNTIME UNVERIFIED** | Không render KPI/donut/list danh mục; cần phiên QA authenticated để nghiệm thu runtime. |
| Automated runtime | **BLOCKED** | Playwright dừng ở global setup do thiếu `QA_ADMIN_EMAIL` và `QA_ADMIN_PASSWORD`; in-app browser cũng bị chuyển tới `/login?reason=session_expired`. |
| Production | **NO-GO** | Chưa có screenshot sau sửa và chưa chạy được context/layout/overflow test trên dữ liệu QA thật. |

Không ghi nhận UI PASS khi runtime chưa được xác minh.

## 2. Root cause của hai danh sách trùng nhau

Composition cũ đặt cả KPI và list trong `ExecutiveProjectProgress`, đồng thời đặt donut, legend và list trong `ExecutiveStatusChart`. Hai component đều:

1. gọi `getProjectPriorityScore(project)`;
2. sắp xếp bằng cùng score;
3. gọi `getProjectRequiredAction(project)`;
4. cắt cùng tối đa 5 item.

Score cũ ưu tiên `MISSING_BOTH → MISSING_ACTUAL → MISSING_PLAN → DELAYED → warning → AT_RISK`, nên dữ liệu completeness lấn át dữ liệu vận hành. Việc hai danh sách giống hệt nhau là hệ quả tất định, không phải lỗi spacing.

View model Dashboard còn làm mất `projectId`, `reason`, `targetType` và `targetId` từ `executive-action-service`, khiến UI không thể dùng lý do vận hành thật và phải suy diễn lại từ completeness.

## 3. Selector cũ và selector mới

| Trước | Sau |
|---|---|
| Một `getProjectPriorityScore` dùng chung | `selectOperationalInterventionProjects(...)` chỉ xếp hạng bằng variance hợp lệ hoặc issue/task/material/risk thật |
| Một `getProjectRequiredAction` dùng chung | Mỗi selector tự trả `reason`, `badgeLabel`, `ctaLabel`, `href` theo domain của card |
| Missing data tự trở thành “rủi ro” | Missing data không tạo operational candidate nếu không có bằng chứng vận hành độc lập |
| `visibleItems.length` được dùng như tổng | Selector trả riêng `totalCount`, `visibleCount`, `maxVisible` |
| Dashboard action mapping bỏ mất đích | `DashboardActionItem` giữ `projectId`, `reason`, `targetType`, `targetId` và href theo loại nguồn |

Selector mới:

- `selectOperationalInterventionProjects`: actual thấp hơn planned, variance âm, `DELAYED`/`AT_RISK`, issue hiện trường, vật tư, nhiệm vụ hoặc rủi ro vận hành từ service thật.
- `selectDataQualityPriorityProjects`: completeness, `actualProgressDataStatus` và `actualProgressWarnings`.
- Khi hai selector cùng có một project, data-quality ranking ưu tiên project khác trước; nếu vẫn phải lặp do không còn lựa chọn, reason và CTA bắt buộc khác semantic.

## 4. DashboardContext

```ts
type DashboardContext =
  | { mode: "PORTFOLIO"; projectId: null }
  | { mode: "PROJECT"; projectId: string };
```

`resolveDashboardContext` chỉ nhận `selectedProjectId` đã qua `getGlobalProjectContext` và dashboard RBAC scope. Mode không suy luận bằng `projects.length`.

## 5. Composition PORTFOLIO

```text
Hero: phạm vi toàn hệ thống
KPI tổng quan
Row 1
├─ Tình trạng tiến độ và rủi ro (summary only)
└─ Sức khỏe dữ liệu danh mục công trình (donut + legend only)
Row 2
├─ Công trình cần can thiệp về tiến độ và rủi ro
└─ Công trình cần hoàn thiện dữ liệu
Row 3+
├─ Phê duyệt chờ xử lý
└─ Báo cáo hiện trường nổi bật
```

Hai summary card và hai list card là các grid row độc lập. Card cùng hàng được stretch theo nội dung cùng loại, không dùng fixed height. Khi container Dashboard nhỏ hơn 68rem, mỗi row stack trước khi cột phải bị bó.

Donut chỉ còn partition:

`COMPLETE + MISSING_PLAN + MISSING_ACTUAL + MISSING_BOTH = totalProjects`.

## 6. Composition PROJECT

```text
Hero: phạm vi một công trình + tên/mã project
Row 1
├─ Tiến độ công trình
└─ Sức khỏe dữ liệu công trình (checklist, không donut)
Row 2
├─ Vấn đề và rủi ro cần xử lý
└─ Hành động tiếp theo
Row 3+
└─ Báo cáo hiện trường của project
```

Project mode không render:

- `ExecutiveKpiGrid` đếm project;
- “Tổng công trình: 1”;
- donut danh mục;
- danh sách project ưu tiên;
- selected project như một dòng project trong chính Dashboard của nó.

Tiến độ kế hoạch, thực tế và variance được trình bày thành ba metric riêng. Khi actual là `null`, card dùng `getActualProgressDataLabel` và không render 0% hoặc planned thay thế.

## 7. Ma trận semantic Dashboard

| Card | Context | Câu hỏi quản trị | Nguồn dữ liệu | Selector / model | CTA |
|---|---|---|---|---|---|
| KPI tổng quan | PORTFOLIO | Quy mô, hoạt động, tín hiệu vận hành trong kỳ là gì? | `DashboardData.kpis`, `projectOverview`, `totalActionCount` | KPI mapping riêng, không ranking project | Drawer theo từng KPI; KPI Báo cáo/Tài liệu không gắn CTA sai đích |
| Tình trạng tiến độ và rủi ro | PORTFOLIO | Bao nhiêu project có thể đánh giá và đang đúng/cần chú ý/chậm? | planned, actual, variance, health | `buildPortfolioProgressRiskSummary` | `/dashboard/projects-status` |
| Sức khỏe dữ liệu danh mục | PORTFOLIO | Chất lượng dữ liệu danh mục phân bố thế nào? | `completenessCategory` | `buildExecutiveStatusChartViewModel` | `/dashboard/projects-status` |
| Công trình cần can thiệp | PORTFOLIO | Project nào cần hành động vận hành trước? | aggregate semantic + `executive-action-service` | `selectOperationalInterventionProjects` | Báo cáo / vật tư / nhiệm vụ / tổng hợp tiến độ đúng loại nguồn |
| Công trình cần hoàn thiện dữ liệu | PORTFOLIO | Project nào thiếu hoặc có dữ liệu không hợp lệ? | completeness, data status, warnings | `selectDataQualityPriorityProjects` | Kế hoạch / WBS / daily / summary theo trạng thái |
| Phê duyệt chờ xử lý | PORTFOLIO | Hồ sơ nào cần quyết định? | `pendingApprovals` | Không dùng selector project priority | `/approvals` hoặc drawer approval |
| Báo cáo hiện trường nổi bật | PORTFOLIO | Báo cáo mới/có vấn đề nào cần đọc? | `recentSiteReports` | Status/report mapping | `/reports` hoặc report drawer |
| Tiến độ công trình | PROJECT | Kế hoạch, thực tế, variance và cập nhật cuối của project là gì? | semantic project overview | `projectProgressStatus` | Dữ liệu hiển thị trực tiếp; summary ở Hành động tiếp theo |
| Sức khỏe dữ liệu công trình | PROJECT | Đầu vào nào đủ, thiếu hoặc cảnh báo? | plan, WBS count, design, approved quantity, template status, warnings | Checklist semantic | Không dùng donut/list project |
| Vấn đề và rủi ro cần xử lý | PROJECT | Vấn đề vận hành nào của project cần xử lý? | action items đã scope + variance hợp lệ | project-scoped issue composition | Đích của issue hoặc summary |
| Hành động tiếp theo | PROJECT | Người điều hành nên mở màn hình nào tiếp theo? | project data status + pending approvals | `selectProjectNextActions` | plan/WBS/daily/approval/summary/detail |
| Báo cáo hiện trường | PROJECT | Báo cáo nào thuộc project đang chọn? | `recentSiteReports` đã scope | Report presentation | `/reports?projectId=...` |

Nhiệm vụ, vật tư và issue không có card giả riêng: chúng là nguồn vận hành của card “Công trình cần can thiệp”. Tài liệu và báo cáo có KPI tổng hợp theo kỳ; báo cáo có module chi tiết riêng. Không có hai card dùng cùng project ranking chỉ để đổi title/màu.

## 8. Files thay đổi trong phase này

- `src/app/globals.css`
- `src/components/dashboard/responsive-chart-card.tsx`
- `src/components/dashboard/executive/executive-dashboard.tsx`
- `src/components/dashboard/executive/executive-header.tsx`
- `src/components/dashboard/executive/executive-kpi-grid.tsx`
- `src/components/dashboard/executive/executive-project-progress.tsx`
- `src/components/dashboard/executive/executive-status-chart.tsx`
- `src/components/dashboard/executive/portfolio-executive-dashboard.tsx`
- `src/components/dashboard/executive/portfolio-priority-lists.tsx`
- `src/components/dashboard/executive/project-executive-dashboard.tsx`
- `src/components/dashboard/executive/project-dashboard-cards.tsx`
- `src/components/layout/global-project-context-switcher.tsx`
- `src/lib/dashboard/dashboard-context.ts`
- `src/lib/dashboard/dashboard-information-architecture.ts`
- `src/lib/dashboard/dashboard-project-presentation.ts`
- `src/lib/dashboard/dashboard-queries.ts`
- `src/lib/dashboard/tests/executive-status-chart-model.test.ts`
- `src/lib/dashboard/tests/dashboard-information-architecture.test.ts`
- `src/lib/dashboard/tests/dashboard-progress-presentation-guard.test.ts`
- `scripts/qa/dashboard-ui-integrity.spec.ts`
- `docs/qa/DASHBOARD_CONTEXT_AND_INFORMATION_ARCHITECTURE_FIX_2026-07-29.md`

Các file Data-Integrity và UI primitives đã tồn tại trong worktree trước phase này không được nhận là thay đổi mới của phase context/IA.

## 9. Test chống tái phát

### Unit

- Context `PORTFOLIO`/`PROJECT` lấy từ project id đã xác thực.
- Missing completeness không tự tạo operational item.
- Operational và data-quality selector không bằng nhau.
- Project trùng giữa hai selector phải khác reason và CTA.
- Negative variance hợp lệ tạo operational item với CTA summary.
- `totalCount = 11`, `visibleCount = 5`, `maxVisible = 5`.
- Donut model không còn action list và vẫn giữ invariant completeness.
- Project action không dùng actual-to-planned fallback.

Kết quả gần nhất: **6 files, 22 tests PASS**.

### Playwright scoped

File `scripts/qa/dashboard-ui-integrity.spec.ts` nạp **19 tests**:

- chuyển `Toàn hệ thống → Project A → Project B → Toàn hệ thống` và reload;
- assertion riêng cho PORTFOLIO/PROJECT;
- duplicate project/reason/CTA;
- balance hai card mỗi row bằng bounding box (≤ 12px);
- body overflow tại 12 viewport từ 360×800 đến 2560×1440;
- long-name keyboard/touch tooltip;
- chart resize và console errors;
- screenshot portfolio/project desktop, tablet, mobile.

Runner chưa thực thi được DOM assertions vì thiếu credential QA bắt buộc.

## 10. Kết quả lệnh

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS |
| ESLint phạm vi thay đổi | PASS, 0 error |
| `npx vitest run ...dashboard...` | PASS — 6 files, 22 tests |
| `npm run build` | PASS — Next.js 16.2.7; còn warning NFT có sẵn ở storage provider, ngoài scope |
| `npx playwright test --list ...` | PASS — 19 tests được nạp |
| `npx playwright test ...` | BLOCKED tại global setup vì thiếu QA credentials |
| In-app browser read-only | BLOCKED — chuyển tới `/login?reason=session_expired` |
| Static semantic scan | PASS — không có fallback actual/planned, `progressPercent`, shared priority helper hoặc title/list cũ trong Dashboard flow |

## 11. Overflow, overlap và ảnh trước/sau

- Ảnh **trước**: ảnh runtime thủ công người dùng đính kèm, thể hiện hai danh sách giống hệt và project mode vẫn dùng composition danh mục.
- Ảnh **sau**: chưa thể chụp từ trang authenticated. Không tạo screenshot giả, không inject DOM, không seed mock và không bỏ qua đăng nhập.
- Overflow/overlap/layout balance: test đo bằng DOM đã được viết nhưng kết quả runtime vẫn **BLOCKED**, không ghi PASS bằng suy luận từ CSS.

## 12. Rủi ro còn lại và điều kiện mở Production

1. Cấp credential QA read-only hợp lệ cho runner hoặc đăng nhập phiên in-app browser.
2. Chạy 19 Playwright tests trên dữ liệu thật có ít nhất hai project và nhiều trạng thái completeness/operational.
3. Lưu ảnh Portfolio và Project ở desktop/tablet/mobile, bao gồm project có actual và project thiếu actual.
4. Xác nhận hai row desktop chênh cao không quá 12px, body `scrollWidth === clientWidth`, không có overlap/console error.
5. Chỉ khi các bước trên PASS mới nâng Portfolio/Project Dashboard lên UI PASS và xem xét Production GO.

## 13. Kết luận cuối

- **Code checks: PASS**
- **Data static integrity: PASS**
- **Portfolio Dashboard: PASS STATIC / RUNTIME UNVERIFIED**
- **Project Dashboard: PASS STATIC / RUNTIME UNVERIFIED**
- **Automated runtime: BLOCKED**
- **Production: NO-GO**

