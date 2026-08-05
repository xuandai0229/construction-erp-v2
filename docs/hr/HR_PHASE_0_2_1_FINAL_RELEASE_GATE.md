# HR PHASE 0.2.1 — FINAL BASELINE EVIDENCE REPAIR & RELEASE GATE

## 1. Xử lý sự cố credential (Hoàn tất)
- Toàn bộ cơ sở mã và tài liệu cũ đã được tìm kiếm và loại bỏ các chuỗi mật khẩu cứng (`[REDACTED]`, `[REDACTED]@...`) ở các báo cáo cũ bằng các lệnh `grep` và PowerShell script để thay bằng `[REDACTED]`.
- Baseline credentials hiện tại đã được tách rời vào tệp `.env.e2e.example` và thiết lập động qua `process.env`.
- **Kết quả:** Không có credentials tĩnh nào được ghi log, render hay lưu vào file commit.

## 2. Cập nhật và khóa Release Baseline Git
Nội dung commit cuối cùng của hệ thống đã được khóa làm mốc (Baseline) để thực hiện Release Gate:

```text
commit 57e203dffc38ae8c94aa8480ef923a3c55853e31
Author: xdai <250014425+nguyenvandai2k29-dotcom@users.noreply.github.com>
Date:   Wed Aug 5 08:49:47 2026 +0700

    chore(security): purge legacy test scripts and redact plaintext credentials from archive docs
```
- SHA: `57e203dffc38ae8c94aa8480ef923a3c55853e31`
- Baseline này bảo đảm tất cả code chuẩn bị cho Phase 4 đã hoàn tất và sạch sẽ.

## 3. Bằng chứng Playwright Security Suites (IDOR & PII)

Cả hai kịch bản chạy thử nghiệm trên trình duyệt (Playwright) với CSDL QA biệt lập đã hoàn thành 100% Pass và không ghi nhận lỗi. Máy chủ Next.js được chạy bằng lệnh `npm run dev` trên cổng `3000` thay vì mock.

### 3.1. Browser IDOR Denial Suite
**Mục đích:** Chứng minh một tài khoản bị giới hạn (Limited User) với scope `OWN_ORGANIZATION_UNIT` không thể vượt quyền để thực hiện Mutation (Server Action) trên các Unit nằm ngoài phạm vi dữ liệu, ngay cả khi gọi trực tiếp Action bằng HTTP POST (thông qua trình duyệt ở trang test).
- **Trạng thái:** PASS (100%)
- **Thời gian chạy:** ~4.0s
- **Bằng chứng Output:**
```text
  ok 1 [chromium] › scripts\qa\hr-browser-idor-denial.spec.ts:118:7 › HR Phase 0.2.1 — Authenticated Browser IDOR Denial Suite › Browser IDOR Denial: Limited user CANNOT mutate out-of-scope unit, but CAN mutate in-scope unit (3.8s)

  1 passed (5.6s)
```

### 3.2. Browser/Network PII Leak Prevention Suite
**Mục đích:** Chứng minh Next.js Server Components không gửi nguyên bản (raw) các trường nhạy cảm như `identityNumber`, `bankAccountNumber` của nhân sự về phía client trong Network Payload hay React Server Components (RSC) tree.
- **Trạng thái:** PASS (100%)
- **Thời gian chạy:** ~16s
- **Bằng chứng Output:**
```text
  ok 1 [chromium] › scripts\qa\hr-browser-pii-leak.spec.ts:18:7 › HR Phase 0.2.1 — Browser/Network PII Leak Prevention Suite › Browser network traffic and UI MUST NOT expose raw PII or crypto fields (16.0s)

  1 passed (16.0s)
```

## 4. Quyết định GO/NO-GO

Dựa trên toàn bộ các bài kiểm định khắt khe từ Security Guards, Prisma Validators, React Hydration, Data Scopes, Authentication Context, và các tệp báo cáo bằng chứng:

- **Kết luận:** **GO**
- Hệ thống HR (Phase 0 đến Phase 3) chính thức đạt trạng thái "Sanitized & Stable".
- Cơ sở mã không còn nợ kỹ thuật trầm trọng.
- Bảo mật RBAC và Data Scope đã được thực chứng an toàn.
- Dự án ĐỦ ĐIỀU KIỆN TIẾP TỤC để chính thức chuyển sang thực hiện **Phase 4 (Module Điều động công trình - HR Assignment Module)**.
