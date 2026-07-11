# Báo cáo QA: Tính Năng Chọn Và Tạo Mới Nhóm Vật Tư Bằng Combobox
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Vấn đề thực trạng (Trước audit)
- Bộ lọc `Nhóm vật tư` hiển thị danh sách hard-code các giá trị cứng ngắc, không phản ánh dữ liệu thực tế người dùng đã tạo.
- Khi thêm hoặc sửa nhóm, người dùng không nhận được gợi ý những nhóm sẵn có để chọn, gây phân mảnh và sai lệch chính tả tên nhóm.
- Giao diện form chứa input số `minStockLevel` gặp lỗi bôi đen số `0` gây ra việc nhập sai số liệu lượng lớn (Ví dụ: `44` biến thành `440`).
- Dữ liệu nhóm của vật tư đã lưu trữ (Archived) bị hiển thị làm ô nhiễm bộ lọc danh sách vật tư hiện hành.

## 2. Giải pháp thực hiện & Logic kỹ thuật

### A. Dynamic Material Group Filter
- **Nguồn dữ liệu thực:** Bỏ mảng hard-code, `groups` được suy ra trực tiếp từ trường `group` trong cơ sở dữ liệu của `MaterialItem` thuộc Project hiện hành.
- **Tính toán theo Context Trạng Thái:**
  - `ACTIVE`: Chỉ tính các nhóm của vật tư đang sử dụng.
  - `ARCHIVED`: Chỉ tính nhóm của các vật tư đã lưu trữ.
  - `ALL`: Gộp nhóm từ toàn bộ vật tư.
- **Bảo toàn tiếng Việt có dấu:** Các tên nhóm tự nhập (`"Ống nhựa Tiền Phong"`, `"Thiết bị điện"`) được bảo toàn tuyệt đối không bị `.toLowerCase()` hay `.toUpperCase()`. Chức năng sort trên Combobox sử dụng chuẩn `.localeCompare('vi')`.

### B. Creatable Combobox (UI Form Update)
- Field `Nhóm vật tư` trong `MaterialFormDialog` đã được chuyển đổi từ `<input>` native sang `<EnterpriseCombobox allowCustom={true} />`.
- **UX Tính năng:** 
  - Khi focus, hiển thị danh sách các nhóm đã tồn tại của dự án để chọn.
  - Khi gõ tên nhóm mới, tự động đề xuất tuỳ chọn `"Tạo nhóm mới: <Tên nhóm>"`.
  - Giữ dropdown có chiều cao `compact` (vừa phải) và không gây tràn Modal (Z-index/Portal fix thông qua `EnterpriseCombobox`).

### C. Numeric Input Empty State Hardening
- Đã khắc phục triệt để lỗi "044" ở input số `Ngưỡng cảnh báo tồn tối thiểu`.
- Form khởi tạo với `minStockLevel: ""`. Khi submit lên nếu là chuỗi rỗng sẽ được Server/Client Parser an toàn convert thành `0`.

## 3. Quá trình kiểm tra (QA Verification)
Script `scripts/qa-material-group-dynamic-filter.ts` và `scripts/qa-global-numeric-input-empty-zero-ux.ts` đã chạy và thực hiện các test cases:
1. **Tạo vật tư với nhóm mới** -> Group lưu đúng nguyên gốc, đúng dấu.
2. **Cập nhật vật tư sang nhóm khác** -> Trạng thái lưu chuẩn.
3. **Archive vật tư** -> Nhóm archived được ẩn khỏi luồng lọc Active an toàn.
4. **Xử lý Numeric Input Edge Case** -> parse("044") => `44`, parse("") => `0`.

**Kết quả Lệnh Kiểm Tra Kỹ Thuật:**
- `npx prisma validate`: PASS
- `npx tsc --noEmit`: PASS (0 Error)
- `npx eslint`: PASS
- `npm run build`: PASS (Exit Code 0)

## 4. Kết luận
Tất cả các tiêu chí của Phase 1 - 10 đã được đáp ứng 100%. Giao diện Nhóm Vật Tư đã phản hồi dữ liệu thời gian thực và trải nghiệm thêm/sửa trực quan hơn đáng kể. Trạng thái Production: **GO**.
