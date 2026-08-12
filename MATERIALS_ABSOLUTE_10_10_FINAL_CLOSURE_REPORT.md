# Materials Absolute 10/10 Final Closure Report

Ngày lập: 11/08/2026  
Trạng thái: **FINAL = NOT READY**

> Báo cáo này không dùng kết quả build để thay thế kiểm thử runtime. Không có dữ liệu production nào bị seed, migration, cập nhật hoặc xóa trong phase này.

## 1. Baseline

- Commit gốc: `c68347a318ed122c9301cdfcda6c5069c9a5f629`.
- Worktree đã dirty trước phase, gồm các thay đổi Materials, các báo cáo audit và script QA liệt kê tại mục 2.
- Không dùng `reset`, `clean`, checkout hàng loạt, migration hoặc database reset.
- Database audit chỉ-đọc sử dụng cấu hình `.env.local`; dữ liệu nhận diện QA bằng tiền tố `QA-`.

## 2. Files changed

Các thay đổi đã có trong worktree tập trung tại:

- `src/app/(dashboard)/materials/actions.ts`: DTO/query portfolio, aggregate, relation Project cho movement, KPI và attention semantics.
- `src/components/materials/materials-workspace.tsx`: context scope, project navigation và `returnTo` explicit.
- `src/components/materials/materials-portfolio-{overview,catalog,stock,transactions}.tsx`: các presentation project-first mới.
- `src/components/materials/material-{proposal-list,proposal-form,proposal-preview-toolbar}.tsx`: filter/search, action menu, context proposal.
- `src/components/materials/materials-{catalog,overview,stock-table,transactions,badges}.tsx`: tích hợp portfolio và contract trạng thái tồn.
- `src/app/(dashboard)/materials/proposals/**`: bảo toàn `returnTo` khi chi tiết/xem trước/tạo mới.
- `src/lib/{materials,material-proposals}/**`: RBAC và proposal action.
- `scripts/audit-materials-absolute.ts`: audit read-only.
- `scripts/seed-materials-qa-fixtures.ts`: sửa generator QA để mọi movement đi qua ledger.

Tài liệu/ma trận liên quan:

- `MATERIALS_FINAL_COVERAGE_MATRIX.md`
- `MATERIALS_DATABASE_ABSOLUTE_AUDIT.md`
- `MATERIALS_PORTFOLIO_PROJECT_RECONCILIATION_MATRIX.md`

## 3. Coverage inventory

`MATERIALS_FINAL_COVERAGE_MATRIX.md` liệt kê Portfolio, Project scope, catalog, stock, proposal, transaction, create/edit/detail/preview, export, print, loading/error, menu và responsive state. Tất cả surface runtime trong matrix hiện được đánh dấu **pending**, không được suy diễn là đã kiểm thử.

## 4. Root causes and UI fixes

Đã xử lý trong source:

- Portfolio chuyển sang project-first: overview, danh mục, tồn kho và nhập/xuất có group theo công trình mặc định.
- Tên công trình là primary label; portfolio không render mã công trình cạnh tên.
- Movement portfolio lấy `Project.name` qua relation, không dùng fallback giả “Công trình”/“Project”. Row không resolve được project bị báo lỗi dữ liệu thay vì gán nhãn giả.
- Nhập/xuất dùng geometry header/row thống nhất, tách rõ `Thời gian` và `Ghi chú`; mode “Tất cả giao dịch” luôn có cột công trình.
- Proposal dùng combobox tìm kiếm công trình thay native select lớn; option hiển thị tên, không đưa mã CT vào UI.
- Action proposal giữ `UnifiedActionMenu`, active row và action theo quyền; action export/edit/delete không được render nếu capability không cho phép.
- Scope company không lặp badge/context khi đã có toggle Toàn công ty/Theo công trình.
- Search portfolio sync URL có debounce, tránh `router.replace` ở mỗi ký tự.
- Link portfolio → project dựng `returnTo` `/materials` đã giữ tab/scope/filter; trang proposal detail/preview cũng sanitise return path nội bộ.

## 5. Architecture and navigation contract

| Điểm xuất phát | Điểm đến | Context dự kiến trong source | Runtime |
|---|---|---|---|
| Portfolio overview/catalog/stock/transactions | Materials công trình tương ứng | `scope=project` + `returnTo` portfolio hiện tại | Chưa kiểm thử |
| Portfolio đề xuất | Chi tiết/chỉnh sửa/xem trước đề xuất | `returnTo=/materials?scope=portfolio&tab=requests…` | Chưa kiểm thử |
| Project đề xuất | Xem trước/chỉnh sửa | Giữ route project trong `returnTo` đã sanitize | Chưa kiểm thử |
| Xem trước | Danh sách/context gọi đến | Toolbar dùng return context explicit | Chưa kiểm thử |

