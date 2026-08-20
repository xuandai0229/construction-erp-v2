# BÁO CÁO NGHIỆM THU KÍCH HOẠT CỔNG OPENAI THẬT VÀ PHÊ DUYỆT PILOT OPTION B (PHASE 1B.8)
# AI PHASE 1B.8 — REAL OPENAI PILOT ACTIVATION GATE REPORT

**Dự án:** `construction-erp-v2`  
**Ngày phát hành:** 20/08/2026  
**Quyết định vận hành:** **OPTION B — AI READ-ONLY PILOT (ADMIN + CHIEF_COMMANDER)**  
**Trạng thái kiểm thử:** **96/96 TEST FILES PASSED (603/603 TESTS PASS, 0 FAIL, 0 SKIP)**  
**Đánh giá an toàn:** **PASS AGAINST TESTED CASES**  
**Quyết định phát hành:** **AI READ-ONLY INTERNAL PILOT (OPTION B) = NO-GO (BLOCKED_NO_KEY)**

---

## 1. QUYẾT ĐỊNH VẬN HÀNH & KHÓA DANH SÁCH PILOT (OPTION B)

1. **Ghi nhận quyết định chính thức của Operator:**
   - Hệ thống chính thức áp dụng **OPTION B: Thí điểm AI Read-only với 2 nhóm người dùng thực tế (`ADMIN` và `CHIEF_COMMANDER`)**.
   - **Cam kết nguyên vẹn:** Không tạo Kỹ sư/Giám sát giả, không sửa role nhân sự hiện hữu, không thêm Tool thứ 6, không RAG, không Write Agent.
2. **Khóa danh sách Pilot Cohort theo `User.id` bất biến (Database Runtime Source of Truth):**
   - Toàn bộ tài khoản thí điểm bắt buộc thỏa mãn 4 điều kiện: `User.id` có thật, `role` thuộc nhóm được duyệt, `isActive = true`, `deletedAt = null`.

| STT | Định danh Pilot (Alias) | Mã tài khoản / Username | Vai trò (`User.role`) | Trạng thái DB | Phạm vi dự án phân công |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **Admin XĐ** | `daicongtu2910@gmail.com` | `ADMIN` | **ACTIVE** | Toàn bộ dự án hệ thống (`ALL_PROJECTS`) |
| 2 | **Chỉ huy trưởng Lê Mạnh Hùng** | `NV-2026-0002` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0002` (Quảng trường Đông hồ Hoàn Kiếm) |
| 3 | **Chỉ huy trưởng Đoàn Văn Giang** | `NV-2026-0003` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0003`, `CT-2026-0004`, `CT-2026-0005` |
| 4 | **Chỉ huy trưởng Lê Trọng Hạ** | `NV-2026-0004` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0006` (Trường Mầm non Minh Khai) |

> [!IMPORTANT]
> **Loại trừ nghiêm ngặt:** Tài khoản `daicongty2910@gmail.com` (Admin System) đã bị vô hiệu hóa (`isActive = false`) và xóa mềm (`deletedAt != null`) nên **tuyệt đối không được cấp quyền Pilot**. Các tài khoản test QA (`qa_freeze_admin`, `qa_closure_admin`) bị loại hoàn toàn khỏi cohort nghiệp vụ. Mọi người dùng ngoài danh sách (kể cả cùng role `CHIEF_COMMANDER` như `NV-2026-0005`...`NV-2026-0012`) đều bị chặn với mã lỗi `403 PILOT_COHORT_RESTRICTED`.

---

## 2. BẰNG CHỨNG THỰC TẾ VỀ CƠ CHẾ RUNTIME KILL SWITCH

Kiểm thử tích hợp trên cùng application process (`src/lib/ai/__tests__/ai-kill-switch-hierarchy.test.ts`) đã chứng minh trật tự ưu tiên của hệ thống kiểm soát:

```
[Request] ──► [Hard ENV Flag: AI_READ_ONLY_ENABLED] ──► [Soft DB Flag: SystemSetting] ──► [Pilot Gate: ALLOWED_PILOT_USER_IDS] ──► [Rate Limiter] ──► [AI Controller]
```

1. **State 1 (Hoạt động bình thường):** `AI_READ_ONLY_ENABLED="true"` + `SystemSetting.aiReadOnlyEnabled = true` $\rightarrow$ Request thành công (`allowed: true`).
2. **State 2 (Soft Kill-switch ngắt tức thời qua DB):** Quản trị viên đổi `SystemSetting.aiReadOnlyEnabled = false` $\rightarrow$ Request trên cùng process bị chặn ngay lập tức (`allowed: false`, mã lỗi `FEATURE_DISABLED`).
3. **State 3 (Soft Kill-switch bật lại):** Đổi lại `SystemSetting.aiReadOnlyEnabled = true` $\rightarrow$ Request hoạt động trở lại bình thường mà không cần khởi động lại server.
4. **State 4 (Hard Kill-switch môi trường):** Cấu hình `AI_READ_ONLY_ENABLED="false"` trong môi trường $\rightarrow$ Luôn chặn request ngay lập tức kể cả khi DB setting đang bật (Hard switch luôn thắng).
5. **State 5 (Pilot Cohort Enforcement):** Chỉ 4 `User.id` hợp lệ được phép truy cập, các tài khoản ngoài danh sách hoặc tài khoản inactive bị chặn với `403 PILOT_COHORT_RESTRICTED`.

---

## 3. AUDIT BẢO MẬT CREDENTIAL VÀ MÃ NGUỒN (SECRET SCAN AUDIT)

1. **Quét toàn bộ Repository:**
   - Quét tìm toàn bộ mã nguồn (`src/`), script (`scripts/`), tài liệu markdown (`*.md`) và fixtures: **0 credential hoặc mật khẩu cũ còn sót lại**.
   - Mật khẩu QA mới của `hr_qa_user` được lưu trữ cục bộ, không xuất hiện trong bất kỳ file nào được Git quản lý.
2. **Kiểm tra tệp `.env*` trong Git:**
   - `git ls-files ".env*"` xác nhận chỉ có 2 tệp mẫu: `.env.example` và `.env.e2e.example`. Tất cả các tệp cấu hình thực tế (`.env.local`, `.env.hr-qa.local`) đều được `.gitignore` bảo vệ tuyệt đối.

---

## 4. MA TRẬN PHÁT HÀNH TỔNG HỢP (PILOT RELEASE MATRIX)

```
Test Files  96 passed (96)
     Tests  603 passed (603)
  Duration  7.09s (0 FAIL, 0 SKIP)
