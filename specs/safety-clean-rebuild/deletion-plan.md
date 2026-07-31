# KẾ HOẠCH XÓA PHẦN TRIỂN KHAI SAFETY SAI (DELETION PLAN)

> **Mục tiêu**: Đưa repository về trạng thái sạch, ổn định và không còn dấu vết runtime của phần ATLĐ • PCCC • VSMT đã triển khai sai hướng trước đây.

---

## 1. TOÀN BỘ FILE DỰ KIẾN XÓA (ONLY SAFETY - total 101 items)

### A. UI Route (`/safety-inspection/*`)
- `src/app/(dashboard)/safety-inspection/layout.tsx`
- `src/app/(dashboard)/safety-inspection/page.tsx`
- `src/app/(dashboard)/safety-inspection/reports/page.tsx`
- `src/app/(dashboard)/safety-inspection/reports/new/page.tsx`
- `src/app/(dashboard)/safety-inspection/reports/[reportId]/page.tsx`
- `src/app/(dashboard)/safety-inspection/sessions/page.tsx`
- `src/app/(dashboard)/safety-inspection/sessions/new/page.tsx`
- `src/app/(dashboard)/safety-inspection/sessions/[sessionId]/page.tsx`
- `src/app/(dashboard)/safety-inspection/findings/page.tsx`
- `src/app/(dashboard)/safety-inspection/findings/[findingId]/page.tsx`
- `src/app/(dashboard)/safety-inspection/re-inspections/page.tsx`

### B. API Route (`/api/safety-inspection/*`)
- `src/app/api/safety-inspection/collaborators/route.ts`
- `src/app/api/safety-inspection/dashboard/route.ts`
- `src/app/api/safety-inspection/projects/route.ts`
- `src/app/api/safety-inspection/reports/route.ts`
- `src/app/api/safety-inspection/reports/[reportId]/route.ts`
- `src/app/api/safety-inspection/sessions/route.ts`
- `src/app/api/safety-inspection/sessions/[sessionId]/route.ts`

### C. Giao diện Component (`src/components/safety-inspection/*`)
- `src/components/safety-inspection/safety-dashboard-client.tsx`
- `src/components/safety-inspection/safety-finding-form.tsx`
- `src/components/safety-inspection/safety-finding-list-client.tsx`
- `src/components/safety-inspection/safety-reinspection-client.tsx`
- `src/components/safety-inspection/safety-report-form.tsx`
- `src/components/safety-inspection/safety-report-hub-client.tsx`
- `src/components/safety-inspection/safety-session-detail-client.tsx`
- `src/components/safety-inspection/safety-session-form.tsx`
- `src/components/safety-inspection/safety-session-list-client.tsx`

### D. Domain, Service, Transactions & Unit Tests (`src/lib/safety-inspection/*`)
- `src/lib/safety-inspection/idempotency.ts`
- `src/lib/safety-inspection/idempotency-cleaner.ts`
- `src/lib/safety-inspection/idempotency-cleaner.test.ts`
- `src/lib/safety-inspection/permissions.ts`
- `src/lib/safety-inspection/read-service.ts`
- `src/lib/safety-inspection/reinspection.ts`
- `src/lib/safety-inspection/report-service.ts`
- `src/lib/safety-inspection/session-list-service.ts`
- `src/lib/safety-inspection/template-service.ts`
- `src/lib/safety-inspection/template-transactions.ts`
- `src/lib/safety-inspection/transactions.ts`
- `src/lib/safety-inspection/types.ts`
- `src/lib/safety-inspection/ui-labels.ts`
- `src/lib/safety-inspection/week.ts`
- `src/lib/safety-inspection/client-api.ts`
- `src/lib/safety-inspection/__tests__/api-boundary.test.ts`
- `src/lib/safety-inspection/__tests__/checklist-operational-v2.test.ts`
- `src/lib/safety-inspection/__tests__/checklist-v1.test.ts`
- `src/lib/safety-inspection/__tests__/finding-domain.test.ts`
- `src/lib/safety-inspection/__tests__/hardening-domain.test.ts`
- `src/lib/safety-inspection/__tests__/http-boundary.test.ts`
- `src/lib/safety-inspection/__tests__/idempotency.test.ts`
- `src/lib/safety-inspection/__tests__/inspection-domain.test.ts`
- `src/lib/safety-inspection/__tests__/lat2b-ui.test.ts`
- `src/lib/safety-inspection/__tests__/lat2b1-regression.test.ts`
- `src/lib/safety-inspection/__tests__/lat2b2-report-regression.test.ts`
- `src/lib/safety-inspection/__tests__/permissions.test.ts`
- `src/lib/safety-inspection/__tests__/report-category-projection.test.ts`
- `src/lib/safety-inspection/__tests__/week.test.ts`

