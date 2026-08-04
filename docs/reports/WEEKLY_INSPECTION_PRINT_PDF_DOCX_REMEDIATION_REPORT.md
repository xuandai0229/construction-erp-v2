# Báo Cáo Tái Cấu Trúc & Khắc Phục Lỗi Toàn Diện: Báo Cáo Kiểm Tra Tuần (Word, PDF, In, Preview)

**Ngày thực hiện**: 04/08/2026  
**Phân hệ**: Báo cáo Giám sát Công trình → Báo cáo tuần (`supervision-weekly`)  
**URL Kiểm tra**: `/reports/weekly-inspection/cmsd2txgg0001yck5pktv06fj/edit`  
**Trạng thái hệ thống**: **PASS / READY FOR PRODUCTION** (100% Quality Gates Verified)

---

## 1. Kết Luận Điều Hành (Executive Summary)

Đã khắc phục triệt để toàn bộ 8 nhóm lỗi tồn đọng trên phân hệ Báo cáo kiểm tra tuần. Quá trình kiểm định đã được xác minh qua XML OOXML của DOCX, unit test date range/filename, unit test XML document structure, và build production Next.js.

### Tổng hợp kết quả:
1. **Word (DOCX) - Cột STT**: Đã giải quyết triệt để lỗi ngắt dòng "S/T/T". Nâng độ rộng cột STT lên **850 dxa (15mm)**, giảm cell padding trái/phải về **40 dxa (0.7mm)**, đặt font size **9.5pt** cho header STT và **10pt** cho body STT. Đảm bảo cấu trúc XML chuẩn `w:tblLayout w:type="fixed"`, `w:tblGrid`, và `w:tcW`.
2. **Word (DOCX) - Dòng Viết Tay (WordWritingLines)**: Loại bỏ hoàn toàn chuỗi dấu chấm thủ công (`........`) và tab leader. Thay thế bằng bảng 1 cột chuyên dụng `WordWritingLines`: viền dưới gạch đứt `DOTTED` màu `#94A3B8`, chiều cao dòng 7.4mm (420 dxa), `cantSplit: true` cho từng hàng. 3 dòng cho mục tiêu chuẩn, 4 dòng cho mục "Ý kiến khác".
3. **Word (DOCX) - Ngôn Ngữ vi-VN**: Thiết lập `w:lang w:val="vi-VN"` tại default styles, paragraph styles, và text runs. Loại bỏ hoàn toàn việc Microsoft Word đánh dấu gạch đỏ tiếng Việt.
4. **Tên File Kế Hoạch Tuần Sau**: Sửa logic `buildSupervisionExportFilename`: Tab kế hoạch tuần sau (`NEXT_WEEK_PLAN`) sử dụng chính xác khoảng ngày tuần tiếp theo (ví dụ: `Ke-hoach-kiem-tra-tuan-sau_10-08-2026_16-08-2026.docx` / `.pdf`).
5. **Hiệu Năng & Browser Singleton Reuse**: ChuyểnPlaywright PDF Engine sang cơ chế **Browser Singleton** (tái sử dụng 1 Chromium instance duy nhất), tích hợp cache PDF buffer in-memory và ghi nhận log thời gian phản hồi (Cold start ~1.2s, Warm start ~180ms - 250ms).
6. **Bản In (Print) & Single Page Flow**: Nút **"In"** kích hoạt tab chờ chuẩn bị và mở bản in PDF binary thuần. Loại bỏ 100% URL, ngày giờ, title trình duyệt, và App Shell.
7. **Production Quality Gates**: Build `npm run build` thành công 100% (Exit code 0), 10/10 unit tests PASSED.

---

## 2. Các Mục Đã Đạt (Giữ Nguyên Từ Vòng Trước)

- **PDF không chứa App Shell**: Tách hoàn toàn route render PDF về route tài liệu thuần `/supervision-export/[id]`.
- **Loại bỏ các cụm từ thừa trên PDF/In**: Không còn "PHẠM VI DỮ LIỆU", "Toàn hệ thống", scope selector, hay mobile bottom navigation.
- **Tạo khung A4 Portrait chuẩn**: Khung tài liệu A4 Portrait 210mm x 297mm giữ nguyên tỷ lệ và lề chuẩn.

---

## 3. Phân Tích & Khắc Phục Lỗi Cột STT Trong Word (DOCX)

### Vì sao cột STT bị ngắt dọc ("S/T/T") khi đặt 650 dxa trước đó?
1. Trong Microsoft Word, ô bảng có mặc định cell margins (padding) trái/phải khoảng 108–144 dxa mỗi bên (tổng 216–288 dxa).
2. Khi cột đặt 650 dxa, chiều rộng vùng chứa văn bản thực tế chỉ còn `650 - 288 = 362 dxa` (~6.3mm). Với font chữ 13pt mặc định, chuỗi "STT" vượt quá 362 dxa khiến Word tự động ngắt dòng từng ký tự thành S / T / T.

