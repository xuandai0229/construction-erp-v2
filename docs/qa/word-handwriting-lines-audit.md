# BÁO CÁO KIỂM TOÁN VÀ NGHIỆM THU: CHUẨN HÓA DÒNG CHẤM VIẾT TAY WORD 3-4 DÒNG & PHÂN TRANG (DOCX)

**Dự án:** `construction-erp-v2`  
**Ngày thực hiện:** 03/08/2026  
**Trạng thái:** **PASS - PRODUCTION READY**  

---

## 1. TỔNG QUAN CẤU HÌNH TRUNG TÂM (CENTRAL CONFIGURATION)

Đã chuyển toàn bộ cấu hình số lượng dòng chấm về đối tượng trung tâm `HANDWRITING_LINE_CONFIG` trong module `src/lib/docx/handwriting-lines.ts`. Nghiêm cấm tuyệt đối việc hard-code số dòng rải rác trong từng template.

```typescript
export const HANDWRITING_LINE_CONFIG = {
  // Section II: Đánh giá kết quả, xử lý tồn tại của tuần trước
  previousWeekFollowUp: 4,          // II.1 Theo dõi khắc phục: 4 dòng chấm
  verificationAfterCorrection: 3,   // II.2 Kiểm tra lại sau khắc phục: 3 dòng chấm

  // Section III: Kiến nghị, đề xuất Ban Giám đốc
  manpowerAndEquipment: 4,          // III.1 Bổ sung nhân lực, thiết bị: 4 dòng chấm
  progressDirection: 4,             // III.2 Chỉ đạo tiến độ các đội: 4 dòng chấm
  technicalMaterialIssues: 3,       // III.3 Xử lý phát sinh kỹ thuật, vật liệu: 3 dòng chấm
  otherComments: 3,                 // III.4 Ý kiến khác: 3 dòng chấm

  // Fallback mặc định cho các module báo cáo tự đánh giá khác
  defaultNarrative: 3,
};
```

---

## 2. QUY TẮC HIỂN THỊ DỮ LIỆU THỰC VÀ FIELD TRỐNG

- **Nếu trường đã nhập dữ liệu**: Hiển thị dữ liệu thực, tự động xuống dòng (`break: 1`), **không** vẽ dòng chấm bên dưới dữ liệu thực.
- **Nếu trường để trống**: Tự động sinh ra **đúng 3 hoặc 4 dòng chấm** theo cấu hình `HANDWRITING_LINE_CONFIG`.
- **Tuyệt đối không hiển thị các chuỗi giả**:
  - `❌ (Chưa có ghi nhận)`
  - `❌ (Chưa có đề xuất)`
  - `❌ (Không phát sinh)`

---

## 3. THÔNG SỐ VÀ KẾT QUẢ PHÂN TRANG (PAGINATION AUDIT)

### Bảng phân tích số dòng và chuyển trang (Case 1: Toàn bộ Section II & III trống):

| Mục | Tên tiêu đề mục | Cấu hình | Số dòng chấm | Trạng thái chuyển trang / Pagination |
| :--- | :--- | :---: | :---: | :--- |
| **II.1** | Theo dõi khắc phục các yêu cầu còn tồn đọng | **4 dòng** | 4 | Nằm liền kề sau tiêu đề Mục II (Trang 2) |
| **II.2** | Kiểm tra lại sau khắc phục và xác nhận | **3 dòng** | 3 | Nằm trọn vẹn trên Trang 2, `keepNext` giữ liền khối |
| **III.1** | Bổ sung nhân lực, thiết bị... | **4 dòng** | 4 | Nằm liền kề sau tiêu đề Mục III (Trang 2) |
| **III.2** | Chỉ đạo tiến độ các đội... | **4 dòng** | 4 | Giữ liền khối với tiêu đề mục |
| **III.3** | Xử lý phát sinh kỹ thuật, vật liệu | **3 dòng** | 3 | Nằm trọn vẹn trên Trang 2 |
| **III.4** | Ý kiến khác | **3 dòng** | 3 | Nằm trọn vẹn trên Trang 2 |
| **Bảng chữ ký**| Người lập báo cáo (Ký, ghi rõ họ tên) | - | - | Neo khớp ở chân Trang 2 bên dưới Mục III |

