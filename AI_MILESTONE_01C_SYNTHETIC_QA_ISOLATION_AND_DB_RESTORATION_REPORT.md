# AI MILESTONE 01C — Synthetic QA Isolation and Business Database Restoration Report

**Ngày đánh giá:** 2026-08-20  
**Repository:** `construction-erp-v2`  
**Milestone:** `AI-01C`  
**Mục tiêu:** BẢO TỒN DATASET SYNTHETIC_QA & LÀM SẠCH CƠ SỞ DỮ LIỆU NGHIỆP VỤ  
**Quy tắc:** ABSOLUTE TRUTH GATE & IMMUTABLE AUDIT TRAIL  

---

## 1. Executive Summary & Verdict

```text
================================================================================
FINAL VERDICT FOR MILESTONE AI-01C:
================================================================================
SYNTHETIC DATASET ISOLATED:              PASS (Exported to scripts/qa/fixtures/)
BUSINESS DB CLEAN:                       PASS (0 synthetic records in DB)
REAL PROJECT DATA PRESERVED:             PASS (21 projects, 18 assignments, 18 members)
QA VERTICAL SLICE PRESERVED:             PASS (32.6KB fixture ready for regression)
AUDIT INTEGRITY:                         PASS (Appended AI01B_SYNTHETIC_QA_DATA_REMOVED)
AI/DASHBOARD SYNTHETIC CONTAMINATION:    ZERO (No fake 77.3% or synthetic issues)
OPENAI GATE B:                           BLOCKED_NO_KEY (Safe state maintained)
================================================================================
```

---

## 2. Answers to 10 Mandatory Questions

### 1. Synthetic dataset đã được export ở đâu?
Dataset và manifest đã được xuất an toàn vào thư mục QA cô lập:
* **Machine-Readable Manifest:** `scripts/qa/fixtures/ai01b-synthetic-dataset-manifest.json` (chứa đầy đủ exact IDs, metadata phân loại `SYNTHETIC_QA`, cảnh báo an toàn).
* **Isolated Vertical Slice Fixture:** `scripts/qa/fixtures/ai01b-construction-vertical-slice.json` (32.6 KB, chứa 1 Template, 11 Work Items, 5 Site Reports, 20 Site Report Lines, 20 Field Progress Entries).
* **Nhãn bắt buộc đã gắn:** `SYNTHETIC_QA_ONLY - NOT_REAL_CONSTRUCTION_DATA - DO_NOT_LOAD_INTO_BUSINESS_DB`.

### 2. Có thể tái sử dụng nó trong QA không?
**CÓ.** Bộ fixture chứa đầy đủ quan hệ dữ liệu (khối lượng thiết kế, phân bổ nhân lực, tiến độ từng ngày, đồng bộ khối lượng) để phục vụ chạy regression test cho pipeline `report-progress-sync`, RBAC, Dashboard-AI parity trong môi trường test/QA cô lập bất kỳ lúc nào mà không cần tạo lại dữ liệu.

### 3. Business DB còn synthetic record nào không?
**KHÔNG CÒN BẢN GHI NÀO (0 record).**
* Toàn bộ 1 `FieldProgressTemplate`, 11 `FieldProgressItem`, 5 `SiteReport`, 20 `SiteReportLine`, 20 `FieldProgressEntry` của `CT-2026-0009` đã được xóa sạch bằng giao dịch an toàn exact-ID (`scripts/qa/cleanup-ai01b-synthetic-data.ts`).
* Bản ghi `FieldProgressTemplate` của dự án `CT-2026-0021` (từ trước AI-01B) vẫn được bảo toàn nguyên vẹn trong DB.

### 4. CT-2026-0009 real project data còn nguyên không?
**CÒN NGUYÊN VẸN 100%.**
* Dự án `CT-2026-0009` (Mã, tên, chủ đầu tư, địa điểm, ngân sách 19.8 tỷ, hạn 30/06/2026) còn nguyên.
* Phân công nhân sự Chỉ huy trưởng `Nguyễn Văn Hưng` (`NV-2026-0006`) và thành viên dự án còn nguyên.
* Toàn bộ 21 dự án, 15 user, 12 nhân viên trong hệ thống không bị ảnh hưởng.

### 5. Dashboard còn hiển thị synthetic progress/issues không?
**KHÔNG.**
* Thuật toán `calculateProjectActualProgress()` trả về `actualProgressDataStatus: "NO_PROGRESS_ITEMS"`, `actualProgressPercent: null`, `approvedEntryCount: 0`.
* Không còn hiển thị con số `77.30%` hay các sự cố giả định (thấm dột, vướng mặt bằng, chậm đèn LED).
* Bằng chứng quá hạn 51 ngày (`PROJECT_OVERDUE`) vẫn được giữ nguyên vì đây là thuộc tính hợp đồng thật (`endDate: 30/06/2026`).

