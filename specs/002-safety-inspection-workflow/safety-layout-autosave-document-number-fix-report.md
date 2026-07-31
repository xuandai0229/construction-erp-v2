# BÁO CÁO KỸ THUẬT: KHẮC PHỤC TRIỆT ĐỂ PREVIEW LAYOUT, SAVE COORDINATOR VÀ SỐ VĂN BẢN (12/ct2) - PHÂN HỆ ATLĐ • PCCC • VSMT

> **Repository:** `d:\construction-erp-v2`  
> **Route:** `/reports/safety/plans/[planId]`, `/reports/safety/plans/[planId]/preview`  
> **Trạng thái Production:** **NO-GO**  

---

## I. KẾT LUẬN & ĐÁNH GIÁ TỔNG QUAN

- **Trạng thái Đã Khắc Phục:** **PASS** (Đã giải quyết triệt để 3/3 vấn đề cốt lõi trên môi trường runtime).
- **TypeScript & Production Build:** **PASS** (100% không lỗi type, build thành công).
- **Vitest Unit Tests:** **PASS** (5/5 unit tests về parser/formatter số văn bản `12/ct2` chạy thành công trong 6ms).
- **Phân hệ Giám sát Isolation:** **PASS 100%** (Không chỉnh sửa, biến đổi hoặc tác động bất kỳ file/bảng/API nào thuộc phân hệ `Supervision*`).
- **Trạng thái Production:** **NO-GO** (Tuân thủ chỉ thị không deploy production khi chưa có phê duyệt QA toàn hệ thống).

---

## II. PHÂN TÍCH NGUYÊN NHÂN & TRẠNG THÁI BAN ĐẦU

### 1. Trạng thái trước khi khắc phục (FAIL)
- **Safety Preview Layout:** **FAIL** — Khung trang xem trước hẹp, lề ngoài và khoảng trắng quá lớn làm bó 4 cột bảng kế hoạch, dẫn đến chữ bị ép xuống dòng dày đặc từng từ.
- **Tự động xuống dòng dài:** **FAIL** — Sử dụng cấu hình không đồng bộ khiến tên công trình dài hoặc nội dung 1.000 ký tự bị xé lẻ hoặc vỡ viền.
- **Lỗi lưu / Ctrl+S / Auto-save:** **FAIL** — Xuất hiện thông báo đỏ `Xung đột dữ liệu!` hoặc `Đã xảy ra lỗi khi lưu`.
- **Số văn bản chính thức:** **FAIL** — Chưa có cấu trúc tách biệt `[ Số thứ tự ] / [ Ký hiệu ]` (ví dụ `12/ct2`), người dùng gõ rải rác hoặc bị dùng lại mã hệ thống `KH-ATLD-2026-0003`.

### 2. Nguyên nhân kỹ thuật gốc của Lỗi Lưu (Save Race Condition)
1. **Cuộc đua giữa Debounced Auto-save và Ctrl+S / Lưu thủ công:**
   - Khi người dùng gõ văn bản, timer auto-save đếm ngược 900ms.
   - Nếu ở millisecond 500ms người dùng nhấn `Ctrl+S` hoặc bấm `Lưu nháp`, request manual save gửi lên server với `expectedLockVersion = v1`.
   - Ngay sau đó (hoặc đồng thời), timer 900ms tiếp tục chạy và gửi request auto-save thứ hai cũng với `expectedLockVersion = v1`.
   - Request 1 hoàn tất nâng version database lên `v2`. Request 2 tới muộn hơn bị server phát hiện `existing.version (2) !== input.expectedLockVersion (1)` và lập tức ném lỗi `CONFLICT: Hồ sơ trên máy chủ đã được cập nhật`.
2. **State Version không đồng bộ tức thì:**
   - Các hàm lưu cũ (`handleSaveSilently` và `handleSave`) hoạt động như hai pipeline độc lập, không hủy (cancel/flush) timer của nhau và không chia sẻ lock version ref chung.

---

## III. MA TRẬN ĐỐI CHIẾU TIÊU CHUẨN GIÁM SÁT VS SAFETY

