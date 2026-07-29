# Dashboard actual-progress data integrity - 2026-07-29

## Kết luận điều hành

**PASS STATIC / RUNTIME BLOCKED.** Dashboard không còn dùng tiến độ kế hoạch để thay thế hoặc gắn nhãn là tiến độ thực tế. Model được tách nghĩa, aggregate thực tế thuần đã có unit/parity test và build/typecheck PASS.

QA database an toàn đã được xác nhận là database tách biệt trên loopback (`construction_erp_v2_qa_e2e_20260723`). Tuy nhiên dữ liệu thật hiện có chỉ gồm ba công trình fixture và không có công trình nào vừa có kế hoạch hợp lệ vừa có khối lượng `APPROVED`. Vì vậy không thể chứng minh runtime end-to-end cho đủ ba trường hợp quản trị bắt buộc mà không tạo dữ liệu mới. Không có mutation nào được chạy.

## Root cause trước khi sửa

`src/lib/dashboard/dashboard-queries.ts` từng trả `actualProgressPercent = null` rồi tạo trường mơ hồ `progressPercent` bằng tiến độ kế hoạch. `ExecutiveStatusChart` và `/dashboard/projects-status` trình bày trường đó như tiến độ thực tế. Hệ quả: kế hoạch có thể bị hiển thị thành thực tế.

## Data lineage đã xác minh

```text
FieldProgressItem (WORK, chưa xóa mềm, template còn hoạt động)
  + FieldProgressEntry (APPROVED, chưa xóa mềm, entryDate <= hết ngày hiện tại)
→ calculateProjectActualProgress
  → totalDesignQuantity / approvedActualQuantity / actualProgressPercent
  → actualProgressDataStatus / warnings / lastActualProgressAt
→ DashboardProjectOverview
  → plannedProgressPercent / actualProgressPercent / variancePercent
  → completenessCategory
→ /dashboard, /dashboard/projects-status, ExecutiveStatusChart

Field-progress summary mặc định
→ entry trong khoảng thời gian: APPROVED
→ cumulative trước khoảng: APPROVED
→ buildFieldProgressRollupTree
→ cùng tỷ lệ tổng khối lượng approved / tổng khối lượng thiết kế WORK.
```

### Dẫn chứng nguồn và công thức

- `summary/page.tsx` lọc `APPROVED` theo mặc định, lấy cumulative trước ngày bắt đầu cũng chỉ từ `APPROVED`, rồi gọi `buildFieldProgressRollupTree`.
- `rollup.ts` chỉ lấy `designQuantity` và entry của hạng mục `WORK`; nhóm chỉ cộng dồn con.
- `daily/actions.ts` đặt entry thành `APPROVED` chỉ khi người thao tác có quyền phê duyệt; còn lại là `SUBMITTED` hoặc `DRAFT`. Hàm cũng chặn khối lượng âm và trùng nhiều entry trên một hạng mục/ngày.
- `report-progress-sync.ts` chuyển dòng báo cáo thành `APPROVED` chỉ với mode `APPROVE`; mode `SAVE` và `SUBMIT` lần lượt là `DRAFT` và `SUBMITTED`.
- Schema chỉ có `DRAFT`, `SUBMITTED`, `APPROVED`, `REVISION_REQUESTED`, `CANCELLED` cho `FieldProgressEntry`; không có trạng thái `REJECTED` cho entity này.

Công thức được giữ đúng theo rollup hiện hữu, không phát minh công thức mới:

```text
actualProgressPercent = SUM(quantity của entry APPROVED hợp lệ đến hết hôm nay)
                        / SUM(designQuantity hợp lệ của WORK)
                        * 100
```

Tỷ lệ không bị ép về 100. Nếu actual vượt thiết kế, aggregate vẫn giữ giá trị thật và trả warning `ACTUAL_EXCEEDS_*`.

## Model sau khi sửa

`DashboardProjectOverview` tách hoàn toàn các ý nghĩa:

- `plannedProgressPercent`: tiến độ theo mốc start/end của dự án.
- `actualProgressPercent`: chỉ từ aggregate khối lượng `APPROVED`; `null` khi không thể tính.
- `variancePercent`: chỉ có khi cả kế hoạch và thực tế có giá trị, bằng actual trừ planned.
- `actualProgressDataStatus`: `AVAILABLE`, `NO_PROGRESS_ITEMS`, `NO_APPROVED_ENTRIES`, `MISSING_DESIGN_QUANTITY`, `INVALID_QUANTITY`, `DATA_SCOPE_MISMATCH`, hoặc `MULTIPLE_ACTIVE_TEMPLATES`.
- `approvedActualQuantity`, `totalDesignQuantity`, `lastActualProgressAt`, `actualProgressWarnings`.
- `completenessCategory`: một trong `COMPLETE`, `MISSING_PLAN`, `MISSING_ACTUAL`, `MISSING_BOTH`.

Không còn `progressPercent`, `variance`, `dataCompleteness` hay `itemCount` trong model Dashboard.

## Null, zero và completeness

- `0%` chỉ trả về khi có ít nhất một entry `APPROVED` hợp lệ với quantity bằng 0.
- Không có WBS, không có entry approved, design null/0, quantity âm/không hợp lệ, sai phạm vi hoặc nhiều template hoạt động: actual là `null`, không phải `0`.
- Không có fallback `actual ?? planned` hoặc `actual || planned` trong presentation flow.
- `deriveCompletenessCategory` là hàm duy nhất phân loại bốn nhóm, exhaustive và mutually exclusive. Invariant là tổng bốn nhóm bằng số công trình trong scope.

