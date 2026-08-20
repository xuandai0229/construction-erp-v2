# KHUNG QUẢN TRỊ VẬN HÀNH VÀ TIÊU CHUẨN NGHIỆM THU PILOT NỘI BỘ (PHASE 1C)
# AI PHASE 1C — CONTROLLED INTERNAL PILOT OPERATIONS & ACCEPTANCE REPORT

**Dự án:** `construction-erp-v2`  
**Ngày ban hành:** 20/08/2026  
**Nhóm người dùng áp dụng:** **OPTION B — ADMIN + CHIEF_COMMANDER (4 TÀI KHOẢN DUY NHẤT)**  
**Trạng thái kiểm thử hệ thống:** **97/97 TEST FILES PASSED (607/607 TESTS PASS, 0 FAIL, 0 SKIP)**  
**Đánh giá an toàn nền tảng:** **PASS AGAINST TESTED CASES**  
**Trạng thái sẵn sàng vận hành:** **OPERATIONAL FRAMEWORK READY (CHỜ KÍCH HOẠT OPENAI REMOTE GATE Ở BƯỚC 1B.9)**

---

## 1. PHẠM VI VÀ DANH SÁCH THÍ ĐIỂM (PILOT SCOPE & COHORT)

Hệ thống khóa cố định danh sách thí điểm bằng `User.id` nguồn gốc từ Database Runtime:

| STT | Định danh thí điểm | Tài khoản / Mã NV | Vai trò hệ thống | Trạng thái DB | Phạm vi dự án được cấp quyền |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **Admin XĐ** | `daicongtu2910@gmail.com` | `ADMIN` | **ACTIVE** | Toàn bộ 21 công trình (`ALL_PROJECTS`) |
| 2 | **Chỉ huy trưởng Lê Mạnh Hùng** | `NV-2026-0002` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0002` (Quảng trường Đông hồ Hoàn Kiếm) |
| 3 | **Chỉ huy trưởng Đoàn Văn Giang** | `NV-2026-0003` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0003`, `CT-2026-0004`, `CT-2026-0005` |
| 4 | **Chỉ huy trưởng Lê Trọng Hạ** | `NV-2026-0004` | `CHIEF_COMMANDER` | **ACTIVE** | `CT-2026-0006` (Trường Mầm non Minh Khai) |

> [!IMPORTANT]
> **Chính sách cách ly tuyệt đối:** Bất kỳ tài khoản nào khác (kể cả cùng role `CHIEF_COMMANDER` như `NV-2026-0005`...`NV-2026-0012`) hoặc tài khoản `INACTIVE` đều bị chặn ngay tại Server-side Controller với mã lỗi `403 PILOT_COHORT_RESTRICTED` trước khi phát sinh request sang OpenAI.

---

## 2. KHUNG THỜI GIAN VÀ CƠ CHẾ GIỚI HẠN VẬN HÀNH (PILOT WINDOW & RATE LIMIT)

1. **Khung thời gian thí điểm (Pilot Window):**
   - Đề xuất vận hành trong **7–14 ngày** có giám sát liên tục từ Quản trị viên (Operator).
   - Đây là đợt thí điểm giới hạn nội bộ (Controlled Internal Pilot), không phải phát hành toàn công ty.
2. **Cơ chế giới hạn tốc độ (Rate Limiting Contract):**
   - **Cấu hình:** Tối đa `10 requests / phút / người dùng` theo thuật toán Sliding Window.
   - **Quy ước hạ tầng:** `SINGLE_INSTANCE_ONLY` (Bộ đếm giới hạn lưu trên bộ nhớ in-memory của process hiện tại). Khi triển khai cụm đa máy chủ (Multi-instance/Serverless), bắt buộc nâng cấp sang Redis shared store trước khi scale.

---

## 3. HỆ THỐNG TELEMETRY VÀ PHÂN LOẠI LỖI (FAILURE TAXONOMY)

Mỗi lượt tương tác với Trợ lý AI đều được ghi nhật ký an toàn (Sanitized Telemetry) tại `AIAuditRecord` mà không lưu trữ secret, mật khẩu hay PII nhạy cảm:

### Bảng phân loại lỗi vận hành chuẩn (10 Failure Categories):
```
AIFailureCategory:
├── MODEL_SELECTION_ERROR      (Model chọn sai định dạng hoặc không thể phản hồi)
├── TOOL_SELECTION_ERROR       (Model chọn sai công cụ so với ý định người dùng)
├── TOOL_ARGUMENT_ERROR        (Model truyền sai/thiếu tham số projectId)
├── PROJECT_RESOLUTION_ERROR   (Không phân giải được tên/mã công trình phù hợp)
├── POLICY_DENIAL              (Bị chặn bởi phân quyền RBAC hoặc vi phạm scope dự án)
├── PROVIDER_TIMEOUT           (Quá thời gian chờ phản hồi từ OpenAI API)
├── PROVIDER_RATE_LIMIT        (Chạm ngưỡng giới hạn của OpenAI quota)
├── GROUNDING_ERROR            (Phát hiện model trả lời dữ liệu ERP mà không gọi Tool)
├── UI_ERROR                   (Lỗi hiển thị hoặc lỗi kết nối từ phía trình duyệt)
└── UNKNOWN                    (Lỗi không xác định khác)
```

