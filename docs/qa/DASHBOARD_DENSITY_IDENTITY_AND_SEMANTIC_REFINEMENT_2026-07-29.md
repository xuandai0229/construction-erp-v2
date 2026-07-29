# Dashboard Density, Identity & Semantic Refinement — 2026-07-29

## 1. Kết luận điều hành

Phase này giữ nguyên hai composition `PORTFOLIO` và `PROJECT`, chỉ sửa các lỗi còn lại về mật độ, identity và ngữ nghĩa.

| Hạng mục | Kết luận | Bằng chứng |
|---|---|---|
| Code checks | **PASS** | TypeScript PASS; lint phạm vi thay đổi 0 error; 32 unit tests PASS; build PASS. |
| Data static integrity | **PASS** | Không khôi phục `progressPercent`, không fallback actual/planned, không đổi aggregate đã kiểm thử. |
| Portfolio composition | **PASS MANUAL RUNTIME** | Ảnh runtime sau context fix do người dùng cung cấp xác nhận composition hoạt động và hai danh sách khác semantic. |
| Project composition | **PASS MANUAL RUNTIME** | Ảnh runtime do người dùng cung cấp xác nhận không còn donut/KPI/list danh mục trong project mode. |
| Density & semantic refinement mới | **PASS STATIC / MANUAL RECHECK REQUIRED** | Code và unit test PASS; chưa có session authenticated để chụp lại UI sau các tinh chỉnh của phase này. |
| Automated multi-viewport runtime | **BLOCKED** | Playwright thiếu `QA_ADMIN_EMAIL` và `QA_ADMIN_PASSWORD`; in-app browser chuyển tới `/login?next=...`. |
| Production | **NO-GO** | Chưa có multi-viewport overflow/overlap/screenshot tự động và data runtime parity vẫn BLOCKED. |

Không còn ghi “không có screenshot sau sửa” cho phase context: ảnh người dùng cung cấp là bằng chứng thủ công hợp lệ. Tuy nhiên ảnh đó có trước các tinh chỉnh density mới trong báo cáo này, nên không được dùng để giả PASS cho automated runtime.

## 2. Root cause và thay đổi layout

| Lỗi | Nguyên nhân gốc | Thay đổi |
|---|---|---|
| Card action ít dữ liệu bị kéo cao | `.dashboard-row-grid { align-items: stretch }` áp dụng cho mọi row | Mặc định row căn top; chỉ summary row `BALANCED` stretch ở desktop. |
| Project issues 5 item và next actions 2 item vẫn cao bằng nhau | Project action row dùng 1/2 + 1/2 và stretch | Chuyển thành `minmax(0, 2fr) minmax(20rem, 1fr)`, căn top, card `CONTENT` tự cao. |
| Empty approvals cao hàng trăm pixel | Root `h-full`, body `flex-1`, empty `min-h-[220px]` | Bỏ `h-full`/`flex-1`; empty content 148px, tối đa 170px; ẩn link “Xem tất cả” khi rỗng. |
| Empty project issues quá cao | `min-h-48` dù không có issue | Compact empty state 150px. |
| Hero đẩy nội dung điều hành xuống thấp | Desktop min-height 192px, padding/gap lớn | Desktop hero có min-height 128px, giảm khoảng 33%; typography và spacing vẫn giữ khả năng đọc. |

### Contract layout mới

- `data-card-layout="BALANCED"`: chỉ dùng cho summary cards có mật độ tương đương; desktop mới kiểm tra chênh cao tối đa 12px.
- `data-card-layout="CONTENT"`: list/action/empty-state căn top, tự cao theo nội dung; không kiểm tra hoặc ép equal height.
- Không thêm `body { overflow-x: hidden }`, fixed height lớn, margin âm hoặc dữ liệu giả.

## 3. Điều tra project trùng tên

Audit read-only chạy trên `127.0.0.1:5432/construction_erp_v2_qa`. Script từ chối chạy nếu target không phải database QA cục bộ.

