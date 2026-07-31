# BÁO CÁO TỔNG THỂ VỀ VIỆC TỐI ƯU UI/UX MÀN SOẠN VÀ XEM TRƯỚC KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT (MẪU 02)

> **Trạng thái:** PASS (Runtime Verified)  
> **Production Policy:** NO-GO (Strictly restricted to local development & QA environment)  
> **Mã hồ sơ quy chuẩn:** `specs/002-safety-inspection-workflow/safety-plan-editor-table-parity-report.md`  

---

## 1. KẾT LUẬN ĐIỀU HÀNH

- **Trạng thái phân hệ:** **PASS 100%**  
- **Khảo sát hệ thống:** Đã đối chiếu 1:1 với giao diện & interaction pattern của phân hệ Giám sát (`/reports/weekly-inspection/[id]/edit`).  
- **Cách trình bày nội dung cố định (Mẫu 02):**  
  - khi **Mở nội dung đầy đủ**: Hiển thị NGUYÊN VĂN 100% từng dòng `-` và `+` của biểu mẫu Công ty (Kính gửi, 2 Căn cứ, Mục I, Mục II 1-2, Mục III 1-4). Không rút gọn, không dùng dấu `...`, không gom dòng.  
  - khi **Thu gọn nội dung**: Chỉ hiển thị 1 hàng sạch `2. Nội dung cố định theo biểu mẫu Công ty (Mẫu 02)` kèm badge `Đã bảo toàn đầy đủ nội dung Mẫu 02`. Tuyệt đối không thay thế bằng câu tóm tắt rút gọn.  
- **Bảng 4 cột Safety:** Cấu trúc 4 cột chuẩn nghiệp vụ Safety (`THỜI GIAN KIỂM TRA` - 16%, `CÔNG TRÌNH KIỂM TRA` - 27%, `NỘI DUNG KIỂM TRA, HUẤN LUYỆN` - 37%, `PHÁT SINH THAY ĐỔI` - 20%).  
- **Trạng thái mặc định:** Checkbox Sáng/Chiều/Tối **100% UNCHECKED** khi tạo hồ sơ mới. Ngày rỗng hiển thị thông báo gọn: `"Chưa phát sinh lịch kiểm tra trong ngày."`. Dòng mới có `inspectionContent` **trống 100%**, có nút `[Chọn nội dung gợi ý]` chủ động.  
- **Cơ chế chọn công trình:** Đầy đủ 2 chế độ:
  1. `Chọn công trình có sẵn`: Combobox tìm kiếm mã & tên công trình (`projectId`).
  2. `Tự nhập công trình`: Ô nhập tự do cho công trình ngoài (`customProjectName`), bảo toàn độ dài 180+ ký tự.  
- **Phản hồi dữ liệu dài:** Tất cả textarea sử dụng `AutoTextarea` với `useLayoutEffect` tự tăng chiều cao theo nội dung (đã test thực tế với tên công trình 180 ký tự, nội dung 1.000+ ký tự và phát sinh 700+ ký tự).  
- **Thao tác xóa & Hoàn tác:** Xóa dòng mới lập tức; xóa dòng đã lưu hiển thị Toast Hoàn tác trong 5 giây; bỏ chọn buổi có dữ liệu sử dụng inline confirmation dialog. Bỏ hoàn toàn window.confirm/alert.  
- **Xem trước & In (Preview):** Trang `/reports/safety/plans/[planId]/preview` đạt chuẩn Times New Roman A4, bóng đổ nhẹ, nền xám ngoài, khớp 100% biểu mẫu Công ty.  
- **Cách ly kiến trúc:** Không chỉnh sửa hay tác động đến `Supervision*`.  

---

## 2. PHÂN TÍCH ẢNH ĐẦU VÀO VÀ NGUYÊN NHÂN TỒN ĐẠI

| Ảnh / Thành phần | Vấn đề phát hiện ở bản cũ | Giải pháp sửa đổi ở bản mới |
|---|---|---|
| **Nội dung cố định Mẫu 02** | Bị tóm tắt thành các câu ngắn ("Hồ sơ pháp lý công nhân...") gây mất nội dung đối chiếu của cán bộ | Bảo toàn NGUYÊN VĂN 100% tất cả các mục I, II, III khi mở; thu gọn còn 1 dòng sạch kèm badge bảo toàn khi đóng |
| **Trạng thái checkbox buổi** | Tự động chọn Sáng và tự điền văn bản mặc định dù chưa nhập | Mặc định UNCHECKED 100%. Mở buổi mới sinh dòng trống 100% |
| **Công trình kiểm tra** | Chỉ chọn được từ danh sách cố định | Bổ sung 2 chế độ: Chọn combobox công trình sẵn OR Tự nhập công trình ngoài |
| **Cột Phát sinh thay đổi** | Bị thu hẹp hoặc nhìn bị mất viền | Tách riêng cột 4 chiếm 20% chiều rộng, viền rõ ràng, `AutoTextarea` riêng |
| **Khối cuối trang** | Có 4 ô thống kê và 2 nút hành động lặp với header | Bỏ hoàn toàn 4 ô thống kê và nút lặp ở cuối trang. Nút hành động duy nhất ở Header & Sticky Bar |
| **Dữ liệu dài** | Bị tràn ô hoặc bị cắt chữ | Áp dụng `AutoTextarea` auto-expand không có thanh cuộn nhỏ bên trong |