Không kết luận navigation PASS trước khi kiểm thử Back, refresh, new tab và action menu với phiên đăng nhập.

## 6. Database reconciliation (read-only)

Audit database thực tế hiện cho:

| Metric | Total portfolio | Tổng project | Difference |
|---|---:|---:|---:|
| Project active | 21 | 21 | 0 |
| MaterialItem | 12 | 12 | 0 |
| ProjectMaterialStock rows | 12 | 12 | 0 |
| Stored stock quantity | 16.655 | 16.655 | 0 |
| MaterialMovement | 17 | 17 | 0 |
| MaterialProposal raw | 17 | 17 | 0 |
| MaterialProposalItem | 22 | 22 | 0 |

Ba công trình có dữ liệu là Thanh Xuân, Xuân Phương và Vĩnh Tuy; 18 công trình active còn lại chưa có dữ liệu Materials. Quan hệ hiện tại đạt 0 orphan/cross-project mismatch cho movement-material, stock-material, proposal item và duplicate stock row.

### Proposal semantics

Record `cmsodh53c001j2ck5gadq2wyq` (DVT-QA-2026-008, Xuân Phương) có trạng thái `CANCELLED`. Đây là record thứ 17 trong raw DB, trong khi danh sách executive hiển thị 16. Contract đã chốt trong source:

- KPI executive đổi semantic thành **Đề xuất đang theo dõi** và không tính `CANCELLED`.
- Danh sách mặc định không hiển thị `CANCELLED`; lịch sử phải là filter riêng nếu được thêm sau này.
- Attention chỉ gồm `DRAFT`, `SUBMITTED`, `REVISION_REQUESTED` hoặc quá hạn ngày cần cấp (trừ proposal đã approved), không dùng toàn bộ proposal lịch sử làm chỉ báo rủi ro.

## 7. Stock ledger reconciliation — blocking failure

Current QA DB vẫn có 4 mismatch:

| Project | Material | Stored | Ledger calculated | Difference |
|---|---|---:|---:|---:|
| Thanh Xuân | QA-XI-MANG | 250 | 270 | -20 |
| Thanh Xuân | QA-THEP-D10 | 500 | 300 | +200 |
| Xuân Phương | QA-THEP-D10 | 3.500 | 4.000 | -500 |
| Vĩnh Tuy | QA-GACH | 12.000 | 9.000 | +3.000 |

Root cause đã xác định ở `scripts/seed-materials-qa-fixtures.ts`: fixture cũ tạo/cập nhật stock ban đầu rồi ghi một số `MaterialMovement` trực tiếp, bỏ qua transaction service/ledger, nên ledger và stored stock lệch đúng bốn dòng trên. Generator đã sửa để initial import và mọi movement QA gọi `applyMaterialMovement` trong transaction.

Không reseed trong phase này: script fixture xóa/tạo lại QA rows. Cần xác nhận QA database cô lập và phê duyệt thao tác mutation trước khi chạy. Vì dữ liệu DB hiện hữu chưa được rebuild, **Database PASS bị chặn**.

## 8. Stock status contract

Contract dùng chung trong code:

1. `stock < 0` → Âm tồn.
2. `stock === 0` → Hết hàng.
3. `minStockLevel > 0 && stock <= minStockLevel` → Sắp hết.
4. Còn lại → Đủ.

Portfolio summary, badge và server aggregation đã được chỉnh về ngưỡng `<=`. QA hiện không có negative stock; runtime rendering của trạng thái âm chưa kiểm thử.

## 9. Material identity

Không coi `MaterialItem.code` là global master. Aggregate cross-project là display analysis theo identity bảo thủ (`name + unit + group`) và vẫn giữ material/project IDs. Ví dụ `QA-COP-PHA` có cùng code nhưng khác đơn vị là **không được merge**. Không có migration hay giả lập global material master.

## 10. RBAC

Source audit cho thấy:

- Aggregate portfolio server-side đòi `canViewAllProjects`.
- User project-only bị giới hạn tập project membership.
- Actions proposal/catal​og/transaction được gate ở UI; server actions vẫn là source of truth.
- `returnTo` bị giới hạn đường dẫn `/materials` nội bộ.

Chưa có session QA cho ADMIN/DIRECTOR/project-assigned/viewer trong browser nên chưa thể thử direct URL, IDOR, export và mutation. **RBAC runtime = UNVERIFIED**.

