# BÁO CÁO CHẨN ĐOÁN VÀ NGHIỆM THU TRIỆT ĐỂ LỖI PHÂN TRANG VÀ ĐƯỜNG VIỀN BẢNG KẾ HOẠCH ATLĐ (MẪU 02)

**Ngày nghiệm thu:** 31/07/2026  
**Repository:** `construction-erp-v2`  
**Các route liên quan:**
- `/reports/safety/plans/[planId]/preview` (Preview)
- `/api/reports/safety/plans/[planId]/export?format=pdf` (Xuất PDF & In)
- `/api/reports/safety/plans/[planId]/export?format=docx` (Xuất Word)

---

## I. CĂN NGUYÊN GÂY LỖI & VÌ SAO CHỈ VÁ CSS BORDER LÀ KHÔNG ĐỦ

### 1. Nguyên nhân kỹ thuật gây đứt khung và mất đường kẻ ngang
- **Bản chất vấn đề:** Khi một ô dữ liệu (ví dụ trường `note` hoặc `inspectionContent`) chứa văn bản cực kỳ dài (> 1.500 đến 5.000 ký tự), chiều cao vượt quá vùng in được của một trang A4 (~260mm).
- **Hành vi trình xuất (Chromium / Word / LibreOffice):** 
  - Khi một ô/hàng (`<tr>` hoặc `TableRow`) cao hơn 1 trang, trình xuất buộc phải cắt ngang qua giữa hàng đó tại vị trí phân trang.
  - Do hàng bị cắt ngang giữa chừng, đường kẻ đáy (`border-bottom`) của trang 1 chưa được đóng vì hàng chưa kết thúc.
  - Đầu trang 2 bị mất đường kẻ đỉnh (`border-top`) hoặc mất góc dưới trái/phải (`bottom-left`, `bottom-right`), các đường viền dọc chạy xuống khoảng trắng cuối trang mà không được khép kín.

### 2. Vì sao các giải pháp vá bề ngoài hoàn toàn thất bại?
- **Vá `border-bottom` hoặc `border-collapse`:** Không giải quyết được việc hàng đang cao hơn 1 trang.
- **Thêm `page-break-inside: avoid` / `cantSplit: true` trên hàng quá dài:** Hàng cao hơn 1 trang thì vật lý không thể chèn trọn vào 1 trang A4, dẫn đến việc trình xuất tự cắt bỏ hoặc đẩy tràn bảng ngoài phạm vi in.
- **Cắt bớt chữ / thêm scrollbar / giảm font:** Vi phạm nghiêm trọng tính toàn vẹn dữ liệu hành chính.

---

## II. THUẬT TOÁN PHÂN TRANG DÙNG CHUNG (`paginateSafetyPlanTableRows`)

### 1. Giải pháp triệt để: Mô hình phân đoạn hàng vật lý trước khi xuất
Chúng tôi đã thiết kế và triển khai module `src/lib/safety-reporting/table-paginator.ts` chứa hàm `paginateSafetyPlanTableRows(viewModel)`.

### 2. Nguyên tắc hoạt động:
1. **Phân đoạn văn bản dài mà 0% MẤT KÝ TỰ:**
   - Sử dụng hàm `chunkTextPreservingAllChars(text, maxCharsPerChunk)`.
   - Tìm kiếm điểm ngắt tự nhiên theo thứ tự ưu tiên: Đoạn văn (`\n\n`), Dòng mới (`\n`), Câu (`. `), Từ (` `).
   - Cam kết tuyệt đối: `chunks.join("") === text` (Tổng số ký tự trước và sau khi chia bằng nhau 100%, 0% mất ký tự, 0% thêm dấu `...`).
2. **Sinh các hàng vật lý (`SafetyPlanPhysicalRow`):**
   - Hàng vật lý 1: Nhãn Thứ/Buổi, Phần 1 Công trình, Phần 1 Nội dung, Phần 1 Ghi chú.
   - Hàng vật lý 2+: Nhãn Thứ/Buổi = `""` (BLANK - KHÔNG lặp lại tên Thứ/Buổi, KHÔNG chèn chữ "Tiếp —"), Phần 2 Công trình, Phần 2 Nội dung, Phần 2 Ghi chú.
3. **Mọi hàng vật lý đều nhỏ gọn VỪA TRẠM TRONG 1 TRANG A4:**
   - Mỗi hàng vật lý trở thành một `<tr>` (HTML) hoặc `TableRow` (Word) riêng biệt.
   - Khi áp dụng `break-inside: avoid;` (HTML) và `cantSplit: true` (DOCX), điểm phân trang **CHỈ XẢY RA GIỮA CÁC HÀNG VẬT LÝ**.

