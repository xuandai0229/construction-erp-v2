# HR Phase 0.2.3 — Credential Incident Closure Report

**Trạng thái Document:** RELEASE CANDIDATE — PENDING FINAL GATE

## 1. Tóm Tắt Khắc Phục Sự Cố Credential

1. **Purge Secret / Plaintext Credential:**
   - Toàn bộ chuỗi mật khẩu hardcoded cũ (`Test@123...`, `"REDACTED"`) đã bị gỡ bỏ khỏi toàn bộ script kiểm thử.
   - Không chèn chuỗi fallback dạng `process.env.E2E_ADMIN_PASSWORD || "REDACTED"`. Thiếu biến môi trường sẽ báo lỗi `BLOCKED` dừng test ngay lập tức.

2. **Cấu Hình QA Database User Least-Privilege:**
   - QA Database User `qa_runner_new` được kiểm tra và xác nhận quyền hạn:
     - `rolsuper = false`
     - `rolcreatedb = false`
     - `rolcreaterole = false`
     - `rolreplication = false`
     - `rolbypassrls = false`
   - QA User được cấp đủ quyền (`SELECT, INSERT, UPDATE, DELETE`) trên các bảng QA DB mà không sở hữu đặc quyền `SUPERUSER`.

3. **Session & Cookie Sanitation:**
   - Xóa bỏ mọi session/cookie cũ và bảo đảm session trong các bài test Playwright được sinh mới dựa trên `process.env.E2E_ADMIN_PASSWORD`.

4. **Zero Match Credential Scan:**
   - Quét toàn bộ working tree bằng `grep_search`: 0 kết quả lộ secret plaintext.
