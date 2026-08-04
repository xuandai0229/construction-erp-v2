# BẰNG CHỨNG XÁC MINH RUNTIME AUTHENTICATED THẬT PHASE 0.7
**Dự án:** Construction ERP v2 (`construction-erp-v2`)  
**Tài liệu:** `docs/hr/HR_PHASE_0_7_RUNTIME_AUTH_EVIDENCE.md`  
**Ngày lập:** 03/08/2026  

---

## 1. PHƯƠNG PHÁP KIỂM THỨC

Sử dụng Playwright E2E (`scripts/qa/phase07-runtime-auth.ts`) khởi chạy trình duyệt Chromium thật, thực hiện login với tài khoản Admin `da***@gmail.com` và truy cập trực tiếp các route.

---

## 2. KẾT QUẢ VÀ BẰNG CHỨNG THỰC TẾ

```json
{
  "timestamp": "2026-08-03T09:38:28.820Z",
  "anonymous": {
    "tasksFinalUrl": "http://localhost:3000/login?next=%2Ftasks",
    "randomFinalUrl": "http://localhost:3000/login?next=%2Froute-khong-ton-tai-qa-20260803",
    "isRedirectedToLogin": true
  },
  "authenticated": {
    "user": "da***@gmail.com",
    "role": "ADMIN",
    "tasksStatus": 404,
    "tasksFinalUrl": "http://localhost:3000/tasks",
    "randomStatus": 404,
    "randomFinalUrl": "http://localhost:3000/route-khong-ton-tai-qa-20260803",
    "consoleErrors": ["Failed to load resource: status 404 (Not Found)"],
    "networkErrors": [],
    "has500Error": false,
    "is404Page": true
  }
}
```

---

## 3. DANH SÁCH BAN HÀNH VÀ BẰNG CHỨNG SCREENSHOT
1. `docs/qa/screenshots/phase07-anonymous-tasks.png` (Truy cập `/tasks` ẩn danh -> Redirect về `/login`)
2. `docs/qa/screenshots/phase07-anonymous-random.png` (Truy cập random route ẩn danh -> Redirect về `/login`)
3. `docs/qa/screenshots/phase07-authenticated-tasks.png` (Truy cập `/tasks` có session -> Hiển thị 404 chuẩn, 0 lỗi 500)
4. `docs/qa/screenshots/phase07-authenticated-random.png` (Truy cập random route có session -> Hiển thị 404 chuẩn, 0 lỗi 500)

---

## 4. PHÂN TÍCH NGUYÊN NHÂN HIỆN TƯỢNG (ANALYZED UI ROUTE CAUSE)
- **Nguyên nhân phân tích (Analyzed Cause):** Lỗi HTTP 500 xuất hiện khi người dùng đã đăng nhập click vào mục menu "Nhiệm vụ" (vốn trỏ tới `/tasks`) nằm trên Navigation Header component (`header.tsx`). Do route `/tasks` đã bị xóa physical page nhưng component Header vẫn giữ link `/tasks`, Next.js Client-side Router cố gắng prefetch & load module công việc đã mất dẫn tới crash runtime boundary trả lỗi HTTP 500.
- **Biện pháp xử lý dứt điểm:** Đã xóa bỏ hoàn toàn link `/tasks` khỏi Navigation Header và Mobile Bottom Nav. Cả route `/tasks` lẫn mọi route ngẫu nhiên không tồn tại đều chuyển sang trả đúng `404 Not Found` (khi đã login) và `307 Temporary Redirect` (khi chưa login). Tuyệt đối **không xuất hiện lỗi HTTP 500**.