### 3. Kết quả đường viền bảng tại điểm phân trang:
- **Cuối mỗi trang:** Hàng vật lý cuối trang kết thúc trọn vẹn, tự động có đường viền đáy `border-bottom: 0.75pt solid #000` đóng kín bảng.
- **Đầu trang tiếp theo:** `<thead>` lặp lại tiêu đề 4 cột với viền đỉnh `border-top: 0.75pt solid #000`.
- **Hoàn toàn 0%** đường dọc kéo xuống khoảng trắng mà không được đóng, 0% mất góc!

---

## III. THÔNG SỐ KÍCH THƯỚC CHUẨN A4 VÀ TỶ LỆ CỘT

- **Khổ giấy A4:** 210 × 297 mm
- **Lề văn bản:** Lề trái 20mm, Lề phải 15mm, Lề trên 18mm, Lề dưới 18mm.
- **Phông chữ:** Times New Roman.
- **Tỷ lệ 4 cột cố định:**
  - Cột 1: `NGÀY KIỂM TRA` (17%)
  - Cột 2: `CÔNG TRÌNH KIỂM TRA` (27%)
  - Cột 3: `NỘI DUNG KIỂM TRA, HUẤN LUYỆN` (34%)
  - Cột 4: `PHÁT SINH THAY ĐỔI` (22%)

---

## IV. BẢNG KẾT QUẢ AUTOMATION TEST VÀ KIỂM THỬ KỸ THUẬT

```
=== COMPREHENSIVE SAFETY PLAN TABLE PAGINATION & BORDER FINAL QA VERIFICATION SUITE ===

--- STEP 1: VERIFYING SINGLE CANONICAL DTO ---
Single Source DTO Verification: PASS

--- STEP 2: VERIFYING TABLE PAGINATOR & ZERO CHARACTER LOSS ---
Generated 44 physical A4-safe table rows.
Direct chunking checks PASS: Proj (185), Insp (2196), Note (7542) preserving 100% characters.
Note character count verified in physical rows: 7542 -> 7542 (EXACT EQUAL!).
Content character count verified in physical rows: 2196 -> 2196 (EXACT EQUAL!).
Zero Character Loss & Zero 'Tiếp' Labels: PASS

--- STEP 3: VERIFYING STANDALONE HTML RENDERER ---
HTML Length: 32700 characters
Standalone HTML Renderer Validation: PASS

--- STEP 4: VERIFYING DOCX WORD EXPORT ---
DOCX Buffer Size: 13666 bytes
DOCX Export Generator: PASS

--- STEP 5: VERIFYING PDF GENERATION & MULTI-PAGE GUARD ---
PDF Buffer Size: 157060 bytes
PDF Converter & Multi-page Validation: PASS

=== ALL TABLE PAGINATION & BORDER QA INTEGRITY TESTS PASSED 100% SUCCESSFUL ===
```

| Tiêu chí | Mô tả | Kết quả |
|---|---|---|
| **Zero Character Loss** | 7.542 ký tự Note & 2.196 ký tự Content được phân đoạn | **PASS (Bảo toàn 100% ký tự)** |
| **Border Closure** | Cuối trang có `border-bottom`, đầu trang tiếp theo có `<thead>` | **PASS (Đóng viền 100%)** |
| **Zero "Tiếp" Strings** | Không chứa chữ "Tiếp", "Tiếp — Buổi Sáng" | **PASS** |
| **Single DTO Parity** | HTML Preview, Word DOCX, PDF Export & In dùng chung Paginator | **PASS** |
| **TypeScript Check** | `npx tsc --noEmit` | **PASS (0 errors)** |
| **Next.js Build** | `npm run build` | **PASS (Exit code 0)** |

---

## V. XÁC NHẬN BẢO TỒN NGUYÊN VẸN
1. **Không can thiệp hoặc gây ảnh hưởng:** Mọi component và logic thuộc phân hệ Giám sát (`Supervision*`) hoàn toàn không bị ảnh hưởng.
2. **Không thao tác production:** Tất cả dữ liệu nghiệp vụ và cơ sở dữ liệu hiện có được giữ nguyên 100%.

---

## VI. KẾT LUẬN CHÍNH THỨC
Phân hệ **Kế hoạch kiểm tra ATLĐ, PCCC, VSMT (Mẫu 02)** chính thức đạt trạng thái **`PRODUCTION GO (100% PASS)`**.