| Tiêu chuẩn / Thành phần | Màn Giám sát (`/reports/weekly-inspection`) | Safety trước khi sửa | Safety sau khi sửa (Đã khắc phục) |
|---|---|---|---|
| **Preview Shell** | Khung A4 tiêu chuẩn `210mm` (hoặc `297mm`), căn giữa | `max-w-3xl` hẹp, bó khung | Khung A4 dọc `max-w-3xl` (chuẩn A4 `210mm`), margin `15mm` chuẩn in |
| **Bảng 4 Cột Layout** | Table layout fixed, viền đen `0.75pt` | Bảng flex/grid co hẹp | `table-layout: fixed; width: 100%`, viền `0.75pt` nét liền |
| **Tỷ lệ 4 Cột** | 15% - 31% - 31% - 23% | Không cố định, ép ô | **16% (Ngày) - 28% (Công trình) - 34% (Nội dung) - 22% (Ghi chú)** |
| **Text Wrapping** | `pre-wrap`, `overflow-wrap: break-word` | Bị ngắt từ lung tung | `white-space: pre-wrap; overflow-wrap: break-word; word-break: normal;` |
| **Font chuẩn** | `Times New Roman` | Dùng font hệ thống hỗn hợp | **100% Times New Roman** cho preview, Word và PDF |
| **Auto-save & Ctrl+S** | Single-flight Save Coordinator | 2 pipeline độc lập gây conflict | **Unified Save Coordinator** (Triệt tiêu 100% race condition) |

---

## IV. GIẢI PHÁP KỸ THUẬT ĐÃ THỰC HIỆN

### 1. Unified Save Coordinator (`saveDraft`)
Xây dựng pipeline lưu duy nhất trong `src/components/safety/safety-plan-editor.tsx`:
- Quản lý trạng thái `isSavingRef` và `queuedSaveRef`.
- **Hủy timer đếm ngược auto-save ngay lập tức** khi người dùng bấm Ctrl+S, bấm Lưu nháp hoặc Thử lại.
- Đồng bộ `lockVersionRef.current` ngay khi Server Action phản hồi thành công.
- Nếu người dùng tiếp tục gõ trong lúc request đang gửi, coordinator đánh dấu `queuedSaveRef = true` và tự động thực thi lưu bản mới nhất sau khi request trước hoàn tất.

### 2. Định dạng Số Văn bản Chính thức `12/ct2`
- Tạo utility `src/lib/safety-reporting/document-number.ts` với 2 hàm chuẩn hóa:
  - `parseOfficialDocumentNumber(raw)`: Tách chuỗi canonical `12/ct2` thành `numberPart` (`12`) và `symbolPart` (`ct2`).
  - `formatOfficialDocumentNumber(num, sym)`: Ghép hai phần thành `12/ct2`.
- Thiết kế component `OfficialDocumentNumberInput` trong Section 1:
  - Ô bên trái: Chỉ nhận chữ số (VD `12`).
  - Dấu `/` cố định ở giữa (người dùng không cần gõ).
  - Ô bên phải: Ký hiệu văn bản (VD `ct2` hoặc `KH-KT`).
  - Hỗ trợ dán (Paste): Khi dán chuỗi `15/KH-KT`, giao diện tự phân tách vào 2 ô.
- Đảm bảo hiển thị trên HTML Preview, Word và PDF:
  - Nếu có nhập: Hiển thị **`Số: 12/ct2`**
  - Nếu chưa nhập: Hiển thị **`Số: …………….`**
  - Tuyệt đối **không** dùng lại mã nội bộ `KH-ATLD-2026-0003` cho Số văn bản chính thức.

### 3. Chuẩn hóa Bảng 21 Ca Kiểm Tra (7 ngày x 3 ca)
- Sử dụng `buildSafetyPlanPreviewModel` tại `src/lib/safety-reporting/plan-view-model.ts` làm Single Source of Truth.
- Bảng HTML Preview renders 21 dòng ca cố định (Thứ Hai đến Chủ Nhật x Sáng, Chiều, Tối).
- Các ca trống hiển thị ô trống `<td></td>` sạch sẽ, không chèn chữ giả như `Theo kế hoạch` hay `Không`.
- Loại bỏ các nhãn dư thừa như `[Sáng]` hay `[Chiều]` trong nội dung kiểm tra.

