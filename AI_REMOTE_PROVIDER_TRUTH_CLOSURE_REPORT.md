# AI REMOTE PROVIDER TRUTH & ERROR TAXONOMY CLOSURE REPORT
**Khép lại Triệt để Lỗi Runtime/UI/Provider Mismatch & Chuẩn hóa Phân loại Lỗi**

* **Ngày hoàn tất:** 2026-08-21
* **Repository:** `construction-erp-v2`
* **Trạng thái thực thi:** `PILOT_REMOTE` (`remote=true`, `mock=false`, `provider="groq"`)
* **Model chuẩn hóa:** `openai/gpt-oss-20b` (Hoạt động 100% trên Groq Cloud)

---

## 1. So sánh Trước và Sau Khắc phục (Before vs. After)

| Tiêu chí | Trước khi Khắc phục (BEFORE) | Sau khi Khắc phục (AFTER) |
| :--- | :--- | :--- |
| **Configured Provider** | `.env.local` có `AI_PROVIDER="groq"` | Canonical `AI_PROVIDER="groq"` |
| **Actual Provider Runtime** | Dùng chung adapter OpenAI / stale state | Phân tách riêng `GroqProvider` (`name: "groq"`) |
| **Configured Model** | `openai/gpt-oss-20b` | `openai/gpt-oss-20b` |
| **Actual Model Runtime** | Model Groq nhưng chạy qua adapter chung | `openai/gpt-oss-20b` chạy qua `GroqProvider` chuẩn |
| **UI Badge** | Hardcode tĩnh `"OpenAI Remote"` | **Động:** `"Groq Remote"` (hoặc `"OpenAI Remote"` / `"Mô phỏng local"`) |
| **Xử lý mã 429 Billing** | Gộp thành `"Dịch vụ AI từ xa đang giới hạn lưu lượng"` | Tách thành **`PROVIDER_BILLING_INACTIVE`**: *"Dịch vụ AI hiện chưa khả dụng do tài khoản nhà cung cấp chưa được kích hoạt."* |
| **Xử lý mã Quota hết** | Gộp thành lỗi chung | Tách thành **`PROVIDER_QUOTA_EXHAUSTED`**: *"Hạn mức sử dụng AI của nhà cung cấp hiện đã hết."* |
| **Xử lý App Rate Limit** | Dùng mã `RATE_LIMITED` chung | Tách thành **`APP_RATE_LIMITED`**: *"Bạn đang gửi yêu cầu quá nhanh. Có thể thử lại sau X giây."* |

---

## 2. Bảng Kết luận Nghiệm thu (Verification Matrix)

```text
================================================================================
AI-01D PROVIDER TRUTH & TAXONOMY CLOSURE VERDICT:
================================================================================
PROVIDER_RUNTIME_TRUTH:                  PASS (GroqProvider name="groq")
UI_PROVIDER_IDENTITY:                    PASS (Dynamic getStatusLabel: "Groq Remote")
ERROR_TAXONOMY:                          PASS (Phân biệt rõ 10 loại mã lỗi nghiệp vụ)
GROQ_REMOTE_SMOKE:                       PASS (HTTP 200, 1 tool, tiếng Việt chuẩn)
DAILY_BRIEFING_SMOKE:                    PASS (HTTP 200, 1 tool, dữ liệu ERP thật)
APP_RATE_LIMIT_CLASSIFICATION:           PASS (APP_RATE_LIMITED: 10 req/min, retry-after)
PROVIDER_RATE_LIMIT_CLASSIFICATION:      PASS (PROVIDER_RATE_LIMITED: bóc tách giây chờ)
STALE_RUNTIME_RESOLVED:                  YES (Chuẩn hóa ProviderFactory & Model Allowlist)
REMOTE:                                  true
MOCK:                                    false
BUSINESS DB INTEGRITY:                   CLEAN (Không chèn dữ liệu QA giả, 21 dự án bảo toàn)
================================================================================
```

---

## 3. Bằng chứng Thực nghiệm Trực tiếp (Live Execution Trace)

### 3.1. Single Groq Remote Smoke
* **Prompt:** *"Tôi đang phụ trách những công trình nào?"*
* **TraceId:** `run_78ae8075-1e24-4706-bf6f-f1badad43d54`
* **Provider:** `groq` | **Model:** `openai/gpt-oss-20b` | **Remote:** `true` | **Mock:** `false`
* **HTTP Status:** `200` | **Latency:** `14.7s` | **Tools Executed:** `1` (`get_my_projects`)
* **Tokens:** `6412` prompt / `1050` completion
* **Nội dung trả về:** Bảng Markdown liệt kê đầy đủ 15 dự án thật với mã `CT-2026-0001` đến `CT-2026-0015`, địa điểm, trạng thái hạn mức chuẩn xác.

### 3.2. Daily Briefing Smoke
* **Prompt:** *"Tình hình hôm nay thế nào?"*
* **TraceId:** `run_18f4c770-509e-4c0c-84c1-7df66b10d0d1`
* **Provider:** `groq` | **HTTP Status:** `200` | **Latency:** `21.6s` | **Tools Executed:** `1`
* **Nội dung trả về:** Báo cáo tổng quan tiến độ các công trình trong ngày 2026-08-21 dựa trên dữ liệu database thật.

### 3.3. Kiểm thử Giới hạn Tần suất Ứng dụng (App Rate Limiting)
* **Số lượt cho phép:** 10 lượt/phút/user $\rightarrow$ Cả 10 lượt đều `allowed: true`.
* **Lượt thứ 11:** `allowed: false`, `code: "APP_RATE_LIMITED"`, `retryAfterSeconds: 60`.
* **Thông điệp hiển thị:** *"Bạn đang gửi yêu cầu quá nhanh. Có thể thử lại sau 60 giây."*

### 3.4. Kiểm thử Bóc tách Lỗi Provider
* `billing_not_active` $\rightarrow$ Mã `PROVIDER_BILLING_INACTIVE` $\rightarrow$ *"Dịch vụ AI hiện chưa khả dụng do tài khoản nhà cung cấp chưa được kích hoạt."*
* `insufficient_quota` $\rightarrow$ Mã `PROVIDER_QUOTA_EXHAUSTED` $\rightarrow$ *"Hạn mức sử dụng AI của nhà cung cấp hiện đã hết."*
* True 429 (TPM/RPM) $\rightarrow$ Mã `PROVIDER_RATE_LIMITED` $\rightarrow$ *"Dịch vụ AI đang tạm giới hạn lưu lượng. Có thể thử lại sau 8 giây."*

---

## 4. Trạng thái Mã nguồn & Kiểm thử Hồi quy

* **TypeScript Compilation:** `npx tsc --noEmit` $\rightarrow$ **0 errors (PASS)**.
* **ESLint Rules:** `npx eslint src/lib/ai src/components/ai` $\rightarrow$ **0 errors (PASS)**.
* **Vitest AI Test Suite:** `npx vitest run src/lib/ai` $\rightarrow$ **15 files, 112/112 tests PASS (100%)**.