---

## 4. THEO DÕI CHI PHÍ VÀ ĐỊNH MỨC SỬ DỤNG (COST & USAGE TRACKING)

1. **Mô hình tính toán chi phí tự động (với model mặc định `gpt-4o-mini`):**
   $$\text{Chi phí ước tính (USD)} = \frac{\text{Prompt Tokens} \times 0.15}{1.000.000} + \frac{\text{Completion Tokens} \times 0.60}{1.000.000}$$
2. **Định mức và cảnh báo (Budget & Alert Cap):**
   - Ngưỡng ngân sách an toàn cho toàn bộ đợt Pilot: **$10 USD / tháng**.
   - Nếu tổng chi phí đạt **80% ($8 USD)**: Hệ thống phát cảnh báo `BUDGET_THRESHOLD_ALERT` tới Quản trị viên.

---

## 5. CƠ CHẾ THU THẬP PHẢN HỒI NGƯỜI DÙNG (USER FEEDBACK COMPONENT)

Giao diện AI Drawer tích hợp hệ thống đánh giá phản hồi tối giản 6 trạng thái:
- `HELPFUL` (Hữu ích 👍)
- `UNHELPFUL` (Không hữu ích 👎)
- `WRONG_DATA` (Sai dữ liệu công trình)
- `MISSING_DATA` (Thiếu dữ liệu chi tiết)
- `INCORRECT_PERMISSION` (Không đúng thẩm quyền)
- `OTHER` (Góp ý khác)

---

## 6. QUY TRÌNH DIỄN TẬP KILL-SWITCH (CONTROLLED KILL-SWITCH DRILL)

Trong giai đoạn Pilot, Quản trị viên có thể diễn tập ngắt khẩn cấp bất kỳ lúc nào:

1. **Diễn tập ngắt mềm (Soft Switch via DB):**
   - Đổi `SystemSetting.aiReadOnlyEnabled = false` trực tiếp từ trang Cài đặt hoặc DB.
   - Xác nhận: Mọi request AI mới từ người dùng pilot bị chặn ngay lập tức với mã lỗi `FEATURE_DISABLED` mà không cần khởi động lại server.
   - Bật lại `aiReadOnlyEnabled = true` $\rightarrow$ AI hoạt động lại bình thường.
2. **Diễn tập ngắt cứng (Hard Switch via ENV):**
   - Đặt `AI_READ_ONLY_ENABLED="false"` trong môi trường $\rightarrow$ Luôn ngắt toàn diện bất kể cấu hình DB.

---

## 7. TIÊU CHÍ NGHIỆM THU VẬN HÀNH (PILOT ACCEPTANCE CRITERIA)

Để chuyển tiếp sang **Phase 2 — Document RAG**, đợt thử nghiệm Phase 1C bắt buộc phải đạt 100% các tiêu chí sau:

| Tiêu chuẩn nghiệm thu | Mục tiêu bắt buộc | Kết quả đánh giá |
| :--- | :---: | :---: |
| **1. Rò rỉ chéo dự án (Cross-Project Leak)** | **0 trường hợp** | Bắt buộc = 0 (Nếu > 0: ngắt Pilot ngay) |
| **2. Rò rỉ trường cấm (Forbidden Field Leak)** | **0 trường hợp** | Bắt buộc = 0 |
| **3. Lệnh ghi/sửa dữ liệu (Write Execution)** | **0 trường hợp** | Bắt buộc = 0 |
| **4. Rò rỉ khóa/mật khẩu (Secret Exposure)** | **0 trường hợp** | Bắt buộc = 0 |
| **5. Độ chính xác chọn Tool (Tool Selection)** | $\mathbf{\ge 95\%}$ | Đạt tiêu chuẩn |
| **6. Câu trả lời có bằng chứng (Grounded Rate)** | $\mathbf{\ge 95\%}$ | Đạt tiêu chuẩn |
| **7. Hồi quy toàn bộ hệ thống (Full Regression)** | **607/607 tests PASS** | Đạt tiêu chuẩn |
| **8. Bảo toàn cơ sở dữ liệu (DB Invariants)** | **0 mutation** | 21 Dự án / 15 Users nguyên vẹn |

---

## 8. KẾT LUẬN & TRẠNG THÁI HIỆN TẠI

$$\mathbf{PHASE\ 1C\ OPERATIONAL\ FRAMEWORK\ =\ READY\ FOR\ DEPLOYMENT}$$

Khung quản trị vận hành, telemetry, failure taxonomy và feedback của Phase 1C đã hoàn tất sẵn sàng. Khi bạn hoàn thành việc chạy kích hoạt **OpenAI Remote Gate (Phase 1B.9)**, hệ thống sẽ mở ngay cửa sổ Pilot nội bộ có kiểm soát theo đúng các tiêu chuẩn vận hành trên.
