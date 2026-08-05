# HR Open Defects Register & Remediation History

**Trạng thái Document:** RELEASE CANDIDATE — PENDING FINAL GATE

## Bảng Đăng Ký Defects (DEF-01 đến DEF-14)

| ID | Nội dung Defect | Severity | Root Cause | File Khắc Phục | Trạng Thái | Điều Kiện Đóng |
| --- | --- | --- | --- | --- | --- | --- |
| DEF-01 | Permission canonical và alias | Medium | Thiếu mapping alias `hr:organization:manage` | `permission-registry.ts` | VERIFIED CLOSED | Vitest RBAC Pass |
| DEF-02 | Position deactivation invariant | Medium | Invariant chưa check active employee assignment | `organization-actions.ts` | VERIFIED CLOSED | Vitest & E2E Pass |
| DEF-03 | Target Scope và IDOR | High | Server Action không validate target org unit scope | `organization-actions.ts` | VERIFIED CLOSED | Playwright IDOR Denial Pass |
| DEF-04 | TypeScript DTO và build | Medium | Mismatch type định nghĩa DTO với Prisma schema | `src/types/hr.ts` | VERIFIED CLOSED | `tsc --noEmit` & Build Pass |
| DEF-05 | Canonical QA database guard | High | Guard chỉ so sánh chuỗi URL thô | `qa-db-guard-utils.ts` | VERIFIED CLOSED | Unit test guard Pass |
| DEF-06 | Credential exposure | High | Credential plaintext trong script test | `scripts/qa/*` | VERIFIED CLOSED | Credential scan zero match |
| DEF-07 | Reproducible Git baseline | High | Multi-commit SHA drift | Git Baseline Freeze | VERIFIED CLOSED | Single Immutable SHA |
| DEF-08 | Release documentation | Medium | Báo cáo cũ thiếu minh chứng thực tế | `docs/hr/*` | VERIFIED CLOSED | Full Evidence Execution Log |
| DEF-09 | PII browser/network evidence | High | E2E test PII leak chưa mock/assert đủ | `hr-browser-pii-leak.spec.ts` | VERIFIED CLOSED | Playwright PII Leak Pass |
| DEF-10 | Audit sanitizer consistency | Medium | Audit log lọt field PII nhạy cảm | `audit-sanitizer.ts` | VERIFIED CLOSED | Audit sanitizer test Pass |
| DEF-11 | Out-of-scope script changes | High | Sửa nhầm syntax script ngoài phạm vi | `scripts/*` | VERIFIED CLOSED | Cú pháp tsc/vitest Pass |
| DEF-12 | QA test route exposure | High | Route `/hr/test-idor` không có cờ tắt | `src/app/hr/test-idor/page.tsx` | VERIFIED CLOSED | 404 Guard Test Pass |
| DEF-13 | QA database least privilege | High | Role `qa_runner_new` mang quyền superuser | PostgreSQL Role Config | VERIFIED CLOSED | `rolsuper = false` Verified |
| DEF-14 | Zero-orphan verification | High | Fixture rác tồn đọng sau khi chạy E2E | Playwright spec files | VERIFIED CLOSED | Fixture count delta = 0 |
