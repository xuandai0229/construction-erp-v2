# MATERIAL PROPOSAL V2 — IMPLEMENTATION REPORT

## 1. Golden XLSX Analysis

Đã audit workbook gốc trước khi code. Sheet nghiệp vụ là `kl`; `foxz` là `veryHidden` và không có dữ liệu nghiệp vụ. Chi tiết đầy đủ ở [MATERIAL_PROPOSAL_V2_GOLDEN_XLSX_ANALYSIS.md](./MATERIAL_PROPOSAL_V2_GOLDEN_XLSX_ANALYSIS.md).

## 2. Workbook/Sheet Mapping

Exporter dùng bản sao read-only `src/templates/material-proposal-golden.xlsx`, chọn `kl`, giữ header, merge, width, style, landscape và fit-to-width. File gốc ngoài repository không bị ghi đè.

## 3. Business Field Mapping

Header snapshot map vào công trình, địa điểm, người đề nghị/vai trò, ngày đề nghị và lý do. Bảng giữ đúng 8 cột Golden: STT, tên, đơn vị, theo hợp đồng, thực tế, quy cách, hãng/xuất xứ, ghi chú. `contractQuantityText` là String nên giữ được `(43m)`.

## 4. New Domain Architecture

Đã thêm `MaterialProposal`, `MaterialProposalItem`, `MaterialProposalApproval`; không khôi phục legacy `MaterialRequest`. Section là `sectionName`, không tạo pseudo item.

## 5. Schema & Migration

Migration additive `20260810190000_material_proposal_v2`: snapshot fields, item fields, technical-assignment flag và approval stages. Invariant pending dùng partial unique index theo `proposalId` với `status = PENDING`.

## 6. Access Control Matrix

Server action và download route đều kiểm tra session + active ProjectMember; high-level role xem toàn công ty. User ngoài công trình bị chặn ở server, không chỉ ẩn UI. Tạo proposal yêu cầu member không phải VIEWER.

## 7. Auto-fill Mapping

Tạo proposal lấy project name/location, user name/role, proposal date và proposal number từ server; người dùng chỉ nhập lý do, ngày cấp và dòng vật tư.

## 8. Snapshot Strategy

Tên/địa điểm công trình và tên/vai trò người đề nghị được lưu ngay lúc tạo; export/detail không đọc lại live project/user để dựng lịch sử.

## 9. Create Form

Đã có full page `/materials/proposals/new`, grid vật tư, thêm/xóa dòng, số lượng thực tế > 0 và không thêm cột ngoài Golden.

## 10. List/Detail

Tab Đề xuất vật tư dùng bảng mã phiếu, công trình, người đề nghị, ngày, số vật tư, trạng thái và thao tác. Detail hiển thị snapshot, lý do, delivery date, item table và tải Excel.

## 11. Approval Workflow

Submit tạo TECHNICAL pending; duyệt kỹ thuật tạo FINAL pending; duyệt cuối chuyển proposal sang APPROVED. Từ chối kỹ thuật đưa về REVISION_REQUESTED. Không tạo tồn kho, movement hoặc catalog item.

## 12. Technical Approver Assignment

Dùng `ProjectMember.canApproveMaterialProposalTechnical`; không auto-map role cũ. Submit bị chặn nếu công trình chưa có người được phân công.

## 13. Inventory Boundary

Domain mới không có write path tới `MaterialItem`, `ProjectMaterialStock` hoặc `MaterialMovement` khi approve.

## 14. Excel Golden Template Engine

Load workbook gốc từ application asset, clone in memory, inject dynamic cells, rồi trả buffer mới. Static sample values không được dùng làm default.

## 15. Dynamic Row Strategy

Exporter xoá vùng sample rows, clone style item/section/footer/signature và đặt lại footer/signature sau dòng cuối. Test đã chạy 3 dòng và 100 dòng.

## 16. Section Row Strategy

Khi `sectionName` thay đổi, chèn visual section row không STT/quantity theo style sample row 23; không tính là item.

## 17. Pagination Strategy

Giữ landscape, scale/fit-width của Golden và không hardcode “Page 1/2”. Footer/signature được di chuyển sau item cuối.

## 18. Download Security

`/materials/proposals/[id]/export` gọi `getMaterialProposal`, nên guessed proposalId ngoài scope bị từ chối trước khi render buffer. Filename được sanitize.

## 19. Excel Fidelity Tests

PASS: sheet `kl`, dynamic header/item/section, contract text, column width, merge anchor, footer/signature placement, 100-item output. PASS: workbook opens through ExcelJS without repair error.

## 20. RBAC Tests

Chưa chạy ma trận E2E đầy đủ 7–11, 21–23 và download IDOR trên database runtime. Server guards đã được implement.

## 21. Concurrency Tests

Partial unique pending index và transaction/update path đã implement. Chưa chạy test PostgreSQL concurrency thực tế trong môi trường này.

## 22. Regression Tests

Không thay đổi write path inventory/catalog. Full regression suite chưa được chạy.

## 23. TypeScript

PASS: `npx tsc --noEmit`.

## 24. Lint

PASS cho files V2 mới; workspace còn 3 warning unused legacy props, không có error.

## 25. Build

PASS: `npm run build`.

## 26. Changed Files

- `prisma/schema.prisma`
- `prisma/migrations/20260810190000_material_proposal_v2/migration.sql`
- `src/templates/material-proposal-golden.xlsx`
- `src/lib/material-proposals/{actions,permissions,exporter}.ts`
- `src/lib/material-proposals/exporter.test.ts`
- `src/app/(dashboard)/materials/proposals/**`
- `src/components/materials/material-proposal-{form,list,approval-actions}.tsx`
- `src/app/(dashboard)/materials/page.tsx`
- `src/components/materials/materials-workspace.tsx`

## 27. Known Risks

- Chưa migrate/apply database trong môi trường có dữ liệu thật.
- Chưa có UI approval actions gắn trên detail trong bản này; service đã có, component sẵn sàng nhưng cần nối vào policy/session presentation.
- Chưa có catalog picker/outside-catalog toggle hoàn chỉnh trong form; payload/domain đã hỗ trợ cả hai.
- Chưa chạy full E2E/RBAC/concurrency/regression matrix.

## 28. FINAL DECISION

**FAIL — implementation is buildable and Golden exporter fidelity tests pass, but Gate G is not PASS yet.**

Các mục đã xác minh: `GOLDEN TEMPLATE STRUCTURE: PASS`, `EXCEL DATA MAPPING: PASS`, `PRINT/PAGE SETUP: PASS`, `TypeScript: PASS`, `Build: PASS`. Không tuyên bố 100% match hoặc full V2 acceptance vì còn thiếu E2E/RBAC/concurrency/regression và cần hoàn thiện nối UI approval/catalog picker.