Hai tên được phản ánh trong ảnh thuộc hai bộ fixture QA khác nhau. Tất cả record có code chứa marker `QA`, projectId khác nhau và action map đúng theo `projectId`/`targetId`.

| projectId | code | name | source action | targetType | targetId |
|---|---|---|---|---|---|
| `cms32ov3j000nv8wksjxljktu` | `QA-EWR-HTQM-05` | Hạ tầng kỹ thuật Khu công nghiệp Quang Minh | Báo cáo có vấn đề | `SITE_REPORT` | `cms32ov7m004pv8wkaydw4x70` |
| `cms40u4rh0005ock53rq47o45` | `QA_WS_HTK` | Hạ tầng kỹ thuật Khu công nghiệp Quang Minh | Báo cáo có vấn đề | `SITE_REPORT` | `cms40u4sb000eock51kr2dytl` |
| `cms32ov3g000kv8wk3ytwu2zb` | `QA-EWR-NOHD-04` | Khối nhà ở xã hội Hoài Đức | Báo cáo có vấn đề | `SITE_REPORT` | `cms32ov7q004tv8wkbhn7w7lo` |
| `cms40u4rg0004ock5e0ctqqc2` | `QA_WS_NOH` | Khối nhà ở xã hội Hoài Đức | Báo cáo có vấn đề | `SITE_REPORT` | `cms40u4s9000dock5ml99phtm` |

Kết luận:

- Đây là fixture QA trùng tên, không phải action bị map sai projectId.
- Audit còn phát hiện ba nhóm tên QA lặp khác; tổng cộng 5 nhóm/10 record.
- Không có bằng chứng nghiệp vụ để tự gộp hoặc thêm `canonicalProjectId`; không mutation/xóa fixture trong phase UI.
- Portfolio luôn hiển thị code chính thức; khi record trùng tên có `location`, selector truyền thêm địa điểm làm qualifier (`Mê Linh, Hà Nội`, `Hoài Đức, Hà Nội`, ...).
- Database production không được truy vấn; vì vậy không kết luận có dữ liệu test lẫn production. Script QA mới có guard ngăn chạy nhầm production.

## 4. Operational intervention semantic

Luồng trước đây bỏ mất `assignee`, thời điểm phát sinh và overdue duration khi map `ExecutiveActionItem` sang `DashboardActionItem`; `createdAt` còn bị đặt `null`. Selector chỉ giữ một reason chung và không cho biết project có bao nhiêu tín hiệu khác.

Luồng mới:

```text
Site report / material request / field material request / work task / project variance
→ ExecutiveActionItem (reason thật, type, severity, assignee, occurredAt, due/overdue)
→ DashboardActionItem (giữ nguyên metadata)
→ selectOperationalInterventionProjects
→ gom theo projectId
→ chọn action có score nghiêm trọng nhất
→ hiển thị “+N vấn đề khác” cho các signal còn lại
```

Mỗi item operational hiện có:

- tên project và code/địa điểm phân biệt identity;
- loại vấn đề và mức độ;
- reason thật, ưu tiên nội dung `SiteReport.issues` thay vì reason generic;
- ngày phát sinh hoặc số ngày quá hạn;
- người/đơn vị phụ trách khi nguồn có dữ liệu;
- CTA theo `targetType` thật;
- không lặp cùng project nhiều dòng trong một list.

Unit test xác nhận hai action cùng project tạo một item, giữ action nghiêm trọng nhất và `additionalIssueCount = 1`.

## 5. KPI: nguồn, kỳ dữ liệu và ý nghĩa

Đã bỏ dòng hero “Kỳ dữ liệu: 7 ngày gần đây” vì không đúng cho toàn bộ KPI. Mỗi KPI có period label riêng.