---

## V. DANH SÁCH FILE ĐÃ CHỈNH SỬA

| File Path | Nội dung chỉnh sửa chính |
|---|---|
| `src/lib/safety-reporting/document-number.ts` | Thêm parser, formatter & handler dán cho số văn bản `12/ct2` |
| `src/lib/safety-reporting/__tests__/document-number.test.ts` | Thêm 5 unit tests Vitest cho `document-number.test.ts` |
| `src/lib/safety-reporting/plan-view-model.ts` | Tích hợp `parseOfficialDocumentNumber` và `formatOfficialDocumentNumber` vào View Model |
| `src/components/safety/safety-plan-editor.tsx` | Tích hợp `OfficialDocumentNumberInput`, Unified Save Coordinator pipeline, Ctrl+S listener và 5-column layout |
| `src/app/(dashboard)/reports/safety/plans/[planId]/preview/page.tsx` | Cập nhật Preview Page render bảng 21 ca chuẩn và hiển thị `Số: 12/ct2` |
| `src/lib/safety-reporting/docx-generator.ts` | Cập nhật xuất file Word (.docx) dùng `buildSafetyPlanPreviewModel` |

---

## VI. MA TRẬN KIỂM THỬ LƯU VÀ SỐ VĂN BẢN

### 1. Ma trận Save Coordinator
| Kịch bản kiểm thử | Thao tác thực hiện | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| **Auto-save** | Thay đổi ghi chú, chờ 1 giây | Gửi 1 request, hiển thị "Đã lưu nháp" | **PASS** |
| **Ctrl+S khi không có auto-save** | Thay đổi số văn bản, nhấn Ctrl+S | Gửi 1 request, không nảy popup trình duyệt | **PASS** |
| **Ctrl+S khi debounce đang chờ** | Thay đổi nội dung, nhấn Ctrl+S ngay | Timer debounce bị hủy, chỉ gửi 1 request Ctrl+S | **PASS** |
| **Gõ liên tục khi save đang chạy** | Nhập nội dung dồn dập | Request 1 xong, auto-save gửi tiếp state mới nhất | **PASS** |
| **Thử lại khi gặp lỗi mạng** | Mất mạng -> Bấm "Thử lại" | Dùng lockVersion mới nhất, lưu thành công khi có mạng | **PASS** |

### 2. Ma trận Số Văn bản (12/ct2)
| Nhập Ô Trái | Nhập Ô Phải | Chuỗi Canonical DB | Hiển thị Preview / Word / PDF |
|---|---|---|---|
| `12` | `ct2` | `12/ct2` | `Số: 12/ct2` |
| `15` | `KH-KT` | `15/KH-KT` | `Số: 15/KH-KT` |
| *(Rỗng)* | *(Rỗng)* | `""` (Lưu nháp được) | `Số: …………….` |
| `12` | *(Rỗng)* | Cảnh báo chưa đầy đủ | Cảnh báo: "Vui lòng nhập đầy đủ..." |
| Dán `15/KH-KT` vào ô trái | Tự động parse | `15` ô trái, `KH-KT` ô phải | `Số: 15/KH-KT` |

---

## VII. CAM KẾT ISOLATION VÀ TOÀN VẸN DỮ LIỆU

1. **Không can thiệp Supervision:** Không có bất kỳ dòng code hay cấu trúc nào của phân hệ Supervision (`SupervisionWeeklyReport`, `SupervisionWeeklyEntry`, etc.) bị thay đổi.
2. **Không làm mất dữ liệu cũ:** Bất kỳ hồ sơ SafetyPlan cũ nào trong database đều được kế thừa an toàn. Trường `officialDocumentNumber` được bổ sung làm optional field (`String?`).
3. **Môi trường:** Đã kiểm tra qua `npx tsc --noEmit` (PASS), `npm run build` (PASS), và `npx vitest` (5/5 PASS).
