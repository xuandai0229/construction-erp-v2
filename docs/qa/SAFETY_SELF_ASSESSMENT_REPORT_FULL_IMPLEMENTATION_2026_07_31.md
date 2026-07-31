# Audit Báo cáo tự đánh giá kết quả kiểm tra ATLĐ, PCCC, VSMT (Mẫu 01)

## 1. Tổng quan phân hệ Báo cáo tự đánh giá (Mẫu 01)
- **Mục tiêu**: Xây dựng phân hệ lập, chỉnh sửa, xem trước và xuất bản Báo cáo tự đánh giá kết quả kiểm tra ATLĐ, PCCC, VSMT (Mẫu 01) độc lập, hoàn chỉnh, đồng bộ giao diện và luồng dữ liệu với Kế hoạch kiểm tra (Mẫu 02).
- **Kiến trúc & Độc lập**: Tách biệt 100% khỏi phân hệ Giám sát (`Supervision`). Sử dụng Prisma Model riêng (`SafetySelfAssessmentReport`, `SafetySelfAssessmentEntry`, `SafetySelfAssessmentSequence`).
- **Trạng thái Build**: Build Next.js 16 (Turbopack) & Typecheck TypeScript thành công 100% (Zero Errors).

---

## 2. Các thành phần chính đã triển khai

### A. Manifest nội dung chuẩn (`safety-assessment-official-content.ts`)
- Đã mã hóa danh mục 20 nội dung kiểm tra tiêu chuẩn theo Mẫu 01 Công ty.
- Định nghĩa Tiêu đề Phần I ("I. ĐÁNH GIÁ KẾT QUẢ XỬ LÝ TỒN TẠI TUẦN TRƯỚC") và Phần II ("II. KIẾN NGHỊ ĐỀ XUẤT BAN GIÁM ĐỐC").

### B. Bộ Renderer & Exporters
1. **HTML Renderer (`assessment-html-renderer.ts`)**:
   - Render layout 5 cột chuẩn A4 portrait:
     1. Ngày kiểm tra (Sáng/Chiều/Tối, Thứ 2 -> Chủ Nhật)
     2. Công trình / Nội dung kiểm tra
     3. Đánh giá công trình
     4. Kiến nghị yêu cầu
     5. Kết quả thực hiện
   - Sử dụng font Times New Roman, cỡ chữ 13pt / 12pt (bảng), căn lề 2cm top/bottom, 2.5cm left, 1.5cm right.
2. **DOCX Generator (`assessment-docx-generator.ts`)**:
   - Sinh file Word (.docx) chuẩn biểu mẫu Công ty với bảng 5 cột full-width (9922 dxa).
   - Đảm bảo tính nhất quán giữa bản Preview HTML, file Word và file PDF.
3. **PDF Generator & Security (`pdf-converter.ts`)**:
   - Render trực tiếp từ HTML qua Playwright Chromium engine.
   - Hỗ trợ fallback LibreOffice convert từ DOCX.
   - Tích hợp kiểm tra bảo mật (Security Guard Check) đảm bảo PDF không chứa màn hình đăng nhập hoặc lỗi HTML.

### C. Backend Service & Server Actions
1. **Assessment Service (`assessment-service.ts`)**:
   - `createReport`: Tạo mới báo cáo với mã số tự động (`BC-ATLD-YYYY-XXXX`).
   - `saveReport`: Hỗ trợ lưu nháp với Optimistic Concurrency Locking (lock versioning).
   - `importEntriesFromPlan`: Nạp trực tiếp các mục kiểm tra từ Kế hoạch kiểm tra (Mẫu 02) sang Báo cáo.
   - `deleteReport`: Xóa báo cáo (soft delete).
2. **Server Actions (`actions.ts`)**:
   - Tích hợp đầy đủ: `createSafetyAssessmentAction`, `saveSafetyAssessmentAction`, `importEntriesFromPlanAction`, `deleteSafetyAssessmentAction`, `getSafetyAssessmentsListAction`.

### D. Client Component & UI Workflow
1. **Continuous Scrolling Editor (`safety-assessment-editor.tsx`)**:
   - Màn hình soạn thảo đơn dạng cuộn liên tục (single continuous page).
   - Header chuyên nghiệp (`SafetyEditorHeader`) hỗ trợ Autosave (debounce 900ms) kèm chỉ báo trạng thái thực tế.
   - Layout "Thông tin chung" 4 cột cân đối.
   - Bảng 5 cột kiểm tra thực tế theo ngày/buổi với combobox chọn công trình và auto-growing textareas.
   - Popup chọn 20 nội dung tiêu chuẩn (`SafetyItemPickerModal`).
   - Menu thao tác dòng (`SafetyRowActionMenu`) hỗ trợ nhân bản và xóa dòng.
2. **Dual-Tab List Hub (`safety-list-client.tsx`)**:
   - Tab chuyển đổi linh hoạt giữa "Kế hoạch kiểm tra" và "Báo cáo tự đánh giá".
   - Bộ lọc trạng thái, tìm kiếm từ khóa, sắp xếp và phân trang đầy đủ.
3. **API & Export Routes**:
   - API Export (`/api/reports/safety/self-assessments/[reportId]/export`): Xuất Word / PDF trực tiếp.
   - Page Preview (`/reports/safety/self-assessments/[reportId]/preview`): Màn hình xem trước và in ấn A4.

---

## 3. Kết quả kiểm thử & Nghiệm thu
- [x] TypeScript Compile (`npx tsc --noEmit`): **PASS** (0 Errors).
- [x] Next.js Production Build (`npm run build`): **PASS** (0 Errors).
- [x] Schema & Concurrency Parity: Optimistic Lock versioning bảo đảm không bị ghi đè dữ liệu.
- [x] Multi-Format Export Parity: Preview HTML = DOCX = PDF.
- [x] Standalone Verification: Phân hệ Supervision hoàn toàn không bị tác động hay ảnh hưởng.
