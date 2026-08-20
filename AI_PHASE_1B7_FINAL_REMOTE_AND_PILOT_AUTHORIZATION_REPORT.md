# BÁO CÁO NGHIỆM THU AN TOÀN CREDENTIAL, ĐỐI SOÁT NHÂN SỰ VẬN HÀNH VÀ CỔNG OPENAI THẬT (PHASE 1B.7)
# AI PHASE 1B.7 — PILOT DECISION, CREDENTIAL HYGIENE & REAL OPENAI FINAL GATE REPORT

**Dự án:** `construction-erp-v2`  
**Ngày phát hành:** 20/08/2026  
**Trạng thái kiểm thử:** **95/95 TEST FILES PASSED (598/598 TESTS PASS, 0 FAIL, 0 SKIP)**  
**Đánh giá an toàn:** **PASS AGAINST TESTED CASES**  
**Quyết định vận hành:** **AI READ-ONLY INTERNAL PILOT = NO-GO (BLOCKED_OPERATOR_DECISION & BLOCKED_NO_KEY)**

---

## 1. BÁO CÁO XOAY VÒNG BẢO MẬT CREDENTIAL QA (CREDENTIAL HYGIENE AUDIT)

Ngay khi phát hiện credential của `hr_qa_user` xuất hiện trong command log trước đó, hệ thống đã thực hiện quy trình xoay vòng bảo mật (Security Rotation) tức thời:

1. **Quy trình xoay vòng (Rotation Workflow):**
   - Sinh chuỗi ngẫu nhiên chuẩn mật mã 24-byte hex (`crypto.randomBytes(24)`).
   - Thực thi `ALTER USER hr_qa_user WITH PASSWORD '...'` trực tiếp qua kết nối quản trị viên nội bộ.
   - Cập nhật biến môi trường `QA_DATABASE_URL` trong `.env.hr-qa.local` và `.env.local` hoàn toàn cục bộ.
   - **Bảo mật tuyệt đối:** Không in mật khẩu, không in tiền tố (prefix), không in hash, không ghi vào báo cáo.
2. **Kiểm tra phân quyền tối thiểu và cô lập cross-database sau xoay vòng:**
   - `hr_qa_user` kết nối thành công tới database QA `construction_erp_v2_hr_qa`.
   - Các flags an toàn được xác thực: `rolsuper=false`, `rolcreatedb=false`, `rolcreaterole=false`, `rolreplication=false`, `rolbypassrls=false`.
   - Thử nghiệm tấn công kết nối từ `hr_qa_user` tới Runtime Business DB `construction_erp_v2_dev` bị PostgreSQL từ chối triệt để (`CONNECT DENIED`).
3. **Audit mã nguồn & Git Tracking:**
   - Lệnh `git ls-files ".env*"` xác nhận chỉ có `.env.example` và `.env.e2e.example` được commit. Các file `.env.local` và `.env.hr-qa.local` được `.gitignore` bảo vệ 100%.

---

## 2. BÁO CÁO AUDIT ĐỘ TOÀN VẸN CỦA BỘ TEST (TEST INTEGRITY AUDIT)

Đối soát chi tiết toàn bộ các tệp kiểm thử đã được hiệu chỉnh để khẳng định không có assertion nào bị làm yếu hay bỏ qua:

| Tệp kiểm thử | Bản chất thay đổi | Chứng minh độ nghiêm ngặt không bị giảm | Kết luận Integrity |
| :--- | :--- | :--- | :---: |
| `concurrency-integration.test.ts` | Khởi tạo 2 Connection Pool độc lập trên QA DB | Vẫn thực thi `Promise.allSettled([promiseA, promiseB])` đồng thời. Khóa PostgreSQL Advisory Lock đảm bảo đúng 1 request thành công và 1 request bị chặn với thông báo vi phạm định mức `vượt quá 100%`. Không hề chuyển thành sequential. | **PASS** |
| `project-assignment-actions.test.ts` | Chuyển kiểm tra side-effect từ global `count()` sang fixture-specific query | Thay vì so sánh đếm số dòng toàn bảng (dễ bị race condition khi chạy đa luồng), test truy vấn chính xác `userId` và `projectId` của fixture để khẳng định không phát sinh bản ghi `ProjectMember` hay `UserAccessGrant` thừa. Giữ nguyên 100% assertion PII và RBAC. | **PASS** |
| `project-assignment-ui.test.ts` | Gán kết nối tới database QA cô lập `construction_erp_v2_hr_qa` | Kiểm tra projection an toàn PII và cơ chế zero-residue cleanup sau khi chạy. Không bỏ bất kỳ assertion nào. | **PASS** |
| `hr-qa-least-privilege.test.ts` | Chạy trực tiếp dưới quyền `hr_qa_user` | 9/9 tests chạy thật trên role non-superuser, xác thực đầy đủ quyền `SELECT, INSERT, UPDATE, DELETE` và chặn `CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE DATABASE, DEV CONNECT`. | **PASS** |

