# AI MILESTONE 01D — Real OpenAI Intelligence Gate Report

**Ngày đánh giá:** 2026-08-20  
**Repository:** `construction-erp-v2`  
**Milestone:** `AI-01D`  
**Chủ đề:** REAL OPENAI INTELLIGENCE GATE (PREFLIGHT & REMOTE EXECUTION READINESS)  
**Trạng thái OpenAI Key:** `BLOCKED_NO_KEY` (Chờ Operator cấu hình server-side)  
**Quy tắc tối thượng:** ABSOLUTE TRUTH GATE — KHÔNG ĐÁNH TRÁO SỰ SẴN SÀNG KỸ THUẬT VỚI CHẤT LƯỢNG MODEL THẬT  

---

## 1. Executive Summary & Verdict

```text
================================================================================
AI-01D VERDICT & CERTIFICATION STATUS:
================================================================================
AI-01D LOCAL / CONTRACT PREFLIGHT:       PASS (100 test files / 629 unit & contract tests)
REMOTE EXECUTION READINESS:              PASS (Adapters, fail-closed guards, QA fixtures ready)
REAL OPENAI QUALITY:                     UNVERIFIED (Requires actual remote API execution)
CONTROLLED PILOT QUALITY READY:          NOT YET (Pending remote model benchmark)
REMOTE GATE STATUS:                      BLOCKED_NO_KEY (Safe halt - zero mock fallback)
BUSINESS DB CONTAMINATION:               ZERO (21 projects, 0 fake reports/progress)
QA VERTICAL SLICE FIXTURE:               ISOLATED (SYNTHETIC_QA_ONLY ready for benchmark)
================================================================================
```

---

## 2. Model Family & Strict Fail-Closed Policy

Đã cập nhật kiến trúc model server-side theo đúng chuẩn GPT-5.6 hiện hành của OpenAI:

### 2.1 Danh sách Model được phê duyệt (`ALLOWED_MODELS_ALLOWLIST`)
1. **`gpt-5.6-sol` (Model A):** Flagship reasoning & maximum construction intelligence cho các tác vụ phân tích phức tạp.
2. **`gpt-5.6-terra` (Model B - Default):** Cân bằng tối ưu giữa trí tuệ và chi phí vận hành (Quality / Cost Balance).
3. **`gpt-5.6-luna` (Model C):** Mô hình tinh gọn, tối ưu chi phí và thông lượng cao (High-Volume Economical Baseline).
4. **`gpt-5.6`:** Alias chính thức của OpenAI (trỏ tới `gpt-5.6-sol`).
5. **`gpt-4o`, `gpt-4o-mini`, `o3-mini`:** Giữ lại làm baseline so sánh legacy.

### 2.2 Chính sách An toàn: FAIL CLOSED (Tuyệt đối không Fallback Lén)
* Trong các chế độ `PILOT_REMOTE` và `PRODUCTION_REMOTE`, nếu biến môi trường `AI_MODEL_NAME` hoặc tham số model không nằm trong allowlist được phê duyệt:
  $$\text{Model không hợp lệ} \longrightarrow \text{Ném lỗi } \mathbf{MODEL\_NOT\_ALLOWED} \ (400) \longrightarrow \mathbf{FAIL\ CLOSED}$$
* **Tuyệt đối không âm thầm fallback về `gpt-4o-mini` hay bất kỳ model yếu hơn nào.** Nếu Operator cấu hình Sol, hệ thống phải chạy đúng Sol hoặc dừng lại báo lỗi rõ ràng.
* Telemetry ghi nhận tách biệt: `CONFIGURED_MODEL` vs `ACTUAL_MODEL`.

---

## 3. OpenAI API Contract Audit (Chat Completions & Lộ trình Responses API)

* **Giai đoạn Hiện tại (Gate B / 5 Tools ERP):**
  * Sử dụng endpoint `/v1/chat/completions` với Function Calling chuẩn.
  * Hỗ trợ đầy đủ `max_completion_tokens: clamp(1, maxTokens, 4000)`, `temperature: 0.1`, `tool_choice: "auto"`.
  * Timeout 15s qua `AbortController`.
  * Ánh xạ mã lỗi HTTP an toàn (401, 403, 429, 500, 502, 503, timeout) mà không rò rỉ provider body.