### E. Database Migrations (Safety Unreleased)
- `prisma/migrations/20260730150000_add_safety_inspection_slice1/migration.sql`
- `prisma/migrations/20260730190000_add_safety_checklist_v1_metadata/migration.sql`
- `prisma/migrations/20260730220000_add_safety_operational_checklist_and_finding_sequence/migration.sql`

### F. Reference Data (Safety Checklist Cũ)
- `prisma/reference-data/safety-checklist-company-v1.json`
- `prisma/reference-data/safety-checklist-company-operational-v2.json`

### G. QA Integration & Rehearsal Scripts (Safety Cũ)
- `scripts/qa/safety-inspection-slice15.integration.ts`
- `scripts/qa/safety-migration-rehearsal.ts`
- `scripts/qa/safety-slice2a-http.integration.ts`
- `scripts/safety/bootstrap-safety-checklist-v1.ts`
- `scripts/safety/generate-checklist-v1-artifacts.ts`

### H. Specs, Documentation & Artifacts Sinh Ra Từ Lần Làm Sai
- `specs/002-safety-inspection-workflow/checklist-v1-matrix.md`
- `specs/002-safety-inspection-workflow/data-model.md`
- `specs/002-safety-inspection-workflow/plan.md`
- `specs/002-safety-inspection-workflow/quickstart.md`
- `specs/002-safety-inspection-workflow/research.md`
- `specs/002-safety-inspection-workflow/slice-1-report.md`
- `specs/002-safety-inspection-workflow/slice-1.5-report.md`
- `specs/002-safety-inspection-workflow/slice-2a-report.md`
- `specs/002-safety-inspection-workflow/slice-2a.5-report.md`
- `specs/002-safety-inspection-workflow/spec.md`
- `specs/002-safety-inspection-workflow/tasks.md`
- `specs/002-safety-inspection-workflow/checklists/requirements.md`
- `specs/002-safety-inspection-workflow/contracts/safety-inspection-api.md`
- `artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia-1.png`
- `artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia-2.png`
- `artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia-3.png`
- `artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia.docx`
- `artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia.pdf`
- `artifacts/safety-inspection-template-analysis/checklist-v1-manifest.json`
- `artifacts/safety-inspection-template-analysis/full-schema-sql-for-safety-extraction.sql`
- `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-1.png`
- `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-2.png`
- `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-3.png`
- `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-4.png`
- `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra-5.png`
- `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra.docx`
- `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra.pdf`
- `artifacts/safety-inspection-template-analysis/safety-checklist-operational-v2-manifest.json`
- `artifacts/safety-inspection-template-analysis/safety-checklist-operational-v2-matrix.md`
- `artifacts/safety-inspection-template-analysis/slice1-integration-fixture-manifest.json`
- `artifacts/safety-inspection-template-analysis/slice1.5-integration-manifest.json`
- `artifacts/safety-inspection-template-analysis/slice1.5-migration-rehearsal-manifest.json`
- `artifacts/safety-inspection-template-analysis/slice2a-runtime-request-manifest.json`
- `artifacts/safety-inspection-template-analysis/slice2a5-runtime-request-manifest.json`
- `artifacts/safety-inspection-template-analysis/template-manifest.json`

---

## 2. TOÀN BỘ FILE DỰ KIẾN SỬA ĐỂ GỠ THAM CHIẾU (SHARED FILES - total 7 items)

- **`prisma/schema.prisma`**: Xóa các enum Safety* và model Safety*, gỡ quan hệ Safety khỏi User, Project, Document, ApprovalRequest. GIỮ NGUYÊN 100% Supervision*.
- **`src/components/layout/sidebar.tsx`**: Gỡ menu item trỏ tới `/safety-inspection`.
- **`src/components/layout/mobile-bottom-nav.tsx`**: Gỡ route link Safety cũ khỏi mobile navigation.
- **`src/lib/prisma.ts`**: Gỡ check fallback `safetyInspectionSchedule` trong getPrismaClient.
- **`src/lib/roles/role-workspace-policy.ts`**: Gỡ route guard / policy cho `/safety-inspection`.
- **`src/lib/roles/role-permissions.ts`**: Gỡ các permission string `safety.*` cũ không còn consumer.
- **`src/lib/roles/role-definitions.ts`**: Gỡ gán quyền Safety cũ khỏi danh sách vai trò.

---

## 3. TOÀN BỘ FILE ĐƯỢC GIỮ LẠI (KEEP)