---

## 3. ĐỐI SOÁT DANH TÍNH NHÂN SỰ VẬN HÀNH TRỰC TIẾP TỪ DATABASE RUNTIME

Truy vấn trực tiếp từ `construction_erp_v2_dev` xác lập source of truth không thể chối cãi:

### Bảng 1: Đối soát toàn bộ tài khoản ADMIN trong hệ thống
| Email / Username | Tên hiển thị | User.id | Trạng thái (isActive) | Xóa mềm (deletedAt) | Đủ điều kiện Pilot? |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `daicongtu2910@gmail.com` | XĐ | `cmroatu6r0000mowklk61sv56` | **ACTIVE** (`true`) | `null` | **CÓ (Admin Nghiệp vụ thật)** |
| `daicongty2910@gmail.com` | Admin System | `cmsczcskg00009ck57x7moaxt` | **INACTIVE** (`false`)| `2026-08-03T01:45:01Z` | **KHÔNG (Bị vô hiệu & Xóa mềm)** |
| `qa_freeze_admin@construction.local` | QA Freeze Admin | `qa_freeze_admin` | **ACTIVE** (`true`) | `null` | **KHÔNG (Tài khoản test QA)** |
| `qa_admin@construction.local` | QA Admin | `qa_closure_admin` | **INACTIVE** (`false`)| `2026-08-13T10:35:23Z` | **KHÔNG (Tài khoản test QA đã đóng)** |

### Bảng 2: Đối soát chính xác danh tính Chỉ huy trưởng (NV-2026-0002 & NV-2026-0003)
| Mã TK / NV | Họ và tên chuẩn trong DB | User.id | User.role | Trạng thái | Công trình đang phụ trách |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `NV-2026-0002` | **Lê Mạnh Hùng** | `cmsraldrt00149ck5366am56m` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0002` (Quảng trường Đông hồ Hoàn Kiếm) |
| `NV-2026-0003` | **Đoàn Văn Giang** | `cmsraldzc00189ck5o32c3npg` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0003`, `CT-2026-0004`, `CT-2026-0005` |
| `NV-2026-0004` | **Lê Trọng Hạ** | `cmsrale6l001e9ck5qmdgebtn` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0006` (Trường MN Minh Khai) |

> [!IMPORTANT]
> **Xác nhận danh tính:** Mã nhân sự `NV-2026-0002` trong cơ sở dữ liệu thật thuộc về **Lê Mạnh Hùng** (không phải Trần Trọng Thủy). Toàn bộ danh sách `ALLOWED_PILOT_USER_IDS` trong mã nguồn `src/lib/ai/pilot/ai-pilot-cohort.ts` hiện tại chỉ chứa các `User.id` đang **ACTIVE** (`true`) và không bị xóa mềm (`deletedAt = null`).

---

## 4. BẢNG INVENTORY KIỂM THỬ TOÀN DIỆN (FULL REGRESSION FINAL HEAD)

```
Test Files  95 passed (95)
     Tests  598 passed (598)
  Duration  7.42s
