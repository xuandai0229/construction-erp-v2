# MATERIALS FULL CRUD FINAL REPORT

**Date**: 2026-06-25
**Role**: Principal ERP Product Engineer + Senior Full-stack Engineer
**Scope**: Hoàn thiện toàn bộ vòng đời CRUD cho phân hệ Vật tư (Materials)

---

## 1. Skill.md Audit
Đã đọc và tuân thủ `.agents/skills/design-taste-frontend/SKILL.md`. Việc bổ sung nút Sửa/Xóa tuân thủ nghiêm ngặt rule "không nhồi nhét nút":
* Dùng các nút biểu tượng (icon buttons) nhỏ gọn.
* Empty state được giữ đẹp, clear.
* Các modal xác nhận (ConfirmDialog) tách biệt, an toàn, sử dụng đúng variant danger/info theo mức độ rủi ro.

## 2. Hiện trạng CRUD (Trước khi sửa)
* **Thêm vật tư (Create)**: Đã có action và UI.
* **Sửa vật tư (Update)**: Có action backend (`updateMaterialItem`) nhưng chưa có UI. Không chặn việc sửa đơn vị tính (unit) dù vật tư đã có lịch sử -> Nguy cơ sai lệch tồn kho nghiêm trọng.
* **Xóa vật tư (Delete)**: Chưa hề có action backend và UI.

## 3. Chính sách Xóa / Ngừng sử dụng đã chọn
Để bảo toàn tuyệt đối toàn vẹn dữ liệu (Data Integrity) và Lịch sử nhập/xuất (Audit Trail), tôi áp dụng nguyên tắc vòng đời (Lifecycle) như sau:
1. **Chưa từng phát sinh giao dịch (movement = 0) và tồn kho = 0**: Cho phép **Xóa Vĩnh Viễn** (Hard Delete).
2. **Đã từng có giao dịch nhưng tồn kho hiện tại = 0**: Không được xóa vĩnh viễn. Chỉ cho phép **Ngừng Sử Dụng** (Archive / Soft-delete).
3. **Đang có tồn kho > 0**: KHÔNG cho phép Xóa hay Ngừng sử dụng dưới bất kỳ hình thức nào. Hệ thống báo lỗi bắt buộc xuất kho hoặc điều chỉnh về 0 trước khi thực hiện.

## 4. Schema & Migration Changes
Thêm field `isActive` vào model `MaterialItem`:
```prisma
model MaterialItem {
  // ...
  isActive  Boolean  @default(true)
}
```
* Đã tạo migration an toàn (`prisma db push` trên local, không reset data).
* Toàn bộ dữ liệu hiện tại mặc định mang `isActive = true`.

## 5. Thêm Vật Tư (Create)
Giữ nguyên logic project-scoped. Vật tư được tạo tự động map với `projectId` hiện tại. Action an toàn, được bọc transaction và assert RBAC.

## 6. Sửa Vật Tư (Update)
* Đã gắn UI vào màn hình Catalog. Dùng chung `MaterialFormDialog` bằng cách truyền `initialData`.
* **Logic chặn an toàn**: Backend đếm số lượng `materialMovement`. Nếu `movementCount > 0`, chặn tuyệt đối việc update field `unit` để không làm hỏng đơn vị các phiếu nhập/xuất cũ. Các trường tên, nhóm, mô tả vẫn cho sửa bình thường. UI tự động disable thẻ input `unit` kèm tooltip giải thích nguyên nhân.

## 7. Xóa Vật Tư / Ngừng Sử Dụng (Delete / Archive)
* Backend có action `deleteMaterialItem`. Tự động rẽ nhánh hard-delete hoặc `isActive = false` dựa vào `movementCount`.
* Có action `restoreMaterialItem` để khôi phục (nếu không bị trùng mã `code`).
* Backend xử lý thêm lớp khóa trong `applyMaterialMovement` (ledger.ts): Nếu `isActive === false`, chặn mọi thao tác nhập/xuất.

