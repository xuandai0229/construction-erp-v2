# Báo Cáo QA: Đồng Bộ Thao Tác Và Xóa Vật Tư (Materials Module)

**Ngày thực hiện:** 10/07/2026
**Kết quả:** PASS

---

## 1. Phân Tích Hiện Trạng (Dựa Trên Phản Hồi Từ Người Dùng)

### Lỗi 1: Tab Yêu Cầu Vật Tư Thiếu Nghiệp Vụ
- **Thực trạng:** Menu 3 chấm của phiếu chỉ có `Chi tiết`, `Sao chép mã`. Các nút `Xem phê duyệt`, `Hủy phiếu` bị disabled giả với lý do "đang phát triển" hoặc "chưa hỗ trợ". Không có action sửa/xóa phiếu nháp.
- **Nguyên nhân:** Giao diện chưa nối với các server action hiện có (hoặc chưa implement đủ server action). Việc hardcode disabled làm mất tính nghiệp vụ của ứng dụng.

### Lỗi 2: Tab Nhập/Xuất Thiếu Nghiệp Vụ
- **Thực trạng:** Menu chỉ có `Xem chi tiết`, `Xem vật tư`, `Xuất tiếp`... Không có hành động để sửa/đảo (hủy) giao dịch kho.
- **Nguyên nhân:** Sổ kho (MaterialMovement) là sổ kế toán, schema hiện tại không có trường `deletedAt`. Do đó chưa hỗ trợ sửa/xóa mềm. Việc không có nút báo hiệu cho người dùng tạo cảm giác module sơ sài.

### Lỗi 3: Xóa Vật Tư Gây Lỗi Đồng Bộ Lịch Sử (UX/Data Consistency)
- **Thực trạng:** Khi xóa vật tư "Cát vàng" khỏi danh mục, vật tư biến mất khỏi Catalog nhưng bên tab Nhập/Xuất vẫn hiện như vật tư đang hoạt động. Action "Xem vật tư" gây lỗi/điều hướng sai.
- **Nguyên nhân:** `deleteMaterialItem` đang thực hiện gán `isActive = false` (soft delete / archive) để bảo toàn giao dịch cũ, tuy nhiên màn hình Nhập/Xuất chưa xử lý render UI theo cờ này, dẫn đến giao dịch cũ hiển thị như vật tư active, gây lúng túng cho người dùng.

---

## 2. Chính Sách Giải Quyết Đã Chọn

1. **Chính sách xóa vật tư (Catalog):**
   - Áp dụng **Soft Delete / Archive (`isActive: false`)** nếu vật tư đã phát sinh giao dịch hoặc đang có tồn kho.
   - **Hard Delete** chỉ khi vật tư hoàn toàn nháp, chưa có giao dịch nào.
   - Khi đã soft delete:
     - Biến mất khỏi Catalog, Stock chính, Form tạo phiếu.
     - Vẫn hiển thị tại Nhập/Xuất để xem lịch sử, nhưng có badge **`Đã lưu trữ`** bên cạnh tên vật tư. Nút *Xem vật tư* bị vô hiệu hóa kèm tooltip giải thích.

2. **Chính sách Sửa/Hủy Giao Dịch Kho (Nhập/Xuất):**
   - Sổ kho là bất biến trừ khi có giao dịch đảo (reverse movement). Do schema chưa hỗ trợ liên kết giao dịch gốc/điều chỉnh.
   - Tạm thời hiển thị các action `Sửa giao dịch`, `Đảo giao dịch` ở trạng thái **disabled** có lý do rõ ràng ("Chưa hỗ trợ sửa trực tiếp do ảnh hưởng sổ kho (cần tạo giao dịch điều chỉnh)", "Chưa hỗ trợ đảo tự động").

3. **Chính sách Thao Tác Phiếu (Yêu cầu vật tư):**
   - Nối Server Action xóa phiếu mềm/cứng tùy trạng thái.
   - Thêm Server Action mới `cancelMaterialRequest` để hỗ trợ hủy phiếu đã SUBMITTED.
   - Mở khóa nút `Xem phê duyệt` nếu request đã gắn với `approvalRequestId`.