## 11. Responsive, accessibility, Vietnamese audit

- Source đã có layout desktop/tablet/mobile riêng ở các component portfolio; project names có clamp/tooltip theo surface.
- Không có evidence runtime cho 1920, 1600, 1440, 1366, 1280, 1024, 768, 390; responsive = **UNVERIFIED**.
- Proposal filter/combobox có keyboard handlers trong source, nhưng chưa thực hiện Tab/Shift+Tab/Enter/Space/Escape runtime; accessibility = **UNVERIFIED**.
- Quét source đã rà các user-facing materials strings trọng yếu. Internal identifiers tiếng Anh được giữ nguyên. Không thể xác nhận 100% copy/layout từ source-only; Vietnamese audit = **PARTIAL**.

## 12. Preview, PDF, Excel and print

Routes và return context đã được inventory (`/materials/proposals/[id]`, `/preview`, `/print`, `/export`, `/proposal-export/[id]`). Không có phiên đăng nhập để mở document thật, tải Excel/PDF hoặc Print Preview. Các luồng này là **UNVERIFIED**, không PASS.

## 13. Runtime, console, network and screenshots

- Browser thử mở `http://localhost:3000/materials?scope=portfolio` chuyển về `/login?next=%2Fmaterials%3Fscope%3Dportfolio`.
- Không có credentials/session được cấp. Vì vậy không có screenshot Materials hợp lệ, không có browser evidence cho menu/table/filter/preview/export.
- Console của trang login không có error/warning, nhưng điều này **không** chứng minh console Materials sạch.
- Network trong Materials, React/hydration warning, responsive và screenshot manifest: **UNVERIFIED**.

## 14. Static quality gates

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS |
| ESLint phạm vi Materials | 0 error, 25 warnings |
| `npm run lint` toàn repo | FAIL: 42 errors, 265 warnings; lỗi nằm ngoài Materials theo targeted check |
| `npm run build` sau thay đổi mới nhất | PASS (Next.js 16.2.7) |
| `git diff --check` | PASS; chỉ có cảnh báo CRLF của Git |

Full repository lint không xanh nên không thể đưa quality tổng thể thành PASS.

## 15. Self-critique

| Persona | Kết luận source/data audit | Trạng thái |
|---|---|---|
| Tổng giám đốc | Project-first, exception list và KPI semantics đã rõ hơn | Cần runtime xác nhận 3–5 giây |
| Giám đốc dự án | Tên project và drill-down đã có context | Cần test Back/filter |
| Chỉ huy trưởng | Project workspace được giữ riêng | Cần test thao tác nhập/xuất thực tế |
| Cán bộ vật tư | Form/menu/action permission chưa được thao tác thật | Unverified |
| UI/UX lead | Có còn legacy branch unreachable trong vài component cũ; không ảnh hưởng active path nhưng là debt P2 | Chưa đóng |
| QA lead | Không có screenshot/browser matrix; 4 mismatch current DB | Blocking |
| Security/data engineer | Server guard có mặt nhưng chưa có IDOR/runtime proof; fixture root cause đã rõ | Blocking |

## 16. Remaining known risks and required next actions

1. Cần một phiên browser đã đăng nhập bằng các account QA đã được phép dùng để chạy toàn bộ route/RBAC/responsive/navigation/print-export matrix và chụp evidence.
2. Cần xác nhận database hiện tại là QA cô lập và phê duyệt chạy reseed fixture. Script sẽ xóa và tạo lại **QA fixture rows**, sau đó phải rerun `audit-materials-absolute.ts` để xác nhận 0 ledger mismatch.
3. Cần xử lý hoặc phân loại 42 ESLint errors toàn repo trước khi có thể ghi lint toàn repository PASS.
4. Nên xóa các legacy portfolio branch bất khả đạt (`if (false && isPortfolioMode)`) trước close code-quality, sau khi smoke test active components.

## 17. Scores and final verdict

| Hạng mục | Kết quả |
|---|---|
| UI | UNVERIFIED — không có Materials runtime evidence |
| UX | PARTIAL — source cải thiện, chưa runtime |
| Data logic | PARTIAL — conservation/relation clean, ledger current DB còn mismatch |
| Database | FAIL / BLOCKED — 4 mismatch chưa rebuild QA |
| Navigation | UNVERIFIED |
| RBAC | UNVERIFIED |
| Responsive | UNVERIFIED |
| Print/Export | UNVERIFIED |
| Final | **NOT READY** |

Không có tuyên bố “10/10”, “Production Ready”, “Certified” hay “Absolute PASS” trong điều kiện hiện tại.