## 8. Xử lý UI
* **Catalog**: Tích hợp thanh Tabs filter `Đang dùng / Ngừng sử dụng`. Các vật tư inactive sẽ được gắn badge "Ngừng sử dụng" và hiển thị mờ đi đôi chút. Nút Nhập/Xuất bị vô hiệu hóa.
* **Dialogs**:
  * Tái sử dụng `MaterialFormDialog`. Tiêu đề đổi thành "Cập nhật vật tư" khi có initialData.
  * Tích hợp `ConfirmDialog` linh hoạt, tự động đổi thông điệp cảnh báo Xóa vĩnh viễn hay Ngừng sử dụng tùy vào trạng thái giao dịch của vật tư đó.

## 9. RBAC & Security Check
* Các thao tác Sửa / Xóa được pass qua `assertProjectAccess` trên ID công trình của chính vật tư đó, ngăn chặn việc User hack param qua API để sửa xóa vật tư của công trình khác.
* Thao tác đổi unit bị khóa bằng query SQL count, chứ không chỉ vô hiệu hóa trên UI.

## 10. Audit Scripts & Testing
### A. Kết quả `qa-materials-crud-flow.ts`
Script được chạy trên môi trường thực tế, mô phỏng đúng các case:
* Create project -> Create Material.
* Import 100 -> Blocked Delete (Pass).
* Blocked Unit Change (Pass).
* Export 100 -> Stock 0 -> Archive Material (Pass).

### B. Kết quả `qa-materials-db-sync-audit.ts`
Chạy hoàn hảo, 100% khớp dữ liệu, không có record nào chênh lệch giữa Bảng tồn kho và Lịch sử nhập xuất. 0 Tồn kho âm.

### C. Kết quả Project-Scoped Flow
Mọi project giả lập đều được verify không nhìn thấy dữ liệu của nhau. Isolation 100%.

### D. Kết quả Build
* `npx prisma format/validate/generate` -> PASS
* `npx tsc --noEmit` -> PASS
* `npm run build` -> PASS (Exit code 0).

## 11. Các File Bị Ảnh Hưởng
* `prisma/schema.prisma`
* `src/lib/materials/ledger.ts`
* `src/app/(dashboard)/materials/actions.ts`
* `src/components/materials/materials-workspace.tsx`
* `src/components/materials/materials-catalog.tsx`
* `src/components/materials/material-form-dialog.tsx`
* `scripts/qa-materials-crud-flow.ts` (Mới)

## 12. Hướng dẫn Test Thủ Công (UAT)
1. Truy cập phân hệ Vật tư, chọn Công trình.
2. Tại tab "Danh mục vật tư", bấm vào biểu tượng "Cây bút" để **Sửa**:
   * Đổi tên, nhóm -> Lưu -> Thành công.
3. Bấm biểu tượng "Thùng rác" để **Xóa**:
   * Vì vật tư mới tinh chưa có giao dịch -> Hiện thông báo Xóa vĩnh viễn -> Bấm Xóa -> Biến mất hoàn toàn.
4. Tạo lại vật tư mới -> Bấm **Nhập kho** 100 cái.
5. Lại thử bấm biểu tượng Thùng rác:
   * Hệ thống báo lỗi "Vật tư còn tồn kho, cần xuất/điều chỉnh về 0 trước khi ngừng sử dụng." (Thành công).
6. Bấm biểu tượng Cây bút để thử sửa Đơn vị:
   * Ô Đơn vị tính bị mờ đi, không cho gõ (Thành công).
7. Bấm **Xuất kho** 100 cái.
8. Bấm lại biểu tượng Thùng rác:
   * Form báo "Vật tư này đã có giao dịch... chuyển sang Ngừng sử dụng" -> Đồng ý -> Trạng thái vật tư biến thành Ngừng sử dụng, nhảy sang tab "Ngừng sử dụng". Mọi nút Nhập/Xuất đã bị khóa.

**TẤT CẢ ĐIỀU KIỆN ĐẠT ĐÃ HOÀN THÀNH 100%. SẴN SÀNG RELEASE.**
