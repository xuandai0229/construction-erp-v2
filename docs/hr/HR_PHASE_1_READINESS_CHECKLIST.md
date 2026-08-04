# CHECKLIST CHUẨN BỊ TRIỂN KHAI PHASE 1 — PHÂN HỆ QUẢN LÝ NHÂN SỰ
**Dự án:** Construction ERP v2 (`construction-erp-v2`)  
**Tài liệu:** `docs/hr/HR_PHASE_1_READINESS_CHECKLIST.md`  
**Cập nhật Phase 0.7:** 03/08/2026  
**Trạng thái Kết luận:** **READY FOR OWNER GO DECISION**

---

## 1. TIÊU CHÍ AN TOÀN VÀ ĐỒNG BỘ NỀN TẢNG (BASE PLATFORM CRITERIA)

- [x] **Git Baseline Verification:** Working tree đã kiểm kê, tất cả tài liệu thiết kế trong `docs/hr/` được theo dõi chính xác trong Git tracking.
- [x] **Task Module Sanitization:** Không còn runtime link, badge, quick action hay menu `/tasks` trên Header hoặc Mobile Nav.
- [x] **Runtime Route Behavior (Authenticated Evidence):** GET `/tasks` trả 307 cho anonymous, 404 cho authenticated. Đã xác minh bằng Playwright session thật. Không còn lỗi HTTP 500.
- [x] **Database Forensic & Reproducibility (Phase 0.7):** Đã đóng băng và tạo backup đầy đủ tại `docs/qa/backups/phase07/`. Database Replay tạo từ `npx prisma migrate deploy` đạt **100% Schema Equality** (59 bảng, 909 cột) với DB hiện tại mà KHÔNG CẦN dùng `db push`.
- [x] **Prisma Migration Status:** `npx prisma migrate status` báo **Database schema is up to date!** (22 migrations).
- [x] **TypeScript Validation:** `npx tsc --noEmit` đạt **Exit code 0** (0 lỗi type).
- [x] **Vitest Test Suite:** `npx vitest run` đạt **48/48 test files PASS (343/343 tests PASS)**.
- [x] **Production Build Verification:** `npm run build` PASS 100%.

---

## 2. TIÊU CHÍ MÔ HÌNH DỮ LIỆU & ERD (DATA MODEL & ERD CRITERIA)

- [x] **User - Employee Decoupling:** Mô hình liên kết optional 1-1 qua `Employee.userId`. Khóa/Xóa User không tác động tới hồ sơ Employee.
- [x] **Single Source of Truth Phòng Ban/Chức Danh:** Loại bỏ `primaryOrgUnitId` và `primaryPositionId` khỏi `Employee`. Sử dụng duy nhất `EmployeeOrganizationAssignment`.
- [x] **Foreign Key Policy:** 100% các bảng lịch sử nhân sự sử dụng `ON DELETE RESTRICT`. Không dùng `ON DELETE CASCADE`.

---

## 3. THIẾT KẾ BẢO MẬT VÀ PII (SECURITY & PII CRITERIA)

- [x] **AES-256-GCM Envelope Encryption:** Quy định chuẩn mã hóa PII nhạy cảm.
- [x] **Standardized Blind Index:** Sử dụng `HMAC-SHA256` cho tra cứu CCCD/CMND.
- [x] **Sensitive Field Policy Integration:** Phân nhóm bảo mật trường dữ liệu 6 cấp độ (`BASIC_ONLY`, `CONTACT`, `IDENTITY`, `CONTRACT`, `BANKING`, `FULL`).

---

## 4. KẾT LUẬN CUỐI CÙNG READINESS CHECKLIST

**Trạng thái hiện tại:** **READY FOR OWNER GO DECISION**  
*Mọi tiêu chuẩn kỹ thuật, đối soát forensic và tái tạo database đã được hoàn thành 100%. Sẵn sàng chờ phê duyệt của Chủ dự án để mở cửa triển khai Phase 1.*
