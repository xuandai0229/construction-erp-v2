# BÁO CÁO ĐỐI SOÁT CHỈ SỐ & NGỮ NGHĨA AI-02A.1
**(AI-02A.1 METRICS & SEMANTIC RECONCILIATION CLOSURE REPORT)**

* **Ngày hoàn thành:** 2026-08-21
* **Repository:** `construction-erp-v2`
* **Mục tiêu:** Khóa chặt các bằng chứng đo lường, phân tách rõ ràng chỉ số Coverage, kiểm tra ngữ nghĩa vật tư tồn kho, xác thực thứ tự thực thi an ninh của Fast Path và kiểm thử riêng biệt Fast Path vs. LLM Path trước khi mở AI-02B.

---

## 1. BẢNG TỔNG KẾT NGHIỆM THU AI-02A.1 (FINAL VERDICT)

```text
================================================================================
AI-02A.1 RECONCILIATION VERDICT MATRIX
================================================================================
PROJECT_COMPLETENESS:               PASS (21/21 in all layers)
FAST_PATH_SECURITY_ORDER:           PASS (Auth -> DB Role -> Guard -> Scope -> FastPath)
LLM_PATH_COMPLETENESS:              PASS (Model Context receives 21/21 projects)
MATERIAL_SEMANTICS:                 PASS (ProjectMaterialStock & MaterialMovement enforced)
CAPABILITY_IMPLEMENTATION_COVERAGE: 20.8% (15 / 72 points across 18 ERP Domains)
OPERATIONAL_INTELLIGENCE_COVERAGE:  12.5% (9 / 72 points with genuine DB data)
ROUTING_ACCURACY:                   100.0% (20 / 20 Golden Intent Cases)
LOW_CONFIDENCE_RATE:                5.0% (1 / 20 Cases safely broadened)
WRONG_CAPABILITY_RATE:              0.0% (0 / 20 Cases)
SIMPLE_QUERY_PERFORMANCE:           PASS (P50: 14 ms, P95: 62 ms, Remote Tokens = 0)
DAILY_BRIEFING_PERFORMANCE:         PROVIDER_LATENCY_BOUND (Remote reasoning latency)
BUSINESS_DB INTEGRITY:              CLEAN (21/21 genuine projects preserved, 0 synthetic)
TYPESCRIPT & LINT:                  0 errors (tsc --noEmit & eslint PASS)
VITEST TEST SUITE:                  16 test files, 115 / 115 tests PASS (100%)
READY_FOR_AI_02B_PROJECT_BRAIN:     YES
================================================================================
```

---

## 2. HIỆU CHỈNH TOÁN HỌC ĐỘ BAO PHỦ NĂNG LỰC (CAPABILITY COVERAGE MATH)

### 2.1. Đính chính Sai số Toán học
* **Số liệu trước đây báo cáo nhầm:** $25.0\%$ ($18 / 72$ điểm).
* **Số liệu chính xác cơ học:** $15 / 72 = \mathbf{20.83\%}$.

### 2.2. Phân tách Hai Chỉ số Đo lường Chuẩn mực

$$\mathbf{CAPABILITY\_IMPLEMENTATION\_COVERAGE = \frac{15}{72} = 20.8\%}$$
$$\mathbf{OPERATIONAL\_INTELLIGENCE\_COVERAGE = \frac{9}{72} = 12.5\%}$$

```text
1. CAPABILITY IMPLEMENTATION COVERAGE (Mức độ hoàn thiện Code):
   • NONE (0đ):       9 domains (Locations, Dossiers, WBS, Proposals, Docs, Safety, Quality, Cost, Notifications) = 0đ
   • LOOKUP (1đ):     4 domains (Materials, Approvals, HR, Settings) = 4đ
   • SUMMARY (2đ):    4 domains (Members, Progress, Reports, Audit) = 8đ
   • ANALYSIS (3đ):   1 domain  (Project Core) = 3đ
   • DECISION (4đ):   0 domains = 0đ
   ─────────────────────────────────────────────────────────────
   Tổng điểm Code:    15 / 72 điểm = 20.8%

2. OPERATIONAL INTELLIGENCE COVERAGE (Dữ liệu Thực tế + Code):
   • NONE (0đ):       13 domains (chưa có bản ghi thực tế trong DB hoặc chưa code) = 0đ
   • LOOKUP (1đ):     2 domains (HR: 15 users, Settings: 1 setting) = 2đ
   • SUMMARY (2đ):    2 domains (Members: 18 members, Audit: 2.827 logs) = 4đ
   • ANALYSIS (3đ):   1 domain  (Project Core: 21 projects) = 3đ
   ─────────────────────────────────────────────────────────────
   Tổng điểm Data:    9 / 72 điểm = 12.5%
```

