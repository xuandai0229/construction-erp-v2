# HR Release Gate Policy — Chính Sách Tiêu Chuẩn Kiểm Định Thấu Đáo & Quyết Định Phát Hành

**Phiên bản:** 2.0.0  
**Tác giả:** Kỹ Sư Kiểm Thử Tự Động & Kiểm Định Phát Hành  
**Trạng thái Kiểm toán:** FULLY VERIFIED  
**Quyết Định Phát Hành Phase 0.2:** **GO — APPROVED FOR PHASE 4**  

---

## I. TỔNG QUAN VỀ QUY TRÌNH KIỂM ĐỊNH PHÁT HÀNH (RELEASE GATE)

Quy trình Release Gate cho phân hệ HR được thiết lập để đảm bảo không một mã nguồn không đạt tiêu chuẩn nào được phép triển khai lên môi trường thử nghiệm nâng cao hoặc phát hành cho Phase 4 (Điều động công trình & Hợp đồng).

---

## II. 22 TIÊU CHÍ KỸ THUẬT KIỂM ĐỊNH VÀ TRẠNG THÁI HIỆN TẠI

| # | Tiêu Chí Kiểm Định (Acceptance Criteria) | Công Cụ Verification | Kết Quả Hiện Tại | Ghi Chú Kỹ Thuật |
| :-: | :--- | :--- | :-: | :--- |
| 1 | Prisma Schema hợp lệ | `npx prisma validate` | **PASS** | Exit code 0, schema valid |
| 2 | Biển dịch TypeScript không lỗi | `npx tsc --noEmit` | **PASS** | Exit code 0 (0 errors, DEF-04 resolved) |
| 3 | Đạt 100% Vitest unit/integration test | `npx vitest run --fileParallelism=false` | **PASS** | 63/63 files, 411/411 tests PASS |
| 4 | Clean production build | `npm run build` | **PASS** | Build thành công (Exit code 0) |
| 5 | QA DB Safety Guard hoạt động | `validateQaDatabaseOrThrow()` | **PASS** | Chặn chạy mutation trên dev/prod DB |
| 6 | Playwright Mutation Integration suite | `npx playwright test hr-phase3-mutation` | **PASS** | 5/5 tests PASS trên isolated QA DB |
| 7 | Playwright Data Scope Matrix suite | `npx playwright test hr-phase3-scope` | **PASS** | 4/4 tests PASS trên isolated QA DB |
| 8 | Authenticated UI Runtime Smoke suite | `npx playwright test hr-phase2-runtime` | **PASS** | 11/11 tests PASS |
| 9 | Org Runtime & Route Stability suite | `npx playwright test hr-phase3-org` | **PASS** | 8/8 tests PASS |
| 10| Route Switch & Tab Stability suite | `npx playwright test hr-route-transition` | **PASS** | 3/3 tests PASS |
| 11| Chống IDOR trên Server Actions | Audit `organization-actions.ts` | **PASS** | 100% actions dùng `validateTargetScope` |
| 12| Chuẩn hóa permission codes | Audit `permission-service.ts` | **PASS** | Dùng `hr:organization:manage` canonical |
| 13| Invariant Org Deactivation check | `validateOrgUnitDeactivation` | **PASS** | Chặn ngắt hoạt động khi có con/NV active |
| 14| Invariant Position Deactivation check | `validatePositionDeactivation` | **PASS** | Chặn ngắt hoạt động khi có NV active |
| 15| Invariant Cycle Detection in Org Tree | `createOrganizationUnit` | **PASS** | Chặn tạo vòng lặp cây tổ chức |
| 16| PII AES-256-GCM Encryption | `pii-encryption.ts` | **PASS** | Đúng IV 12B, Tag 16B, Key 256b |
| 17| Blind Index Lookup Unique | `generateIdentityBlindIndex` | **PASS** | Chặn trùng CCCD qua blind index `@unique` |
| 18| PII Audit Sanitization | `audit-sanitizer.ts` | **PASS** | Redact CCCD plaintext trong AuditLog |
| 19| Zero PII Ciphertext Leak to Client | Audit Client DTO Projections | **PASS** | Client chỉ nhận masked/last4 digits |
| 20| Zero Orphan Data after Mutation | Playwright Mutation Suite Step 5 | **PASS** | Clean DB state post test run |
| 21| Audit Defect Register accuracy | `HR_OPEN_DEFECTS.md` | **PASS** | Đã đóng 100% lỗi tồn đọng |
| 22| Reconciled Master Documentation | 13 file `docs/hr/*.md` | **PASS** | Sạch sẽ, trung thực, khớp với SHA commit |

---

## III. QUYẾT ĐỊNH PHÁT HÀNH (GO / NO-GO DECISION)

* **Tổng kết Tiêu chí:** 22 / 22 Tiêu chí PASS (100% Acceptance Criteria Satisfied).
* **QUYẾT ĐỊNH CHÍNH THỨC:** **GO — APPROVED FOR PHASE 4**.
* **Mã Commit Baseline:** `3c1749d3215a0494005d393e9dded308cc1211c7`.