### 6. AI còn đọc synthetic reports không?
**KHÔNG.**
* AI Tool `get_project_summary` trả về `status: NO_PROGRESS_ITEMS`, `riskFlags: ["PROJECT_OVERDUE"]`.
* AI Chat khi hỏi "Tình hình CT-2026-0009 thế nào?" trả lời chính xác: *"Tiến độ đã duyệt: chưa đủ dữ liệu; Báo cáo hiện trường: chưa có nội dung phù hợp; Tồn kho: chưa có ProjectMaterialStock"*.
* Chỉ trích dẫn duy nhất 1 nguồn deep link thật là trang dự án `/projects/cms9tydlu000jn4k5itd0vzcd`, 0 trích dẫn báo cáo giả.

### 7. Audit logs xử lý thế nào?
**TUÂN THỦ IMMUTABLE POLICY.**
* Không xóa/sửa bất kỳ bản ghi `AuditLog` lịch sử nào.
* Đã ghi thêm 1 bản ghi Audit Log chính thức: `AI01B_SYNTHETIC_QA_DATA_REMOVED` ghi nhận rõ hành động dọn dẹp dataset `SYNTHETIC_QA` và tham chiếu tới tệp fixture đã xuất.

### 8. Counts trước/sau là gì?
Toàn bộ số lượng bản ghi đã được đối soát chính xác theo bảng sau:

| Thực thể (Entity) | Pre-AI01B Baseline | Trước Cleanup (AI-01B) | Sau Cleanup (AI-01C) | Trạng thái đối soát |
| :--- | :---: | :---: | :---: | :---: |
| **Project** | 21 | 21 | 21 | **Khớp 100%** |
| **User** | 15 | 15 | 15 (13 active) | **Khớp 100%** |
| **Employee** | 12 | 12 | 12 | **Khớp 100%** |
| **ProjectMember** | 18 | 18 | 18 | **Khớp 100%** |
| **EmployeeProjectAssignment** | 18 | 18 | 18 | **Khớp 100%** |
| **FieldProgressTemplate (All)** | 1 (CT-2026-0021) | 2 | 1 (CT-2026-0021) | **Khớp 100%** |
| **FieldProgressTemplate (CT-09)** | 0 | 1 | **0** | **Đã làm sạch** |
| **FieldProgressItem (CT-09)** | 0 | 11 | **0** | **Đã làm sạch** |
| **SiteReport (CT-09)** | 0 | 5 | **0** | **Đã làm sạch** |
| **SiteReportLine (CT-09)** | 0 | 20 | **0** | **Đã làm sạch** |
| **FieldProgressEntry (CT-09)** | 0 | 20 | **0** | **Đã làm sạch** |

### 9. Regression có PASS không?
**PASS.**
* Bộ đánh giá Golden-30 baseline chạy lại đạt **13 PASS / 17 PARTIAL / 0 FAIL** (thời gian: 664ms), 100% không phát sinh lỗi hay sai lệch bảo mật.

### 10. OpenAI Gate B có được giữ nguyên blocked không?
**CÓ (`BLOCKED_NO_KEY`).** Tuyệt đối không tự kích hoạt hay can thiệp vào cấu hình OpenAI.

---

## 3. Bản đồ cấu trúc hai môi trường sau AI-01C

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. BUSINESS / DEV UAT DATABASE                              │
│                                                             │
│ - 21 Projects thật (CT-2026-0001 đến CT-2026-0021)         │
│ - 18 Phân công Chỉ huy trưởng thật                         │
│ - CT-2026-0009: Giữ nguyên hạn 30/06 (Quá hạn 51 ngày)      │
│ - Khối lượng & Nhật ký: 0 bản ghi giả                      │
│ - AI Copilot: Trung thực báo NO_DATA, không bịa số liệu     │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ Tách biệt 100%
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ISOLATED QA FIXTURE ASSET                                │
│                                                             │
│ Path: scripts/qa/fixtures/ai01b-construction-vertical-slice │
│ - 1 Template + 11 Work Items (Phá dỡ, Xây trát, M&E...)    │
│ - 5 Site Reports (10/04 đến 18/08)                         │
│ - 20 Progress Entries đã duyệt                             │
│ - Label: SYNTHETIC_QA_ONLY                                  │
│ - Mục đích: Chạy automated regression & test Remote LLM     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. STOP RULE

Đã hoàn thành toàn bộ nhiệm vụ của AI-01C:
* **DỪNG LẠI (STOP).**
* Không nhập thêm dữ liệu.
* Không kích hoạt Gate B.
* Chờ Operator xem xét nghiệm thu và chỉ đạo bước tiếp theo.