---

## 3. KHẢO SÁT GIÁM SÁT (`weekly-inspection`)

| Thành phần | Giám sát (`weekly-inspection`) | Safety Kế hoạch áp dụng |
|---|---|---|
| **Route Editor** | `/reports/weekly-inspection/[id]/edit` | `/reports/safety/plans/[planId]` |
| **Route Preview** | `/reports/weekly-inspection/[id]/preview` | `/reports/safety/plans/[planId]/preview` |
| **Editor Header** | `EditorHeader` (1 card duy nhất, sticky status) | `SafetyEditorHeader` (Adapt từ Supervision pattern) |
| **Typography Editor** | Inter font UI (`font-sans`), `text-xs`/`text-sm` | Inter font UI (`font-sans`), A4/Times New Roman CHỈ ở Preview |
| **AutoTextarea** | `useLayoutEffect` scrollHeight calculation | `AutoTextarea` (`src/components/safety/auto-textarea.tsx`) |
| **Project Mode** | Dual selection mode (`projectId` vs `manualProjectName`) | Dual selection mode (`projectId` vs `customProjectName` / `location`) |

---

## 4. MA TRẬN ĐỐI CHIẾU TRƯỚC VÀ SAU KHI SỬA

| Thành phần | Trước khi sửa | Sau khi sửa | Bằng chứng kiểm tra |
|---|---|---|---|
| **Nội dung cố định** | Rút gọn thành 5 câu tóm tắt | Nguyên văn 100% đầy đủ từng dòng `-` và `+` | Visual UI & Preview match 100% |
| **Giao diện Editor** | Giống trang A4 bị ép font Times New Roman | Chuẩn Inter UI ERP compact | Verified via Browser Subagent |
| **Lịch theo ngày** | Tự điền nội dung mẫu | Mặc định trống 100%, có modal gợi ý | Verified via Browser Subagent |
| **Công trình ngoài** | Không hỗ trợ tự nhập | Hỗ trợ nhập tên công trình dài 180+ ký tự | Saved to DB snapshot & location |
| **Phát sinh thay đổi** | Cột bị hẹp | Cột 4 riêng rộng 20%, viền rõ | Verified visual rendering |
| **Xóa dòng** | Confirm popup rườm rà | Xóa ngay + Toast Hoàn tác 5s | Instant state removal + Undo |
| **Khối hoàn tất** | 4 ô thống kê lặp | Đã bỏ hoàn toàn khối thống kê lặp | Clean bottom section |

---

## 5. DANH SÁCH FILE SỬA ĐỔI

1. **`src/components/safety/safety-plan-editor.tsx`**  
   - Rebuilt complete editor page flow: 100% verbatim fixed content toggle, 4-column schedule table, dual project selection mode, empty default content, suggested content modal integration, undo toast for saved deletions, and removal of duplicate bottom finish card.  
2. **`src/components/safety/auto-textarea.tsx`**  
   - New auto-resizing textarea component using `useLayoutEffect` for dynamic height expansion.  
3. **`src/components/safety/suggested-content-modal.tsx`**  
   - New modal allowing users to voluntarily select standard Form 02 inspection topics.  
4. **`src/app/(dashboard)/reports/safety/plans/[planId]/preview/page.tsx`**  
   - Updated preview page to support custom project names (`location`) and maintain 100% Form 02 layout parity in Times New Roman A4.  
5. **`src/lib/safety-reporting/docx-generator.ts`**  
   - Updated Word document generator to resolve custom project names (`location`) and week period dates.  

---

## 6. QUY TẮC DỮ LIỆU VÀ INVARIANT

1. **Project Selection Invariant:**  
   - Mode 1 (`EXISTING`): `projectId` = Selected Project ID, `location` = `undefined`, `projectNameSnapshot` = Project Name.  
   - Mode 2 (`CUSTOM`): `projectId` = Default System Project ID (satisfies FK constraint), `location` = Custom Project Name, `projectNameSnapshot` = Custom Project Name.  
2. **Default Entry Content Invariant:**  
   - New entries are initialized with `inspectionContent = ""`. No default forced sentences!  

---

## 7. XÁC MINH KẾT QUẢ KỸ THUẬT & TEST SUITE

- **`npx tsc --noEmit`**: PASSED (0 Errors)  
- **`npm run build`**: PASSED (Exit Code 0)  
- **`npx prisma validate`**: PASSED  
- **Runtime QA via Browser Subagent**: PASSED  
- **Isolation Verification**: Zero modifications to `src/components/supervision-weekly/*` or `Supervision*` models.  

---

> **Báo cáo hoàn tất.** Hồ sơ Kế hoạch kiểm tra ATLĐ, PCCC, VSMT (Mẫu 02) đã đạt chuẩn 100% yêu cầu nghiệp vụ và giao diện.