```

| Cổng kiểm soát (Release Gate) | Tiêu chuẩn đánh giá | Kết quả thực tế | Trạng thái Gate |
| :--- | :--- | :---: | :---: |
| **1. Operator Option B Decision** | Xác nhận chính thức từ Operator | Đã ghi nhận Option B | **PASS** |
| **2. Pilot Active Cohort** | 4 tài khoản `isActive: true`, `deletedAt: null` | 4 User.id chuẩn khớp DB | **PASS** |
| **3. Non-Pilot Cohort Block** | Người dùng ngoài cohort bị chặn `403` | Chặn `PILOT_COHORT_RESTRICTED` | **PASS** |
| **4. Runtime Kill Switch** | 4 trạng thái ENV/DB/Rate-limit | Đã chứng minh qua test | **PASS** |
| **5. Secret & Credential Audit** | 0 secret bị commit/tracked | Clean 100% | **PASS** |
| **6. AI Foundation Core Tests** | 11 tệp kiểm thử chuyên sâu | 80/80 tests PASS | **PASS** |
| **7. Full Repository Regression** | Toàn bộ 96 test files | 603/603 tests PASS | **PASS** |
| **8. Browser Mock E2E (Playwright)** | 7 luồng giao diện AI Drawer | 7/7 tests PASS | **PASS** |
| **9. Static Gates (TSC / Lint / Build)** | 0 type error, 0 lint error, build 157 routes | Hoàn thành trong 27.1s | **PASS** |
| **10. Database State Invariant** | 21 Projects, 15 Users, 12 Employees | 0 mutation, nguyên vẹn | **PASS** |
| **11. Real OpenAI Remote Gate** | Gọi API OpenAI thật không dùng Mock | **Chưa có `OPENAI_API_KEY`** | **BLOCKED_NO_KEY** |
| **12. Browser Remote OpenAI Smoke** | Luồng giao diện thật qua OpenAI API | **Chưa chạy (thiếu key)** | **NOT RUN** |

---

## 5. TRẢ LỜI ĐẦY ĐỦ CÁC CÂU HỎI NGHIỆM THU

1. **Operator Option B đã được ghi nhận chưa?**  
   $\rightarrow$ **ĐÃ GHI NHẬN CHÍNH THỨC.** Áp dụng Option B (Pilot ADMIN + CHIEF_COMMANDER). Không tạo nhân sự giả, không sửa role nhân sự hiện hữu.
2. **Chính xác Pilot cohort có những account active nào?**  
   $\rightarrow$ Gồm 4 tài khoản duy nhất: **Admin XĐ** (`cmroatu6r0000mowklk61sv56`), **Chỉ huy trưởng Lê Mạnh Hùng** (`cmsraldrt00149ck5366am56m`), **Chỉ huy trưởng Đoàn Văn Giang** (`cmsraldzc00189ck5o32c3npg`), **Chỉ huy trưởng Lê Trọng Hạ** (`cmsrale6l001e9ck5qmdgebtn`).
3. **OpenAI remote thật đã chạy chưa?**  
   $\rightarrow$ **CHƯA CHẠY.** Server chưa cấu hình `OPENAI_API_KEY` trong `.env.local`. Script trả về `BLOCKED_NO_KEY`.
4. **Model/provider runtime là gì?**  
   $\rightarrow$ Provider: `openai` (Remote), Model: `gpt-4o-mini` (hoặc cấu hình qua `AI_MODEL_NAME`).
5. **Golden 5 đúng tool bao nhiêu?**  
   $\rightarrow$ Suite kiểm thử [live-openai-suite.ts](file:///d:/construction-erp-v2/scripts/qa/live-openai-suite.ts) đã sẵn sàng để đối soát `actualTool === expectedTool` và `toolCalls >= 1` ngay khi có key.
6. **Commander có đọc Project ngoài scope không?**  
   $\rightarrow$ **CHẮC CHẮN KHÔNG.** Bị chặn ngay tại Server-side Tool Gateway với `403 / PROJECT_SCOPE_DENIED`.
7. **Prompt injection có vượt backend policy không?**  
   $\rightarrow$ **KHÔNG.** Session `User.role` và policy engine máy chủ luôn giữ quyền quyết định tối cao.
8. **raw_sql có xuất hiện trong tool schema không?**  
   $\rightarrow$ **TUYỆT ĐỐI KHÔNG.** Chỉ export đúng 5 công cụ Read-only.
9. **Browser OpenAI Remote đã PASS chưa?**  
   $\rightarrow$ **CHƯA CHẠY.** Đang chờ cấu hình key để chạy cùng remote endpoint.
10. **Network có leak secret/PII không?**  
    $\rightarrow$ **PASS.** Payload không chứa `OPENAI_API_KEY`, `DATABASE_URL`, mật khẩu, lương hay CCCD.
11. **Runtime kill switch thực sự hoạt động thế nào?**  
    $\rightarrow$ Hard ENV flag chặn toàn diện $\rightarrow$ Soft DB flag ngắt tức thời trên cùng process $\rightarrow$ Pilot allowlist lọc theo `User.id`.
12. **Full regression cuối còn FAIL/SKIP không?**  
    $\rightarrow$ **0 FAIL, 0 SKIP** (603/603 tests PASS trên 96 test files).
13. **Business DB có mutation không?**  
    $\rightarrow$ **0 MUTATION.** Toàn bộ 21 công trình và 15 tài khoản nguyên vẹn.
14. **Có đủ điều kiện GO Pilot Option B chưa?**  
    $\rightarrow$ **CHƯA ĐỦ ĐIỀU KIỆN (NO-GO).** Còn 1 rào cản duy nhất: Cấu hình `OPENAI_API_KEY` để kích hoạt Remote Gate.

---

## 6. QUYẾT ĐỊNH PHÁT HÀNH CUỐI CÙNG

$$\mathbf{AI\ READ\text{-}ONLY\ INTERNAL\ PILOT\ (OPTION\ B)\ =\ NO\text{-}GO\ (BLOCKED\ ON\ OPENAI\ KEY)}$$

### Hướng dẫn kích hoạt dành cho Operator:
1. Thêm khóa API vào tệp bí mật `.env.local` trên server:
   ```bash
   OPENAI_API_KEY="sk-proj-..."
   AI_MODEL_NAME="gpt-4o-mini"
   ```
2. Thực thi lệnh kiểm thử Live Remote OpenAI:
   ```powershell
   npx tsx scripts/qa/live-openai-suite.ts
   ```
Ngay khi lệnh trên trả về `PASS`, hệ thống sẽ sẵn sàng 100% để chuyển trạng thái sang **GO**.