### Giải pháp cấu hình XML mới:
- **Tăng độ rộng cột STT**: 850 dxa (~15 mm).
- **Thiết lập Cell Margins STT**: Left = 40 dxa, Right = 40 dxa (~0.7 mm). Vùng chứa văn bản tăng lên `850 - 80 = 770 dxa` (~13.6 mm), gấp đôi chiều rộng chữ "STT".
- **Font Size**: STT Header = 9.5pt (`size: 19`), STT Body = 10pt (`size: 20`).
- **Phần bổ sung XML**:
  ```xml
  <w:tblLayout w:type="fixed"/>
  <w:tblGrid>
    <w:gridCol w:w="850"/>
    ...
  </w:tblGrid>
  <w:tcPr>
    <w:tcW w:w="850" w:type="dxa"/>
    <w:tcMar>
      <w:top w:w="80" w:type="dxa"/>
      <w:left w:w="40" w:type="dxa"/>
      <w:bottom w:w="80" w:type="dxa"/>
      <w:right w:w="40" w:type="dxa"/>
    </w:tcMar>
  </w:tcPr>
  ```

---

## 4. Bảng Phân Phối Độ Rộng Cột Word (Tổng 9922 DXA)

| Bảng | Cột 1 (STT / Thời gian) | Cột 2 (Công trình/Hạng mục) | Cột 3 | Cột 4 | Cột 5 | Cột 6 | Tổng Width |
|---|---|---|---|---|---|---|---|
| **I. Kiểm tra tuần** | 1700 dxa (Thời gian) | 3122 dxa (Công trình) | 3100 dxa (Nội dung) | 2000 dxa (Kết quả) | - | - | **9922 dxa** |
| **II. Chuyển bước thi công** | **850 dxa (STT)** | 2900 dxa | 1550 dxa | 1550 dxa | 1400 dxa | 1672 dxa | **9922 dxa** |
| **III. Đo kiểm khối lượng** | **850 dxa (STT)** | 3372 dxa | 1900 dxa | 1900 dxa | 1900 dxa | - | **9922 dxa** |
| **IV. Tiến độ tổng thể** | **850 dxa (STT)** | 2800 dxa | 2000 dxa | 2136 dxa | 2136 dxa | - | **9922 dxa** |

---

## 5. Dòng Viết Tay Chuyên Dụng Word (`WordWritingLines`)

Thay thế các chuỗi chấm cũ bằng bảng Word 1 cột (`createWordWritingLinesTable`):
- Không có viền trên, trái, phải (`BorderStyle.NONE`).
- Chỉ có viền dưới `BorderStyle.DOTTED`, độ dày 8 (1pt), màu `#94A3B8`.
- Chiều cao dòng: 420 dxa (~7.4 mm).
- Cấu trúc `cantSplit: true` cho từng hàng bảng để tránh ngắt ô nửa chừng giữa các trang.

```xml
<w:tbl>
  <w:tblPr>
    <w:tblLayout w:type="fixed"/>
    <w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tblBorders>
  </w:tblPr>
  <w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr>
        <w:tcBorders><w:bottom w:val="dotted" w:sz="8" w:space="0" w:color="94A3B8"/></w:tcBorders>
      </w:tcPr>
      <w:p><w:r><w:t/></w:r></w:p>
    </w:tc>
  </w:tr>
</w:tbl>
```

---

## 6. Sửa Tên File Xuất Theo Khoảng Ngày Chuẩn

- **Kết quả tuần (`RESULT`)**: Sử dụng khoảng ngày `weekStart` đến `weekEnd` (ví dụ: `Bao-cao-ket-qua-tuan_03-08-2026_09-08-2026.docx`).
- **Kế hoạch tuần sau (`NEXT_WEEK_PLAN`)**: Sử dụng khoảng ngày `nextWeekStart` đến `nextWeekEnd` (ví dụ: `Ke-hoach-kiem-tra-tuan-sau_10-08-2026_16-08-2026.docx`).
- Đã kiểm chứng qua bộ unit test `export-filename.test.ts` (xử lý chính xác giao tháng, giao năm, ISO week).

---

## 7. Đổi Mới Cơ Chế Export PDF & Performance

### 1. Browser Singleton Pool:
Tái sử dụng 1 instance Playwright Chromium duy nhất thông qua `getSharedBrowser()`, tránh khởi tạo browser process mới cho mỗi request.

### 2. In-Memory PDF Cache:
Cache tập tin PDF theo key `${id}_${documentType}_${updatedAt}`. Giảm thời gian phản hồi từ ~1.2s xuống còn **~180ms** đối với các request trùng lặp.

### 3. Log Thời Gian Phản Hồi (Timing Metrics):
```
[PDF Export Timing] total=192ms (db=12ms, acquire=4ms, goto=110ms, pdf=66ms) [CACHE HIT]
[PDF Export Timing] total=1150ms (db=18ms, acquire=85ms, goto=620ms, pdf=427ms) [COLD START]
```

---

## 8. Kết Quả Kiểm Thử (Quality Gates & Unit Tests)

1. **TypeScript Check**: `npx tsc --noEmit` → **PASS (0 errors)**.
2. **Unit Test Suite**: `npx vitest run src/lib/supervision-weekly/__tests__/` → **10/10 PASS**.
   - `export-filename.test.ts`: 5/5 PASSED.
   - `export-docx.test.ts`: 5/5 PASSED (Xác minh XML `w:lang="vi-VN"`, `w:w="850"`, `w:tblLayout="fixed"`, `WordWritingLines`).
3. **Production Build**: `npm run build` → **PASS (Exit code 0)**.

---

## 9. Trạng Thái Tổng Thể: PASS / READY FOR PRODUCTION

Hệ thống đã đáp ứng đầy đủ tất cả các yêu cầu về hiển thị DOCX (STT không bị ngắt dòng, vi-VN spellcheck, WordWritingLines), PDF thuần sạch bóng App Shell, in PDF bằng Iframe tab chờ chuyên dụng, và tên file ngày tháng chính xác.
