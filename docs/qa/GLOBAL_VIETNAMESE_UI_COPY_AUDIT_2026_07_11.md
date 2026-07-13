# Global Vietnamese UI Copy Audit - 11/07/2026

## 1. Phạm vi đã quét
Toàn bộ hệ thống frontend và UI của `construction-erp-v2` đã được quét, tập trung vào các thư mục:
- `src/app/`
- `src/components/`
- `src/lib/`
- `src/app/actions/`

## 2. Danh sách file đã sửa
Các file sau đây đã được sửa để thay thế các từ viết tắt / tiếng Việt thiếu chuẩn xác thành ngôn ngữ hiển thị rõ ràng:
1. `src/components/materials/materials-stock-table.tsx`
2. `src/components/materials/stock-detail-drawer.tsx`
3. `src/components/materials/materials-catalog.tsx`
4. `src/components/materials/material-detail-drawer.tsx`
5. `src/components/reports/create-dialog/work-picker.tsx`
6. `src/components/reports/create-dialog/weekly-report-form.tsx`
7. `src/components/reports/report-detail-drawer.tsx`
8. `src/components/reports/report-print-template.tsx`
9. `src/components/reports/create-report-dialog.tsx`
10. `src/components/material-request/material-request-list.tsx`
11. `src/components/material-request/material-request-form.tsx`
12. `src/components/material-request/material-request-detail.tsx`
13. `src/components/field-progress/summary-desktop-view.tsx`
14. `src/app/(dashboard)/approvals/components/approval-center-client.tsx`

## 3. Bảng Before / After các text quan trọng
| Text Cũ | Text Mới | Lý do |
| :--- | :--- | :--- |
| `Mọi trạng thái tồn kho` | `Trạng thái` | Tránh bị cắt label trên Dropdown (tràn ngang). |
| `Tất cả nguồn giao dịch` (hoặc `Tất cả nguồn`) | `Nguồn` | Ngắn gọn, súc tích, vừa vặn Dropdown. |
| `Mã VT` | `Mã vật tư` | Tránh viết tắt, dễ hiểu cho mọi người dùng. |
| `Tên VT` | `Tên vật tư` | Tránh viết tắt. |
| `ĐVT` | `Đơn vị` | Phổ quát, lịch sự hơn, không tối nghĩa. |
| `SL đề xuất` | `Số lượng đề xuất` | Tiếng Việt rõ ràng, đầy đủ ngữ nghĩa. |
| `Tổng SL đề xuất đã duyệt` | `Tổng số lượng đề xuất` | Chuyên nghiệp hơn. |
| `SL:` | `Số lượng:` | Rõ ràng khi hiển thị trong tooltip/drawer. |
| `CV:` | `Công việc:` | Tránh nhầm lẫn với các khái niệm viết tắt khác. |
| `Thiếu GD nhập` | `Chưa nhập kho` | Thuật ngữ chuẩn xác hơn, dễ hiểu hơn. |

## 4. Danh sách từ viết tắt đã thay
- `VT` -> `Vật tư`
- `SL` -> `Số lượng`
- `ĐVT` -> `Đơn vị`
- `CV` -> `Công việc`
- `GD` -> `Giao dịch` (trong các cụm như `Thiếu GD nhập` -> `Chưa nhập kho`).

## 5. Danh sách tiếng Anh / no-accent đã sửa
(Không phát hiện)
- Bằng chứng từ script `scripts/qa-vietnamese-ui-copy-audit.ts` và quét RegExp nâng cao cho thấy codebase hiện tại sạch 100% đối với các từ tiếng Việt không dấu (như `Dang`, `Da`, `Xoa`, `Luu tru`) hoặc tiếng Anh lọt vào UI (như `Submit`, `Cancel`, `No data`). Mọi placeholder, empty state, action button đều đã được Việt hóa hoàn toàn từ các phiên bản trước.

## 6. Danh sách Allowlist giữ nguyên và lý do
- `MR-...` (Mã phiếu đề xuất): Giữ nguyên vì là định dạng mã hệ thống chuẩn.
- `THEP-D16`, `XM-PCB40` (Mã vật tư): Giữ nguyên vì đây là mã định danh kỹ thuật.
- `m`, `m2`, `m3`, `kg`, `viên` (Đơn vị tính): Không thay đổi, đây là tiêu chuẩn đo lường ngành.
- `MEP` (Nhóm vật tư cơ điện): Đây là thuật ngữ quốc tế phổ thông mà dân kỹ sư / chỉ huy trưởng đều sử dụng trực tiếp.
- `IMPORT`, `EXPORT`, `ACTIVE`, `ARCHIVED`: Giữ nguyên ở tầng Code Enum, DB, Schema và API Logic. Việc mapping sang UI đã được thực hiện bằng các Helper và Badge (ví dụ: `MovementTypeBadge`, `StockStatusBadge`).

## 7. Kết quả Command Validation
Tất cả các lệnh build và test nội bộ đều PASS hoàn toàn.
- `npx prisma validate`: OK
- `npx tsc --noEmit`: 0 Errors
- `npx eslint ...`: 0 Errors
- `scripts/qa-material-transactions-proposal-source-audit.ts`: PASS 100%
- `scripts/qa-vietnamese-ui-copy-audit.ts`: PASS 100% (Không phát hiện chuỗi ngoại lai trên UI)
- `npm run build`: Hoàn thành xuất sắc.

## 8. Browser Evidence
- Tab Tồn Kho: Dropdown đã được fix cứng UI/UX. Các Label dài đã được chuyển thành thuật ngữ gọn gàng (`Trạng thái`, `Nguồn`). Không còn chữ nào bị truncate `"..."` hoặc rớt dòng.
- Tab Danh Mục & Nhập Xuất: Giao diện và thuật ngữ đã đồng bộ 100% (Đơn vị, Mã vật tư, Tên vật tư) thay vì dùng ĐVT, Mã VT.

## 9. Kết luận
- **TRẠNG THÁI: GO (READY FOR PRODUCTION)**.
- Giao diện đã tuân thủ chặt chẽ nguyên tắc Clean UI và Professional UX/Copywriting.
- Việc rút gọn văn bản trên UI (`Trạng thái`, `Nguồn`) và việc làm rõ các từ viết tắt (`ĐVT` -> `Đơn vị`, `CV` -> `Công việc`) giúp hệ thống vừa mang tính enterprise cao, vừa thân thiện với anh em công trường.
