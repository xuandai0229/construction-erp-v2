# HR Test Strategy — Chiến Lược Kiểm Thử Vô Điều Kiện Cho Phân Hệ Nhân Sự

**Phiên bản:** 1.0.0  
**Tác giả:** Kỹ Sư Kiểm Thử Tự Động & Kiểm Định Phát Hành  
**Trạng thái:** Chính thức  

---

## I. TỔNG QUAN HỆ THỐNG KIỂM THỬ THỜI TIME REAL

Mọi mã nguồn của phân hệ HR trước khi được duyệt phát hành bắt buộc phải trải qua quy trình kiểm thử tự động 5 tầng:

```
[1. Unit & Service Tests] ──► [2. Integration & Scope Tests] ──► [3. Playwright E2E UI] ──► [4. Concurrency & Security] ──► [5. Production Build Verification]
```

---

## II. CHI TIẾT 15 TIÊU CHÍ KIỂM THỬ BẮT BUỘC

1. **Unit Test (Vitest):** Đạt 100% pass cho các hàm tiện ích (`effective-date-helper`, `employee-code-generator`, `pii-encryption`).
2. **Domain Service Test:** Kiểm tra các bất biến nghiệp vụ (vô hiệu hóa chức danh đang dùng, tạo phòng ban vòng lặp).
3. **Database Integration Test:** Thực thi trên Isolated QA Database (`QA_DATABASE_URL`). Tuyệt đối không chạy mutation test trên `DATABASE_URL` chính.
4. **Permission Test:** Kiểm tra chặn truy cập khi thiếu mã quyền (`hr:employee:read`, `hr:organization:manage`...).
5. **Data Scope Test:** Kiểm tra lọc đúng bản ghi theo `ALL_EMPLOYEES`, `OWN_ORGANIZATION_UNIT`, `SELF_ONLY`, `NONE`.
6. **Target Scope Guard Test:** Kiểm tra chặn IDOR khi người dùng truyền ID ngoài Data Scope vào Server Action.
7. **Audit Sanitizer Test:** Kiểm tra không lọt PII (CCCD, password) vào bản ghi `AuditLog`.
8. **Concurrency Test:** Kiểm tra 2 request bổ nhiệm hoặc 2 request sinh mã nhân viên đồng thời không gây race condition.
9. **Authenticated Playwright UI Test:** Kiểm tra giao diện người dùng đăng nhập thực tế.
10. **Multi-user E2E Test:** Kiểm tra tương tác giữa các tài khoản có vai trò khác nhau (Admin vs Trưởng phòng vs Staff).
11. **Responsive Test:** Kiểm tra 5 viewports (1440x900, 1280x800, 1024x768, 768x1024, 390x844). Không bị overflow ngang.
12. **Console Error Test:** Không có lỗi uncaught Javascript trên Browser Console.
13. **Network Error Test:** Không có response HTTP status 500/502/504 bất thường.
14. **QA Zero-Orphan Cleanup Test:** Đảm bảo toàn bộ fixture rác sau khi test được dọn dẹp sạch sẽ (0 orphan records).
15. **Production Build Test:** Chạy `npm run build` thành công không có lỗi TypeScript hay Next.js bundle errors.

---

## III. QUY TẮC AN TOÀN QA DATABASE (QA SAFETY)

- Script test mutation chỉ được chạy khi `QA_DATABASE_URL` tồn tại và trỏ tới Database có chứa các từ khóa an toàn: `qa`, `test`, `e2e`, `sandbox`.
- Cấm fallback từ `QA_DATABASE_URL` sang `DATABASE_URL` chính khi thực hiện các lệnh Ghi / Sửa / Xóa dữ liệu.
- Chuẩn hóa so sánh URL target bằng so sánh Canonical Target (Protocol, Host, Port, Database Name, Schema) thay vì so sánh chuỗi thô.
- Khối dọn dẹp dữ liệu QA (Cleanup) phải nằm trong `try/finally`, `afterEach` hoặc `afterAll`.