| KPI | Nguồn | Kỳ dữ liệu hiển thị | Ý nghĩa |
|---|---|---|---|
| Tổng công trình | `project.count` trong RBAC/project scope, `deletedAt = null` | Hiện tại | Tổng record công trình người dùng được phép xem. |
| Đang thi công | `project.count(status = ACTIVE)` | Hiện tại | Số project active và tỷ lệ trên tổng scope. |
| Rủi ro tiến độ | `projectOverview` có đủ planned + actual + variance | Hiện tại | Số project `AT_RISK/DELAYED`; luôn kèm `rủi ro/đã đánh giá` và số project chưa đủ dữ liệu. |
| Khối lượng hôm nay | `FieldProgressEntry.count(entryDate trong ngày)` | Hôm nay | Số bản ghi hiện trường trong ngày, không phải tổng quantity khác đơn vị. |
| Tín hiệu vận hành | `getExecutiveActionItems` | Hiện tại | Vấn đề, nhiệm vụ và vật tư cần rà soát; không gọi là “đang mở” khi nguồn báo cáo chưa có field resolved thống nhất. |
| Báo cáo / Tài liệu | `SiteReport.count(reportDate)` + `Document.count(createdAt)` | 7 ngày / 30 ngày / tháng đã chọn | Số phát sinh trong kỳ filter. |

Ví dụ scope 12 project, chỉ 1 project đánh giá được và không có rủi ro: KPI hiển thị `0/1 công trình đã đánh giá` và `11 công trình chưa đủ dữ liệu`, không ngụ ý 12/12 project an toàn.

## 6. Progress status policy

Các ngưỡng cũ `-2` và `-10` đã được gom vào `PROJECT_PROGRESS_STATUS_POLICY`. UI project dùng cùng policy và thêm nhánh semantic `AHEAD`:

| Variance actual - planned | Trạng thái UI |
|---|---|
| `> +2` điểm % | Vượt kế hoạch |
| `[-2, +2]` điểm % | Đúng tiến độ |
| `[-10, -2)` điểm % | Cần chú ý |
| `< -10` điểm % | Chậm tiến độ |
| planned/actual null | Chưa thể đánh giá |

Portfolio health vẫn map `AHEAD` vào bucket `ON_TRACK` để không phá contract KPI cũ; Project card hiển thị rõ “Vượt kế hoạch”. Ngưỡng nằm ở một config export duy nhất và có unit test.

## 7. Xác minh đơn vị khối lượng

`FieldProgressItem.unit` tồn tại trong Prisma schema nhưng Dashboard query cũ không select trường này. Audit QA xác nhận project `QA-TUHIEP-5F-001` có 7 đơn vị: `bộ`, `kg`, `m`, `m²`, `m² sàn`, `m³`, `điểm`.

Đã thêm `summarizeProjectProgressUnits`:

- `SINGLE_UNIT`: raw total được phép hiển thị, kèm đơn vị và format `vi-VN` tối đa 4 chữ số thập phân.
- `MIXED_UNITS`: không hiển thị tổng design/actual; hiển thị số hạng mục và số đơn vị.
- `MISSING_UNIT`: không hiển thị tổng; cảnh báo có hạng mục thiếu đơn vị.
- `NOT_APPLICABLE`: chưa có hạng mục hợp lệ.

Không convert đơn vị, không tạo hệ số giả và không thay aggregate nghiệp vụ. Tỷ lệ hoàn thành semantic vẫn được giữ theo logic Data-Integrity hiện tại; raw totals bị ẩn khi không có cùng dimension.

## 8. Files thay đổi trong phase refinement