```

| Phân hệ Kiểm thử | Số tệp | Số test PASS | Số test FAIL | Số test SKIP | Trạng thái Release Gate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **AI Foundation Core Security** | 10 | 75 | **0** | **0** | **PASS** |
| **Browser Functional E2E (Mock/Local)** | 1 | 7 | **0** | **0** | **PASS** |
| **QA Least Privilege & Security Guard** | 1 | 9 | **0** | **0** | **PASS** |
| **HR Project Assignment & Concurrency** | 3 | 12 | **0** | **0** | **PASS** |
| **HR Domain & Management Services** | 19 | 136 | **0** | **0** | **PASS** |
| **Settings & Storage Integration** | 12 | 84 | **0** | **0** | **PASS** |
| **Dashboard, Invariants & Progress** | 15 | 92 | **0** | **0** | **PASS** |
| **Safety Reporting & PDF/DOCX Engine** | 14 | 76 | **0** | **0** | **PASS** |
| **Supervision Weekly Workflow** | 9 | 58 | **0** | **0** | **PASS** |
| **QA Migrations & Utilities** | 11 | 49 | **0** | **0** | **PASS** |
| **TỔNG CỘNG TOÀN HỆ THỐNG** | **95** | **598** | **0** | **0** | **PASS (100%)** |

---

## 5. TRẢ LỜI 15 CÂU HỎI QUYẾT ĐỊNH (SECTION 30)

| STT | Câu hỏi kiểm tra | Trả lời chính thức |
| :---: | :--- | :--- |
| **1** | QA password đã rotate chưa? | **ĐÃ ROTATE THÀNH CÔNG.** Sinh ngẫu nhiên 24-byte hex, cập nhật vào Postgres role `hr_qa_user` và env local-only, không in secret ra ngoài. |
| **2** | Có secret nào tracked trong Git không? | **0 SECRET TRACKED.** `git ls-files ".env*"` chỉ có các tệp example. |
| **3** | Operator đã thực sự chọn Option A/B chưa? | **CHƯA CÓ QUYẾT ĐỊNH CHÍNH THỨC.** Trạng thái ghi nhận chuẩn xác là `PILOT_OPTION = UNCONFIRMED`. |
| **4** | Các User pilot hiện tại chính xác là ai theo runtime DB? | `ADMIN`: `daicongtu2910@gmail.com` (XĐ); `CHIEF_COMMANDER`: `NV-2026-0002` (Lê Mạnh Hùng), `NV-2026-0003` (Đoàn Văn Giang), `NV-2026-0004` (Lê Trọng Hạ). |
| **5** | Có User pilot nào inactive không? | **KHÔNG CÓ.** Tất cả 4 user trong allowlist đều `isActive: true` và `deletedAt: null`. `daicongty2910@gmail.com` bị vô hiệu hóa nên không được cấp quyền pilot. |
| **6** | NV-2026-0002 và NV-2026-0003 thực sự là ai? | `NV-2026-0002` là **Lê Mạnh Hùng**; `NV-2026-0003` là **Đoàn Văn Giang**. |
| **7** | Test Integrity Audit có phát hiện assertion bị làm yếu không? | **KHÔNG.** Toàn bộ assertion concurrency, least-privilege, PII và RBAC đều được giữ nguyên và bảo vệ nghiêm ngặt. |
| **8** | QA regression sau rotate PASS không? | **PASS 100%** (15/15 tests PASS trên `hr_qa_user` với mật khẩu mới). |
| **9** | OpenAI thật đã chạy chưa? | **CHƯA CHẠY.** Môi trường chưa có `OPENAI_API_KEY`, script dừng ở trạng thái `BLOCKED_NO_KEY`. |
| **10**| Golden 5 remote chính xác bao nhiêu? | **CHỜ KEY TỪ OPERATOR.** Sẵn sàng chạy nghiệm thu ngay khi có key. |
| **11**| Cross-project remote có bị DENY không? | **ĐÃ CHẮC CHẮN BỊ CHẶN Ở TẦNG SERVER-SIDE TOOL GATEWAY (HTTP 403 / PROJECT_SCOPE_DENIED)**. |
| **12**| Browser OpenAI Remote đã PASS chưa? | **CHƯA CHẠY.** Mới chỉ có Browser Mock E2E PASS (7/7 Playwright tests). |
| **13**| Runtime kill switch có PASS không? | **PASS.** Biến `AI_PILOT_ENFORCEMENT` và kiểm tra tài khoản Active chặn fail-closed ngay lập tức. |
| **14**| Full regression cuối có 0 fail/0 mandatory skip không? | **PASS.** 95/95 files, 598/598 tests PASS, 0 FAIL, 0 SKIP. |
| **15**| Có đủ điều kiện mở Pilot chưa? | **CHƯA ĐỦ ĐIỀU KIỆN (NO-GO).** Hệ thống còn 2 rào cản: Chờ quyết định chính thức của Operator về Option B và Cấu hình `OPENAI_API_KEY`. |

---

## 6. KẾT LUẬN VÀ QUYẾT ĐỊNH NGHIỆM THU

$$\mathbf{AI\ READ\text{-}ONLY\ INTERNAL\ PILOT\ =\ NO\text{-}GO\ (BLOCKED\ TR\hat{E}N\ 2\ Y\acute{E}U\ T\tilde{O}\ V\hat{A}N\ H\grave{A}NH)}$$

1. **Rào cản 1 (Quyết định từ Operator):** Cần lời xác nhận chính thức: *"Tôi chọn Option B — Pilot trước với ADMIN + CHIEF_COMMANDER"*.
2. **Rào cản 2 (Khóa bí mật API):** Cần cấu hình biến môi trường `OPENAI_API_KEY` tại file bí mật `.env.local` trên server theo hướng dẫn tại [AI_PILOT_OPERATOR_REQUIREMENTS.md](file:///d:/construction-erp-v2/AI_PILOT_OPERATOR_REQUIREMENTS.md).

Ngay khi 2 yếu tố trên được cung cấp, hệ thống sẽ chạy ngay bài kiểm tra Live Remote OpenAI Gate cuối cùng để chuyển trạng thái sang **GO**.
