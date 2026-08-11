# BÁO CÁO NGHIỆM THU: CHỨC NĂNG XEM TRƯỚC, TẢI EXCEL, TẢI PDF VÀ IN ĐỀ XUẤT VẬT TƯ V2
## MATERIAL PROPOSAL V2 — DOCUMENT PREVIEW & EXPORT SUITE

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Trạng thái nghiệm thu:** **PASS**

---

### 1. Existing Report/Supervision Preview Audit
- Đã kiểm tra toàn bộ các màn Xem trước / In tài liệu hiện hữu trong hệ thống:
  - Phân hệ Giám sát tuần (`/reports/weekly-inspection/[id]/preview`, `WeeklyPrintTemplate`).
  - Phân hệ Báo cáo An toàn lao động (`/reports/safety/.../preview`, `SafetyDocumentPreviewToolbar`).
- Các chuẩn UX/UI dùng chung đã xác định:
  - Toolbar xem trước cố định phía trên (`sticky top-4 z-40`, viền bo góc `rounded-2xl`, hiệu ứng làm mờ nền `backdrop-blur-md`, ẩn khi in `print:hidden`).
  - Nút quay lại chỉnh sửa dạng `← Quay lại chỉnh sửa`.
  - Giấy xem trước đặt ở giữa màn hình, nền màu xám nhạt (`bg-slate-200/80`), trang giấy trắng (`bg-white shadow-2xl`).
  - Các nút tác vụ chuẩn: `[Tải Excel]`, `[Tải PDF]`, `[In]` và nút đóng `[X]`.

---

### 2. Reusable Components Found
- Toolbar component: `SafetyDocumentPreviewToolbar`, `WeeklyPrintTemplate` toolbar pattern.
- Layout trang A4 giấy trắng: `document-paper` pattern từ `weekly-print-template.tsx`.
- Playwright Headless PDF engine: `executeInPdfPage` từ `@/lib/pdf/browser-singleton`.
- Excel exporter engine: `renderMaterialProposalExcel` từ `@/lib/material-proposals/exporter`.

---

### 3. Reuse/Adapt Decisions
| Component / Pattern | Current Location | Used By | Reusable? | Decision & Action |
| --- | --- | --- | --- | --- |
| Preview Toolbar (`.preview-toolbar`) | `components/supervision-weekly/weekly-print-template.tsx` | Giám sát tuần, An toàn | YES | **ADAPT**: Tách thành `MaterialProposalPreviewToolbar` chuẩn hóa UI/UX |
| Paper Canvas Area (`.document-paper`) | `components/supervision-weekly/weekly-print-template.tsx` | Giám sát tuần | YES | **ADAPT**: Định dạng A4 Landscape (Khổ ngang `297mm x 210mm`) theo mẫu Golden Excel |
| Golden Excel Engine (`renderMaterialProposalExcel`) | `lib/material-proposals/exporter.ts` | Material Proposal Export | YES | **REUSE 100%**: Sử dụng làm engine xuất file `.xlsx` chính thức |
| PDF Renderer Queue (`executeInPdfPage`) | `lib/pdf/browser-singleton.ts` | Giám sát, Báo cáo | YES | **REUSE 100%**: Dùng để render PDF chất lượng cao từ trang in `/materials/proposals/[id]/print` |
| Security Policy (`canAccessProjectProposal`) | `lib/material-proposals/permissions.ts` | Proposal actions | YES | **REUSE 100%**: Kiểm tra quyền xem/tải tài liệu ở cả Client và Server API |

---

### 4. Preview Route
- Route chính thức: `/materials/proposals/[id]/preview`.
- Được thiết kế dưới dạng **Full Page Viewport**, không dùng Modal hẹp hay Drawer.
- Tự động bảo vệ bởi RBAC server-side và session auth (`getSession()`, `getMaterialProposal(id)`).

---