- `src/app/globals.css`
- `src/components/dashboard/executive/executive-action-list.tsx`
- `src/components/dashboard/executive/executive-header.tsx`
- `src/components/dashboard/executive/executive-kpi-grid.tsx`
- `src/components/dashboard/executive/executive-project-progress.tsx`
- `src/components/dashboard/executive/executive-status-chart.tsx`
- `src/components/dashboard/executive/portfolio-priority-lists.tsx`
- `src/components/dashboard/executive/project-dashboard-cards.tsx`
- `src/lib/dashboard/dashboard-information-architecture.ts`
- `src/lib/dashboard/dashboard-queries.ts`
- `src/lib/dashboard/executive-action-service.ts`
- `src/lib/dashboard/progress-utils.ts`
- `src/lib/dashboard/project-progress-units.ts`
- `src/lib/dashboard/tests/dashboard-information-architecture.test.ts`
- `src/lib/dashboard/tests/executive-status-chart-model.test.ts`
- `src/lib/dashboard/tests/progress-utils.test.ts`
- `src/lib/dashboard/tests/project-progress-units.test.ts`
- `scripts/qa/audit-dashboard-project-identity.ts`
- `scripts/qa/dashboard-ui-integrity.spec.ts`
- `docs/qa/DASHBOARD_CONTEXT_AND_INFORMATION_ARCHITECTURE_FIX_2026-07-29.md`
- `docs/qa/FULL_SYSTEM_UI_UX_IMPLEMENTATION_2026-07-29.md`
- `docs/qa/DASHBOARD_DENSITY_IDENTITY_AND_SEMANTIC_REFINEMENT_2026-07-29.md`

## 9. Test layout và runtime evidence

Playwright scoped hiện có 22 tests:

- chỉ summary row gọi `assertBalancedRow`;
- content row kiểm tra `align-items: start`, `data-card-layout="CONTENT"` và không có `h-full`/fixed min-height trên card;
- empty approvals kiểm tra 130–170px;
- project action cards căn top, không equal-height stretch;
- hero desktop ≤ 140px;
- cả 6 KPI có period label;
- overflow tại 12 viewport;
- long-name, chart resize, context switch, console và duplicate semantic;
- screenshot Portfolio đầu trang, Portfolio hai list, Project ở desktop/tablet/mobile.

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS |
| ESLint phạm vi thay đổi | PASS, 0 error; warning ignore/pre-existing được ghi nhận |
| Unit tests Dashboard | PASS, 9 files / 32 tests |
| Read-only identity/unit audit | PASS trên local QA, không mutation |
| `npm run build` | PASS, Next.js 16.2.7 |
| Build warning | 1 warning NFT có sẵn tại `local-storage-provider.ts`, ngoài scope |
| Playwright `--list` | PASS, 22 tests |
| Playwright execution | BLOCKED: thiếu QA credentials |
| In-app browser | BLOCKED tại login redirect |
| Screenshot thủ công context | PASS cho PORTFOLIO/PROJECT composition theo ảnh người dùng |
| Screenshot mới sau refinement | BLOCKED do không có session authenticated |

## 10. Rủi ro còn lại

1. Cần credential QA read-only để chạy 22 Playwright tests và chụp bộ ảnh mới sau phase refinement.
2. Cần kiểm tra thủ công project có 5 issues/2 actions và project không issues ở desktop/tablet/mobile.
3. `SiteReport` hiện chưa có trạng thái resolved nghiệp vụ độc lập với approval status; KPI dùng nhãn “Tín hiệu vận hành” thay vì khẳng định tất cả đều đang mở.
4. Production database không được audit trong phase này. Không có bằng chứng production chứa fixture QA, nhưng chỉ có thể kết luận sau kiểm tra read-only đúng target được cấp quyền.
5. Data runtime parity vẫn theo kết luận `PASS STATIC / RUNTIME BLOCKED` của báo cáo Data-Integrity.

## 11. Kết luận cuối

- **Code checks: PASS**
- **Data static integrity: PASS**
- **Portfolio composition: PASS MANUAL RUNTIME**
- **Project composition: PASS MANUAL RUNTIME**
- **Density/identity/semantic refinement: PASS STATIC / MANUAL RECHECK REQUIRED**
- **Automated multi-viewport runtime: BLOCKED**
- **Data runtime parity: BLOCKED**
- **Production: NO-GO**

Không có dữ liệu mock mới, không mutation QA/production, không fallback actual/planned và không dùng CSS che overflow.