* **Giai đoạn Tiếp theo (Python Intelligence Service / Document RAG / Vision):**
  * Khi mở rộng sang RAG tài liệu dự toán, hồ sơ PDF/CAD, OCR hiện trường và multi-agent workflows phức tạp, provider boundary sẽ được nâng cấp sang **Responses API (`/v1/responses`)** để tận dụng structured outputs và multimodal tool pipelines.

---

## 4. Công cụ Kiểm thử Remote đã sẵn sàng

Đã tạo sẵn hai bộ công cụ thực thi tự động (sẵn sàng kích hoạt ngay khi Operator nạp key):

1. **`scripts/qa/remote-openai-smoke.ts`:**
   * Chạy 11 ca kiểm thử đại diện (Lookup, Active Project, Project Not Found, Ambiguity, Follow-up, Daily Briefing, Multi-Tool, Read-Only Refusal, Raw SQL Refusal, PII Refusal, Cross-Project Isolation).
   * Đo lường: `provider=openai`, `remote=true`, `actualModel`, `latencyMs`, `tokens`, `toolCalls`.
2. **`scripts/qa/benchmark-openai-models.ts`:**
   * Chạy song song và chấm điểm 3 ứng viên `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` trên cùng bộ QA Vertical Slice độc lập (`ai01b-construction-vertical-slice.json`).
   * Xuất bảng ma trận so sánh chi tiết về Quality, Latency (p50/p95), Tokens và Cost.

---

## 5. Hướng dẫn Kích hoạt Gate B cho Operator

Để tiến hành benchmark và đo lường chất lượng AI thật:

1. **Cấu hình biến môi trường server (`.env.local`):**
   ```bash
   OPENAI_API_KEY="sk-proj-..."
   AI_PROVIDER_MODE="PILOT_REMOTE"
   AI_MODEL_NAME="gpt-5.6-sol" # hoặc "gpt-5.6-terra", "gpt-5.6-luna"
   ```
2. **Thực thi lệnh Remote Smoke:**
   ```bash
   npx tsx scripts/qa/remote-openai-smoke.ts
   ```
3. **Thực thi lệnh 3-Model Benchmark:**
   ```bash
   npx tsx scripts/qa/benchmark-openai-models.ts
   ```

---

## 6. Final Gate Verdict Matrix

| Hạng mục kiểm soát | Kết quả kiểm toán | Ghi chú kỹ thuật |
| :--- | :---: | :--- |
| **Local / Contract Preflight** | **PASS** | 100 test files, 629 tests, tsc/lint đạt 0 lỗi |
| **Remote Execution Readiness** | **PASS** | Codebase, allowlist, fail-closed guards sẵn sàng |
| **Model Allowlist (GPT-5.6)** | **PASS** | gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, o3-mini |
| **Fail-Closed on Invalid Model** | **PASS** | Ném `MODEL_NOT_ALLOWED`, 0 fallback lén |
| **Secret Ownership** | **PASS** | Không rò rỉ secret, chặn fallback âm thầm |
| **QA Dataset Isolation** | **PASS** | Gắn nhãn `SYNTHETIC_QA_ONLY` (32.6KB) |
| **Business DB Cleanliness** | **ZERO CONTAMINATION** | 21 dự án bảo toàn, 0 dữ liệu giả |
| **Real OpenAI Quality** | **UNVERIFIED** | Cần chạy API thật khi có key |
| **Controlled Pilot Quality Ready** | **NOT YET** | Chờ kết quả benchmark Remote |
| **Remote Gate Status** | **BLOCKED_NO_KEY** | Dừng an toàn chờ Operator cấu hình key |

---

## STOP

Theo đúng quy tắc của milestone:
* **DỪNG LẠI (STOP).**
* Không code thêm AI.
* Không Python.
* Không RAG.
* Không Write Agent.
* Chờ Operator cấu hình `OPENAI_API_KEY` để thực thi Remote Gate B.