- docs/official-templates/bao-cao-tu-danh-gia.docx (Biểu mẫu Word nguồn chính thức 1)
- docs/official-templates/bao-cao-tu-danh-gia.pdf (Bản xem trước PDF nguồn 1)
- docs/official-templates/ke-hoach-kiem-tra.docx (Biểu mẫu Word nguồn chính thức 2)
- docs/official-templates/ke-hoach-kiem-tra.pdf (Bản xem trước PDF nguồn 2)
- docs/official-templates/template-manifest.json (Manifest mã SHA-256 biểu mẫu nguồn)
- artifacts/pre-safety-cleanup-working-tree.patch (Backup working tree patch)
- artifacts/pre-safety-cleanup-untracked.txt (Backup untracked list)
- Toàn bộ file/folder thuộc phân hệ Giám sát Supervision*
- Toàn bộ component dùng chung (Button, Dialog, Drawer, Tooltip, Date picker, Approval center, Auth/Session, Correlation ID, Audit helper, Document storage)
- Toàn bộ tài liệu QA/Kiến trúc hệ thống chung (docs/qa/*, docs/architectural-principles.md, src/lib/storage/*)

---

## 4. BẢNG XEM XÉT DẤU VẾT (REVIEW REQUIRED - total 6 items)

- src/app/(dashboard)/approvals/actions.ts (Quyền/approval center dùng chung - Không xóa, kiểm tra không bị ảnh hưởng)
- src/app/(dashboard)/approvals/components/approval-center-client.tsx (Approval UI dùng chung - Không xóa)
- src/lib/document-folders.ts (Cấu trúc thư mục tài liệu doanh nghiệp PCCC - Giữ nguyên)
- src/lib/documents/permissions.ts (Phân quyền thư mục tài liệu PCCC - Giữ nguyên)
- scripts/qa/assert-safe-qa-database.ts (Script bảo vệ database QA - Giữ nguyên)
- scripts/qa-safety-guard.ts (Guard chống wipe database - Giữ nguyên)

---

## 5. TRẠNG THÁI MIGRATION DATABASE

- **Production**: Chưa từng triển khai (NO-GO).
- **QA Database (`construction_erp_v2_qa` tại `127.0.0.1:5432`)**: Đã áp dụng 3 migration Safety cũ (`20260730150000_add_safety_inspection_slice1`, `20260730190000_add_safety_checklist_v1_metadata`, `20260730220000_add_safety_operational_checklist_and_finding_sequence`).
- **Kế hoạch xử lý Database**:
  1. Sau khi xóa 3 migration folder này khỏi codebase và cập nhật `schema.prisma`, tạo database QA rehearsal mới từ đầu để verify `npx prisma migrate deploy`.
  2. Xác minh database rehearsal mới sạch 100% không còn bảng/enum Safety và `Supervision*` hoạt động hoàn hảo.
  3. Xóa database rehearsal mới sau khi kiểm tra xong.

---

## 6. Ảnh Hưởng Dự Kiến Tới Build

- Khi xóa các route UI và API Safety, build không còn compile các page/component cũ.
- Khi gỡ tham chiếu khỏi `sidebar.tsx` và `mobile-bottom-nav.tsx`, menu ứng dụng sạch và không chứa link hỏng.
- Khi làm sạch `schema.prisma` và chạy `prisma generate`, TypeScript sẽ hoàn toàn không còn type `Safety*` cũ.
- Hệ thống build production (`npm run build`) và TypeScript compile (`npx tsc --noEmit`) đạt status PASS.

---

## 7. CÁCH ROLLBACK HỆ THỐNG

Nếu cần rollback toàn bộ thao tác dọn dẹp:
1. Restore patch làm việc chưa commit (nếu cần):
   ```bash
   git apply artifacts/pre-safety-cleanup-working-tree.patch
   ```
2. Chuyển về nhánh/tag backup đã lưu:
   ```bash
   git checkout backup/safety-before-rebuild-20260730
   ```

---

## 8. XÁC NHẬN AN TOÀN TUÂN THỦ NGUYÊN TẮC

- [x] Không sử dụng lệnh xóa wildcard rộng (`rm -rf *`, `git clean -fdx`, `prisma migrate reset`, `reset --hard`).
- [x] Đã đọc và xác minh từng file trong danh sách trước khi phân loại.
- [x] **XÁC NHẬN BẮT BUỘC**: Giữ nguyên 100% phân hệ Giám sát `Supervision*`.
- [x] **XÁC NHẬN BẮT BUỘC**: Giữ nguyên 100% hai file Word gốc và manifest SHA-256 tại `docs/official-templates/`.
- [x] Không sửa lịch sử Git đã công bố.
- [x] Không chạm production.