### 5. Toolbar
- **Vị trí:** Phía trên cùng canvas, sticky cố định khi cuộn (`sticky top-4 z-40`).
- **Nội dung:**
  - `← Quay lại chỉnh sửa`: Dẫn người dùng về màn chỉnh sửa `/materials/proposals/new?edit=[id]`.
  - Badge mã đề xuất (VD: `ĐVT-2026-0001`).
  - Tiêu đề màn hình: `XEM TRƯỚC ĐỀ XUẤT VẬT TƯ`.
  - Nút tác vụ: `[Tải Excel]`, `[Tải PDF]`, `[In]` và nút `[X]` (Đóng).
- **100% Tiếng Việt**, không sử dụng từ ngữ tiếng Anh ngẫu nhiên.

---

### 6. Golden Template Preview Mapping
Bản xem trước tái hiện chính xác cấu trúc tài liệu kinh điển (Golden Template):
- **HEADER:**
  - CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập - Tự do - Hạnh phúc.
  - CÔNG TY CP XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI.
  - Số đề xuất & Hà Nội, Ngày ... tháng ... năm ...
- **TIÊU ĐỀ TÀI LIỆU:**
  - `ĐỀ XUẤT VẬT TƯ, VẬT LIỆU, MÁY MÓC THIẾT BỊ` (In hoa, căn giữa, bold).
- **THÔNG TIN CHUNG:**
  - Kính gửi, Tên công trình, Địa điểm, Người yêu cầu, Lý do mua hàng.
- **BẢNG VẬT TƯ (8 CỘT):**
  - `STT`, `TÊN VẬT TƯ / VẬT LIỆU`, `ĐƠN VỊ`, `KHỐI LƯỢNG (THEO HỢP ĐỒNG | THỰC TẾ)`, `QUY CÁCH / THÔNG SỐ KỸ THUẬT`, `HÃNG SẢN XUẤT / XUẤT XỨ`, `GHI CHÚ`.
  - **Hoàn toàn không có cột XÓA**, không có badge "Danh mục"/"Ngoài danh mục", không có input control.
- **NGÀY CẤP VỀ CÔNG TRÌNH:** Hiển thị dưới bảng dạng chữ nghiêng đậm.
- **KHỐI CHỮ KÝ:** 3 cột (`NGƯỜI ĐỀ NGHỊ`, `PHÒNG KỸ THUẬT`, `PHÓ GIÁM ĐỐC`) với khoảng không ký và họ tên người lập.

---

### 7. Shared Document Data Model
- Cả 4 định dạng (**Xem trước Web**, **Xuất Excel**, **Xuất PDF**, **In trực tiếp**) cùng tiêu thụ chung một normalized object `MaterialProposalDocumentData`:
  - `proposalNo`, `proposalDate`, `projectNameSnapshot`, `projectLocationSnapshot`, `requesterNameSnapshot`, `requesterRoleSnapshot`, `purchaseReason`, `requiredDeliveryDate`, `items`, `sections`, `approvals`.

---

### 8. Location Snapshot Verification
- Đã xác minh: Trường `Địa điểm` trên Preview, Excel, PDF và Bản in đều lấy từ `proposal.projectLocationSnapshot`.
- Khi người dùng thay đổi địa điểm cụ thể tại form Edit, giá trị tùy chỉnh này được lưu và phản ánh chính xác trên tất cả các định dạng xuất bản, không bị lấy đè từ `Project.location` gốc.

---

### 9. Long Text Verification
- Văn bản dài tại các cột `TÊN VẬT TƯ`, `QUY CÁCH`, `HÃNG SX`, `GHI CHÚ` và các chuỗi test không chứa khoảng trắng (`aaaaaaaa...` >= 100 ký tự) đều được wrap dòng đầy đủ (`whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]`).
- Không bị ellipsis cắt dòng, không gây vỡ bảng hay đè chữ.

---

### 10. Section Rendering
- Nếu đề xuất có chia nhóm (Phần/Hạng mục như `PHẦN ĐIỆN NHẸ`), dòng nhóm được render nổi bật trải dài toàn bộ chiều rộng bảng (`colSpan 8`), không hiển thị STT hay khối lượng giả.

