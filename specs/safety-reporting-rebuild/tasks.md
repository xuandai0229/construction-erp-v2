# DANH SÁCH NHIỆM VỤ THỰC HIỆN (TASKS)
## PHẦN BÁO CÁO ATLĐ • PCCC • VSMT HÀNG TUẦN

---

### PHONG THỦY KIẾN TRÚC & CHUẨN BỊ (PHASE 0)
- [x] **Task 0.1:** Kiểm tra 7 điều kiện an toàn pre-requisite (Git log, branch, worktree clean, legacy safety removed, Supervision intact).
- [x] **Task 0.2:** Bảo toàn 2 file Word mẫu gốc tại `docs/official-templates/` và tạo `golden-master-manifest.json`.
- [x] **Task 0.3:** Lập tài liệu `specs/safety-reporting-rebuild/spec.md`, `plan.md`, và `data-lineage.md`.

---

### MÔ HÌNH DỮ LIỆU & PRISMA MIGRATION (PHASE 1)
- [ ] **Task 1.1:** Cập nhật `prisma/schema.prisma` với 6 model mới phỏng theo `plan.md` (`SafetyReportPlanSequence`, `SafetySelfAssessmentSequence`, `SafetyReportPlan`, `SafetyReportPlanEntry`, `SafetySelfAssessmentReport`, `SafetySelfAssessmentEntry`, `SafetyReportApprovalHistory`, `SafetyReportAuditLog`) và relations tương ứng trên `User`, `Project`, `ApprovalRequest`.
- [ ] **Task 1.2:** Chạy `npx prisma format`, `npx prisma validate`, `npx prisma generate`.
- [ ] **Task 1.3:** Tạo migration mới `prisma/migrations/20260730230000_add_safety_reporting_standalone` và verify migration deploy trên QA rehearsal database.

---

### CORE DOMAIN SERVICES & WORD/PDF GENERATOR (PHASE 2)
- [ ] **Task 2.1:** Triển khai `src/lib/safety-reporting/plan-service.ts` (CRUD Kế hoạch, sinh số văn bản, trình duyệt, duyệt, hủy).
- [ ] **Task 2.2:** Triển khai `src/lib/safety-reporting/assessment-service.ts` (CRUD Báo cáo tự đánh giá, kế thừa từ Kế hoạch đã duyệt).
- [ ] **Task 2.3:** Triển khai `src/lib/safety-reporting/docx-generator.ts` (Render DOCX từ Golden Master 01 & 02 sử dụng docxtemplater/pizzip).
- [ ] **Task 2.4:** Triển khai `src/lib/safety-reporting/pdf-converter.ts` (Chuyển đổi DOCX sang PDF phục vụ Preview và Export).

---

### API ROUTES & RBAC AUTHORIZATION (PHASE 3)
- [ ] **Task 3.1:** Xây dựng API endpoints Kế hoạch (`src/app/api/reports/safety/plans/...`).
- [ ] **Task 3.2:** Xây dựng API endpoints Báo cáo tự đánh giá (`src/app/api/reports/safety/self-assessments/...`).
- [ ] **Task 3.3:** Cập nhật `src/lib/roles/role-workspace-policy.ts` cho phép `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `CONSTRUCTION_SUPERVISOR`, `CHIEF_COMMANDER`, `MANAGER` truy cập các route `/reports/safety/...`.

---

### FRONTEND UI COMPONENTS & PAGES (PHASE 4)
- [ ] **Task 4.1:** Đổi tên/bổ sung card lựa chọn thứ 3 **"ATLĐ • PCCC • VSMT"** trên trang `/reports` (`src/app/(dashboard)/reports/page.tsx`).
- [ ] **Task 4.2:** Xây dựng trang hub chính `/reports/safety` (Màn chọn 2 loại hồ sơ).
- [ ] **Task 4.3:** Xây dựng danh sách, form tạo/sửa Kế hoạch kiểm tra tuần (`/reports/safety/plans/...`).
- [ ] **Task 4.4:** Xây dựng danh sách, form tạo/sửa Báo cáo tự đánh giá (`/reports/safety/self-assessments/...`).
- [ ] **Task 4.5:** Xây dựng màn hình Preview PDF & Export (`/reports/safety/plans/[planId]/preview` & `/reports/safety/self-assessments/[reportId]/preview`).

---

### KIỂM THỬ HỆ THỐNG VÀ XÁC MINH (PHASE 5)
- [ ] **Task 5.1:** Chạy `npx tsc --noEmit` & `npm run build`.
- [ ] **Task 5.2:** Chạy unit test & API integration test.
- [ ] **Task 5.3:** Thực hiện E2E regression check & QA Database Rehearsal.
- [ ] **Task 5.4:** Hoàn tất báo cáo kết quả triển khai cho Chủ hệ thống.