## Đồng bộ và phạm vi quyền

Query vẫn bắt đầu từ `overviewProjects` đã chịu `getProjectAccessScope`, `projectScopeWhere`, soft-delete và project filter. Các query item/entry tiếp theo chỉ dùng ID từ tập đó. Entry tương lai bị loại; entry không thuộc project/hạng mục bị cảnh báo và không được cộng.

Summary không còn tự chọn ngẫu nhiên `findFirst` khi có nhiều template đang hoạt động: nó dừng tổng hợp và yêu cầu chuẩn hóa dữ liệu. Dashboard cũng trả actual `null` với `MULTIPLE_ACTIVE_TEMPLATES` trong tình huống đó.

Sau mỗi lưu khối lượng ngày, `/dashboard` và `/dashboard/projects-status` được revalidate cùng với các route field-progress.

## Files thay đổi

- `src/lib/dashboard/project-progress-aggregate.ts` (mới): aggregate thực tế và completeness domain service.
- `src/lib/dashboard/dashboard-queries.ts`: query/model semantic, giữ RBAC scope, bỏ fallback.
- `src/components/dashboard/dashboard-project-overview.tsx`
- `src/components/dashboard/executive/executive-status-chart.tsx`
- `src/components/dashboard/executive/executive-project-progress.tsx`
- `src/components/dashboard/executive/executive-kpi-grid.tsx`
- `src/components/dashboard/executive/executive-detail-drawer.tsx`
- `src/components/dashboard/executive/project-time-progress-drawer.tsx`
- `src/app/(dashboard)/dashboard/projects-status/projects-status-client-view.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`
- `src/lib/dashboard/dashboard-detail-actions.ts`
- `src/lib/dashboard/operational-issue-service.ts`
- `src/lib/dashboard/tests/project-progress-aggregate.test.ts` (mới)
- `src/lib/dashboard/tests/project-progress-parity.test.ts` (mới)
- `src/lib/dashboard/tests/executive-status-chart-model.test.ts`
- `src/lib/dashboard/tests/dashboard-progress-presentation-guard.test.ts` (mới)
- `scripts/qa/audit-dashboard-actual-progress-parity.ts` (mới, read-only QA collector)

## Test evidence

| Check | Result |
|---|---|
| Aggregate unit tests: approved/draft/submitted/revision/cancelled/deleted/future/cross-project/duplicate/zero/null design/negative/over-design | PASS |
| Completeness partition unit test | PASS |
| Parity test aggregate = `buildFieldProgressRollupTree` | PASS |
| Presentation regression guard against actual-to-planned fallback | PASS |
| Vitest scoped | PASS, 4 files / 13 tests |
| TypeScript `npx tsc --noEmit` | PASS |
| ESLint changed scope | PASS, 0 errors; pre-existing unused-import warnings remain |
| `npm run build` | PASS; one unrelated pre-existing Turbopack NFT tracing warning from local storage route |
| Prisma validate/generate | Not required: schema was not changed |

## Read-only QA evidence

Safety guard PASS: QA target is separate from the primary configured database and is `construction_erp_v2_qa_e2e_20260723` on `127.0.0.1:5432`.

| Công trình | Thiết kế hợp lệ | Actual approved | Draft | Submitted | Approved | Rejected/Cancelled | Kế hoạch | Thực tế | Data status | Completeness | Dashboard/Status/Summary runtime |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| QA-CONSTRUCTION-SUPERVISOR-FINAL-PROJECT-A | 100 | null | 0 | 1 | 0 | 0 | null | null | NO_APPROVED_ENTRIES | MISSING_BOTH | Không đủ dữ liệu kế hoạch để parity runtime |
| QA-CONSTRUCTION-SUPERVISOR-FINAL-PROJECT-B | 200 | 20 | 0 | 0 | 1 | 0 | null | 10% | AVAILABLE | MISSING_PLAN | Không đủ dữ liệu kế hoạch để parity runtime |
| QA-CONSTRUCTION-SUPERVISOR-FINAL-PROJECT-C | null | null | 0 | 0 | 0 | 0 | null | null | NO_PROGRESS_ITEMS | MISSING_BOTH | Không có WBS để parity runtime |

Không có công trình QA nào có `plannedProgressPercent` khác null, vì vậy không có trường hợp “đủ kế hoạch và approved actual” để kiểm chứng Dashboard = Projects Status = Summary bằng runtime. Script không in credential hoặc URL database.

## Rủi ro và việc còn chặn PASS runtime

1. QA hiện không có bộ dữ liệu thật bao phủ cả ba case yêu cầu; cần dữ liệu QA đã được phê duyệt/cho phép sử dụng, không tạo fixture mới trong phase này.
2. Schema không có unique constraint cho một template active mỗi project. Code phát hiện và dừng tính, nhưng việc làm sạch/constraint là một quyết định migration riêng.
3. Field-progress summary có filter `status=ALL` cho mục đích xem dữ liệu nháp. Parity của Dashboard chỉ áp dụng với summary mặc định `APPROVED_ONLY`; không coi entry nháp là actual điều hành.

## Điều kiện để nâng lên PASS

Chạy lại read-only collector và test route parity trên QA với tối thiểu:

1. một công trình có kế hoạch và entry approved;
2. một công trình có kế hoạch nhưng không có entry approved;
3. một công trình thiếu cả hai hoặc dữ liệu invalid;
4. cùng project filter và các role đại diện.

Khi đó đối chiếu giá trị `/dashboard`, `/dashboard/projects-status` và `/projects/[id]/field-progress/summary` với database aggregate, rồi mới chuyển sang phase cải tổ biểu đồ/UI.