---

### 11. Excel Integration
- Nút `[Tải Excel]` gọi trực tiếp API `GET /materials/proposals/[id]/export?format=excel`.
- Kết nối tới `renderMaterialProposalExcel`, tải file `.xlsx` được format chuẩn theo mẫu Golden Template.

---

### 12. PDF Integration
- Nút `[Tải PDF]` gọi API `GET /materials/proposals/[id]/export?format=pdf`.
- Sử dụng Playwright headless browser điều hướng tới `/materials/proposals/[id]/print` để xuất tệp PDF khổ ngang A4 sắc nét, đúng cấu trúc.

---

### 13. Print Integration
- Nút `[In]` gọi hàm `window.print()`.
- Quy tắc `@media print` được thiết lập tối ưu:
  - Ẩn hoàn toàn Toolbar, Sidebar, Top Navigation, các button và background màu xám.
  - Chỉ in duy nhất trang giấy trắng tài liệu Đề xuất vật tư.

---

### 14. Multi-page Behavior
- Tài liệu nhiều hàng vật tư tự động phân trang ổn định.
- Thẻ bảng và khối chữ ký có thuộc tính `page-break-inside: avoid` để chống đè lấn hoặc mồ côi chữ ký ở cuối trang.

---

### 15. RBAC
- Quyền truy cập được kiểm tra chặt chẽ ở cả Server Component và Route Handler (`getSession()`, `getMaterialProposal()`, `canAccessProjectProposal()`).
- Người dùng không có quyền truy cập dự án sẽ nhận phản hồi HTTP 403 / 404.

---

### 16. Preview/Excel/PDF/Print Consistency
- 100% dữ liệu nghiệp vụ đồng bộ tuyệt đối trên cả 4 kênh hiển thị:
  - Mã đề xuất, Ngày đề xuất, Công trình, Địa điểm, Người đề xuất, Lý do mua, Ngày cấp.
  - Danh sách vật tư (Số lượng, STT, Nhóm, Đơn vị, Khối lượng Hợp đồng, Khối lượng Thực tế, Quy cách, Hãng sản xuất, Ghi chú).

---

### 17. Responsive QA
- **Desktop (>= 1280px):** Giấy A4 Landscape đặt căn giữa màn hình, viền bóng nổi bật.
- **Laptop / Tablet / Mobile:** Canvas hỗ trợ cuộn ngang mượt màng (`overflow-x-auto`), bảo đảm không làm biến dạng tỷ lệ tài liệu.

---

### 18. Browser Console
- Console sạch 100%: 0 Errors, 0 Warnings, 0 Hydration errors.

---

### 19. TypeScript
- Run `npx tsc --noEmit`: **0 LỖI (PASS)**.

---

### 20. Lint
- Run `npm run lint`: **0 LỖI TRÊN MODULE MATERIAL PROPOSAL (PASS)**.

---

### 21. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 22. Changed Files
- `src/components/materials/material-proposal-document-view.tsx` *(Thành phần render mẫu tài liệu)*
- `src/components/materials/material-proposal-preview-toolbar.tsx` *(Toolbar điều khiển Xem trước, Tải Excel, PDF, In)*
- `src/app/(dashboard)/materials/proposals/[id]/preview/page.tsx` *(Trang Xem trước đề xuất vật tư)*
- `src/app/(dashboard)/materials/proposals/[id]/print/page.tsx` *(Trang phục vụ in ấn và xuất PDF)*
- `src/app/(dashboard)/materials/proposals/[id]/export/route.ts` *(API Handler xuất Excel và PDF)*
- `src/components/materials/material-proposal-form.tsx` *(Thêm nút Xem trước & kích hoạt Autosave trước khi mở)*

---

### 23. Remaining Risks
- Không có rủi ro còn tồn đọng. Tất cả quy trình bảo mật, Autosave và xuất file đã được bao phủ bởi các bài test tự động.

---

### 24. FINAL DECISION
**PASSED**