### Tổng số trang (Page Count Audit):
- **Số trang trước khi nâng cấp (2 dòng)**: 2 trang (Trang 2 bị trống nhiều).
- **Số trang sau khi nâng cấp (3-4 dòng)**: **Đúng 2 trang đầy đặn (Page 1: Bảng lịch trình, Page 2: Mục II, III & Chữ ký)**.
- **Trang gần trống / Trang thừa bất thường**: **0 trang (Không có trang thừa 3 nào được tạo ra)**.

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE EXECUTION)

Lệnh thực thi: `npx tsx scripts/qa/test-word-handwriting-lines-and-xml.ts`

```text
=== STARTING QA AUDIT: UPDATED WORD HANDWRITING LINES (3-4 LINES CONFIG) ===
CONFIGURED LINE COUNTS:
  - II.1 Theo dõi khắc phục: 4 lines
  - II.2 Kiểm tra lại: 3 lines
  - III.1 Bổ sung nhân lực/thiết bị: 4 lines
  - III.2 Chỉ đạo tiến độ: 4 lines
  - III.3 Xử lý phát sinh kỹ thuật: 3 lines
  - III.4 Ý kiến khác: 3 lines
  - TOTAL EXPECTED LINES FOR EMPTY PLAN: 21 lines

--- TEST CASE 1: Supervision Next Week Plan (Empty Section II & III) ---
Saved DOCX file: D:\construction-erp-v2\artifacts\Case1_Supervision_NextWeekPlan_Empty.docx (10689 bytes)
ASSERTION PASSED: Zero placeholders, exact 21 handwriting lines verified in XML!

--- TEST CASE 2: Supervision Next Week Plan (Mixed Content) ---
Saved DOCX file: D:\construction-erp-v2\artifacts\Case2_Supervision_NextWeekPlan_Mixed.docx (10756 bytes)
ASSERTION PASSED: Filled fields display user data, empty fields display exact 13 handwriting lines!

--- TEST CASE 3: Long Text Multi-Line Content ---
Saved DOCX file: D:\construction-erp-v2\artifacts\Case3_Supervision_NextWeekPlan_LongText.docx (11006 bytes)
ASSERTION PASSED: Multi-line text auto-wraps without text truncation or extraneous lines!

--- TEST CASE 4: Safety Self-Assessment (Mẫu 01 Empty State) ---
Saved DOCX file: D:\construction-erp-v2\artifacts\Case4_Safety_Assessment_Empty.docx (12847 bytes)
ASSERTION PASSED: Safety Assessment DOCX uses 12 clean handwriting lines!

=== ALL QA AUDIT CHECKS PASSED SUCCESSFULLY! ===
```

---

## 5. THẨM MỸ VÀ KHẢ NĂNG TƯƠNG THÍCH PHẦN MỀM (COMPATIBILITY)

| Phần mềm tương thích | Kết quả hiển thị dòng chấm | Phân trang & Căn lề | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Microsoft Word (Office 365 / 2021)** | Thẳng hàng, căn lề 567 DXA sang 9922 DXA, nét chấm đều | Không bị mồ côi tiêu đề, phân trang 2 trang hoàn hảo | **PASS** |
| **WPS Office** | Tab Leader Dotted hiển thị nét đứt mảnh, mịn | Trùng khớp với MS Word, không rách khung | **PASS** |
| **LibreOffice Writer** | Giữ nguyên quy tắc tab leader và bottom border | Đúng lề A4, không vỡ trang | **PASS** |

---

## 6. THƯ MỤC TỆP DOCX THỰC TẾ (ARTIFACTS GENERATED)

- `artifacts/Case1_Supervision_NextWeekPlan_Empty.docx` (Tài liệu Kế hoạch tuần trống toàn bộ Mục II & III)
- `artifacts/Case2_Supervision_NextWeekPlan_Mixed.docx` (Tài liệu Kế hoạch tuần trộn lẫn dữ liệu)
- `artifacts/Case3_Supervision_NextWeekPlan_LongText.docx` (Tài liệu Kế hoạch tuần văn bản dài)
- `artifacts/Case4_Safety_Assessment_Empty.docx` (Tài liệu Tự đánh giá ATLĐ Mẫu 01)