---

## 3. Các Thay Đổi Implement

### Các File Đã Sửa:
1. `src/app/actions/material-request.ts`
2. `src/components/material-request/material-request-list.tsx`
3. `src/components/materials/materials-transactions.tsx`
4. `src/components/materials/materials-catalog.tsx`
5. `src/components/materials/materials-stock-table.tsx`
6. `scripts/qa-material-delete-sync.ts` (mới)

### Server Action Đã Thêm/Sửa:
- Đã thêm `cancelMaterialRequest(id, reason)` trong `actions/material-request.ts`. Server action này cập nhật status của MaterialRequest thành `CANCELLED` và đồng bộ hủy tương ứng bên ApprovalRequest nếu đang `PENDING`.

### Action Menu Đã Chuẩn Hóa Ở Từng Tab:
- **Tab Yêu cầu vật tư:**
  - DRAFT/REJECTED: *Chi tiết, Sửa phiếu, Nhân bản (Disabled), Xóa phiếu (Có Confirm, Action Xóa)*
  - SUBMITTED: *Chi tiết, Xem phê duyệt (Mở khóa nếu có ID), Hủy phiếu (Có Confirm, Action Hủy), Sao chép mã*
  - APPROVED / PROCESSING / ISSUED: *Chi tiết, Xem phê duyệt, Xuất kho/Theo dõi cấp phát (Disabled giả có lý do), Sao chép mã*
  - RECEIVED/CANCELLED: *Chi tiết, Sao chép mã*
- **Tab Nhập/Xuất:**
  - Cập nhật thêm *Sửa giao dịch* (Disabled có lý do)
  - Cập nhật thêm *Đảo giao dịch* (Disabled nguy hiểm, có lý do)
  - Cập nhật *Xem vật tư* (Disabled nếu vật tư đã lưu trữ)
  - Có thêm Checkbox "Hiện đã lưu trữ" trong filter để có thể xem lại hoặc lọc đi những giao dịch của vật tư đã xóa.
- **Tab Danh Mục & Tồn Kho:**
  - Đảm bảo header bảng nhất quán 1 dòng, cột `Thao tác` width 80px/92px. Menu dropdown không tràn viewport, không trigger click row.

---

## 4. Kết Quả Kiểm Tra (QA)

### Các Lệnh Đã Chạy:
1. `npx tsc --noEmit` -> **PASS**
2. `npm run build` -> **PASS** (1 cảnh báo Turbopack chuẩn của Next.js)
3. `npx eslint` trên các scope -> **PASS** (không có error, chỉ có warning unused vars).
4. `npx tsx scripts/qa-material-movement-count-consistency.ts` -> **PASS**
5. `npx tsx scripts/qa-material-delete-sync.ts` -> **PASS** (Test đã xác thực vật tư soft-delete được loại khỏi Catalog/Stock, nhưng hiển thị inactive trên Transactions payload).
6. `npx tsx scripts/qa-material-request-snapshot-persistence.ts` -> **PASS**

### Những Gì Chưa Làm Được Do Schema Hỗ Trợ:
- Việc đảo/hủy giao dịch kho cần phải tạo movement ngược (reverse), nhưng do schema `MaterialMovement` không có trường link như `reverseOfId` hay `adjustmentSourceId` nên chưa tự động hóa đảo giao dịch trực tiếp. Tạm thời chỉ disabled các action liên quan tới sửa/đảo với message khuyên tạo giao dịch bù trừ tay.
- Nhân bản phiếu: Chưa tạo tính năng clone toàn bộ detail items (do ít dùng và phức tạp trong validation), vẫn để disabled có lý do.

---

## KẾT LUẬN

**PASS** 
(Đủ checklist, build pass, sync xóa vật tư an toàn trên mọi tab theo đúng chính sách lưu trữ thay vì hard delete).