---

## 3. KIỂM TRA NGỮ NGHĨA VẬT TƯ & TỒN KHO (MATERIAL SEMANTICS)

### 3.1. Xác minh Mã nguồn `get_project_material_summary.ts`
* Mã nguồn tại [`src/lib/ai/tools/get-project-material-summary.ts`](file:///d:/construction-erp-v2/src/lib/ai/tools/get-project-material-summary.ts) đã được xây dựng chuẩn xác và **tuyệt đối không bị hồi quy**:
  * Truy vấn bảng tồn kho thực tế: `prisma.projectMaterialStock.findMany({ where: { projectId: input.projectId } })`.
  * Truy vấn biến động kho gần nhất: `materialItem.movements[0]` (`MaterialMovement`).
  * Khi không có bản ghi tồn kho: Trả về rõ ràng `NO_DATA` với thông điệp: *"Chưa có dữ liệu tồn kho cho công trình; danh mục vật tư không được dùng làm số tồn thay thế."*
* **Hiệu chỉnh Metadata Catalog:** Đã cập nhật `src/lib/ai/capabilities/capability-catalog.ts` dòng 108: `prismaModels: ["ProjectMaterialStock", "MaterialItem", "MaterialMovement"]`.

---

## 4. XÁC THỰC THỨ TỰ THỰC THI AN NINH CỦA FAST PATH

Đã kiểm chứng bằng mã nguồn và test suite độc lập [`src/lib/ai/__tests__/ai-fast-path-security.test.ts`](file:///d:/construction-erp-v2/src/lib/ai/__tests__/ai-fast-path-security.test.ts):

```text
[HTTP Request / Function Call]
       │
       ▼
 1. Authentication (resolveAIRequestContext: DB active check) ──► Fail: 401 UNAUTHENTICATED
       │
       ▼
 2. System Kill-Switch & Rate Limiter (evaluateAIGuards) ──────► Fail: 429 / 503
       │
       ▼
 3. Input Validation & Refusal Check (refusal, length) ─────────► Fail: 400 REFUSAL
       │
       ▼
 4. Project Scope Resolution (RBAC, ProjectMember) ─────────────► Fail: 403 SCOPE_DENIED
       │
       ▼
 5. Dynamic Capability Router (routeUserIntent)
       │
       ├─────────────────────────────────┬─────────────────────────────────┐
       ▼ [Confidence >= 0.95]            ▼ [Analytical / Multi-tool]       ▼ [Low Confidence]
 [Deterministic Fast Path]       [Dynamically Routed LLM]         [Safe Broader Set LLM]
       │                                 │                                 │
       ▼                                 ▼                                 ▼
 6. executeAIToolGateway           6. Provider Call #1 (Schema)     6. Provider Call #1 (All Safe Tools)
    • Policy Engine Check             • Tool Execution Sandbox         • Tool Execution Sandbox
    • Tool Allowlist Check            • Provider Call #2 (Synthesis)   • Provider Call #2 (Synthesis)
    • Field Policy Sanitization       • Audit Log & Telemetry          • Audit Log & Telemetry
    • Audit Log Persistence              │                                 │
       │                                 │                                 │
       ▼                                 ▼                                 ▼
 7. Deterministic Formatter ────────► [Output UI with Grounded Citations & Sources]
```

* **Kết quả kiểm thử:**
  * Fast Path khi chưa đăng nhập $\rightarrow$ **HTTP 401 UNAUTHENTICATED** (PASS).
  * Fast Path khi gửi $>10\text{ req/min}$ $\rightarrow$ **HTTP 429 APP_RATE_LIMITED** (PASS).
  * Fast Path với tài khoản phân quyền giới hạn (Chỉ huy trưởng) $\rightarrow$ chỉ trả về đúng 2 dự án được giao, **hoàn toàn không rò rỉ số tổng 21 của toàn công ty** (PASS).

---

## 5. KIỂM THỬ ĐỘC LẬP TÍNH ĐẦY ĐỦ: FAST PATH VS. LLM PATH

| Kênh Thực thi | Prompt Thử nghiệm | Mô hình Xử lý | Token LLM Từ xa | Số Công trình Trả về | Độ trễ Đo lường | Đánh giá |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **FAST PATH** | *"Tôi đang phụ trách những công trình nào?"* | `deterministic-fast-path-v1` | **0 in / 0 out** | **21 / 21** | **14 ms** | **PASS** |
| **LLM PATH** | *"Hãy phân tích danh sách và xếp hạng các công trình tôi đang phụ trách..."* | `openai/gpt-oss-20b` (Groq) | **960 in / 156 out** | **21 / 21** (trong context) | **2.068 ms** | **PASS** |

* **Đính chính Thuật ngữ Token & Đơn vị Thời gian:**
  * Với Fast Path: `REMOTE_LLM_INPUT_TOKENS = 0`, `REMOTE_LLM_OUTPUT_TOKENS = 0`, `PROVIDER_ROUNDS = 0`.
  * Đơn vị thời gian được chuẩn hóa toàn bộ thành số nguyên `ms` (ví dụ: `1,950 ms`, `62 ms`, `21,686 ms`).

---

## 6. ĐO LƯỜNG HIỆU NĂNG SÂU (N = 3 MẪU / PROMPT) & ĐIỀU TRA DAILY BRIEFING

### 6.1. Bảng Đo lường Hiệu năng Đa mẫu (N = 3)

| Nhóm Truy vấn | Prompt | Mẫu #1 | Mẫu #2 | Mẫu #3 | **P50** | **P95** | Remote Tokens (In/Out) | Provider Rounds |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A. Fast Path** | *"Tôi đang phụ trách những công trình nào?"* | 62 ms | 14 ms | 12 ms | **14 ms** | **62 ms** | 0 / 0 | 0 |
| **B. Project Summary** | *"Tóm tắt CT-2026-0009."* | 1,950 ms | 1,542 ms | 1,670 ms | **1,670 ms** | **1,950 ms** | 2,219 / 500 | 2 |
| **C. Pending Decisions**| *"Có việc gì đang chờ xử lý?"* | 4,794 ms | 2,359 ms | 3,861 ms | **3,861 ms** | **4,794 ms** | 1,114 / 231 | 2 |

### 6.2. Kết luận Điều tra Độ trễ Daily Briefing (~21.6s)
* **Phân rã thời gian:**
  * Router & Tiền xử lý Backend: `~2 ms`
  * Provider Round 1 (Gọi tool `get_my_projects`): `~2.8 s`
  * Thực thi Database PostgreSQL: `~12 ms`
  * Provider Round 2 (Sinh phân tích tiếng Việt 21 dự án): `~18.8 s`
* **Nguyên nhân cốt lõi:**
  * Mặc dù Input Context giảm từ 6.412 $\rightarrow$ 944 tokens, model Groq `openai/gpt-oss-20b` phải thực hiện suy luận sâu (reasoning tokens) và sinh văn bản tiếng Việt dài cho 21 công trình.
  * Tốc độ phản hồi bị chi phối bởi hàng đợi và thời gian sinh text của Provider từ xa (**`PROVIDER_LATENCY_BOUND`**). Local ERP backend hoàn toàn không phải nút thắt.

---

## 7. ĐÁNH GIÁ ĐỘ CHÍNH XÁC ĐỊNH TUYẾN Ý ĐỊNH (ROUTING ACCURACY)

Kiểm thử trên 20 kịch bản Golden Intent:
* **ROUTING_ACCURACY:** **100.0% (20 / 20 kịch bản đạt đúng capability và công cụ mong đợi)**.
* **LOW_CONFIDENCE_RATE:** **5.0% (1 / 20 kịch bản câu hỏi chung chung được tự động mở rộng tập tool an toàn)**.
* **WRONG_CAPABILITY_RATE:** **0.0% (0 / 20 kịch bản)**.

---

## 8. KẾT LUẬN & SẴN SÀNG CHO AI-02B

Toàn bộ các yêu cầu đối soát số liệu, chuẩn hóa ngữ nghĩa và bằng chứng an ninh của **AI-02A.1** đã được đóng kín 100%:
* `PROJECT_COMPLETENESS`: PASS (21/21)
* `FAST_PATH_SECURITY_ORDER`: PASS
* `LLM_PATH_COMPLETENESS`: PASS
* `MATERIAL_SEMANTICS`: PASS
* `CAPABILITY_IMPLEMENTATION_COVERAGE`: 20.8%
* `OPERATIONAL_INTELLIGENCE_COVERAGE`: 12.5%
* `ROUTING_ACCURACY`: 100.0%
* `SIMPLE_QUERY_PERFORMANCE`: PASS (14 ms P50)
* `DAILY_BRIEFING_PERFORMANCE`: PROVIDER_LATENCY_BOUND
* `BUSINESS_DB INTEGRITY`: CLEAN

> [!IMPORTANT]
> **STOP RULE COMPLIANCE:**
> Hệ thống đã hoàn tất nghiệm thu AI-02A.1 và đã chuẩn bị sẵn sàng toàn diện để bắt đầu **Phase AI-02B (Project Brain + Derived Metrics + Data Quality + Construction Signals + Evidence Graph)** ngay khi có lệnh phê duyệt từ Operator.
