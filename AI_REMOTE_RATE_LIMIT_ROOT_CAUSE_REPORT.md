# AI REMOTE RATE-LIMIT ROOT CAUSE AUDIT REPORT
**Absolute Root-Cause Audit — Không đoán, Không fix mù**

* **Ngày kiểm toán:** 2026-08-21
* **Repository:** `construction-erp-v2`
* **Trạng thái hệ thống:** `PILOT_REMOTE`
* **Vấn đề được báo cáo:** UI hiển thị *"OpenAI Remote"* và thông báo *"Dịch vụ AI từ xa đang giới hạn lưu lượng. Vui lòng thử lại sau."*

---

## 1. Trả lời 4 Câu hỏi Trọng tâm của Operator

### Câu 1: Vì sao UI vẫn ghi "OpenAI Remote"?
* **Bằng chứng mã nguồn:** [ai-assistant-drawer.tsx](file:///d:/construction-erp-v2/src/components/ai/ai-assistant-drawer.tsx#L62-L66)
```ts
const statusLabel = providerStatus.blockedReason === "BLOCKED_NO_KEY"
  ? "Remote bị khóa"
  : providerStatus.mock
    ? "Mô phỏng local"
    : "OpenAI Remote"; // <-- Hardcoded string
```
* **Kết luận:** Badge `"OpenAI Remote"` bị **hardcode dạng chuỗi tĩnh** trong component `AIAssistantDrawer` mỗi khi `mock === false`, thay vì hiển thị động theo provider/model runtime (`providerStatus.provider` hoặc `modelName`).
* **Đánh giá:** `PROVIDER_UI_MISMATCH = TRUE`.

---

### Câu 2: Request thực tế đang đi tới OpenAI, Gemini, Groq hay provider nào?
* **Bằng chứng:**
  * Tiến trình `npm run dev` đang chạy liên tục từ **25+ phút trước**.
  * Trong Node.js/Next.js runtime, biến môi trường `process.env` được nạp vào memory một lần duy nhất lúc khởi động tiến trình.
  * 25 phút trước, khi `npm run dev` khởi động, `.env.local` đang chứa cấu hình trỏ tới **OpenAI Platform (`https://api.openai.com/v1/chat/completions`)** với model `gpt-5.6-terra`.
  * Khi người dùng bấm *"Tình hình hôm nay?"* trên giao diện Browser, request từ Browser đi qua Next.js Server process cũ $\rightarrow$ **gọi trực tiếp tới OpenAI API thật (`api.openai.com`)**.

---

### Câu 3: Lỗi 429 xuất phát từ App Rate-Limit hay Nhà cung cấp?
* **Bằng chứng đối soát thông điệp lỗi:**
  1. **App Internal Rate Limiter** ([ai-guard.ts](file:///d:/construction-erp-v2/src/lib/ai/controller/ai-guard.ts#L68-L70)):
     * Mã lỗi: `RATE_LIMITED` (HTTP 429)
     * Thông điệp: *"Bạn đã vượt quá số lượt yêu cầu cho phép (tối đa 10 lượt/phút). Vui lòng đợi trong giây lát."*
  2. **Remote Provider Error Mapper** ([openai-provider.ts](file:///d:/construction-erp-v2/src/lib/ai/provider/openai-provider.ts#L66-L74)):
     * Mã lỗi: `PROVIDER_RATE_LIMITED` (HTTP 503)
     * Thông điệp: **`"Dịch vụ AI từ xa đang giới hạn lưu lượng. Vui lòng thử lại sau."`**
  3. **Phản hồi thực tế từ OpenAI API:**
     * Khi gọi OpenAI API với key hiện tại, OpenAI trả về mã `HTTP 429` kèm body:
     ```json
     {
       "error": {
         "message": "Your account is not active, please check your billing details on our website.",
         "type": "billing_not_active",
         "code": "billing_not_active"
       }
     }
     ```
* **Kết luận:** Lỗi **100% xuất phát từ Nhà cung cấp OpenAI** (mã `HTTP 429 billing_not_active` do tài khoản chưa nạp số dư trả trước), sau đó được `mapOpenAIHttpFailure` chuyển thành thông điệp `"Dịch vụ AI từ xa đang giới hạn lưu lượng"`. App rate-limiter hoàn toàn không kích hoạt trong ca này.

---

### Câu 4: Có phải process hiện tại đang chạy env/config cũ không?
* **Bằng chứng:**
  * **CÓ (STALE_RUNTIME_ENV = TRUE)**.
  * Tiến trình Next.js server (`npm run dev`) được bật trước thời điểm cập nhật `.env.local`. Do đó, Next.js server chưa nạp cấu hình mới sang Groq.

---

## 2. Bảng Tổng hợp Ma trận Kiểm toán (Audit Matrix)

| Hạng mục | Trạng thái / Giá trị thực tế | Bằng chứng kiểm toán |
| :--- | :--- | :--- |
| `CONFIGURED_PROVIDER` | `groq` (trong `.env.local`) | `.env.local` line `AI_PROVIDER="groq"` |
| `ACTUAL_RUNTIME_IN_NEXTJS` | `openai` (do process chưa restart) | `npm run dev` PID running >25 mins |
| `CONFIGURED_MODEL` | `openai/gpt-oss-20b` | `scratch/full-audit.ts` output |
| `ACTUAL_MODEL_IN_NEXTJS` | `gpt-5.6-terra` | In-memory `process.env` của Next.js process |
| `REMOTE_MODE` | `true` | `providerStatus.remote === true` |
| `MOCK_MODE` | `false` | `providerStatus.mock === false` |
| `UI_BADGE_CORRECT?` | **NO (Hardcoded "OpenAI Remote")** | `ai-assistant-drawer.tsx:L66` |
| `429_SOURCE` | **PROVIDER (OpenAI `billing_not_active`)** | Log OpenAI endpoint trả 429 billing |
| `APP_RATE_LIMITED?` | **NO** | User gọi 1 request, guard log trống |
| `STALE_ENV?` | **YES** | Cần restart tiến trình dev server |
| `PROVIDER_MODEL_MISMATCH?` | **NO** (Đã đồng bộ trong adapter) | Allowlist bao gồm cả GPT-5.6 và OSS models |
| `ORCHESTRATION_AMPLIFICATION?` | **NO** | Controller giới hạn chặt chẽ 1-3 tool rounds |

---

## 3. Kế hoạch Khắc phục Chuẩn xác (Action Plan)

1. **Sửa UI Badge:** Cập nhật `ai-assistant-drawer.tsx` để hiển thị động tên provider/model runtime (ví dụ: `"Groq (GPT-OSS-20B)"` hoặc `"OpenAI (GPT-5.6-Terra)"` thay vì chuỗi cố định).
2. **Khởi động lại Next.js Dev Server:** Restart tiến trình `npm run dev` để máy chủ nạp biến môi trường mới.
3. **Phân biệt rõ ràng mã lỗi Quota vs Rate-limit:** Bổ sung xử lý `billing_not_active` / `insufficient_quota` trong `mapOpenAIHttpFailure` để báo đúng: *"Dịch vụ AI chưa khả dụng do giới hạn tài khoản nhà cung cấp"* thay vì gộp chung vào *"giới hạn lưu lượng"*.
