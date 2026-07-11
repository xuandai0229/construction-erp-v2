# Báo Cáo QA: UI Vietnamese Text Audit & Fix
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Mục tiêu
Thanh tra toàn bộ codebase để loại bỏ các cụm từ tiếng Việt không dấu, tiếng Anh hoặc technical enum lọt ra ngoài giao diện người dùng. Đảm bảo hệ thống tuân thủ 100% tiếng Việt chuẩn có dấu, đặc biệt ở module Materials và các module cốt lõi khác.

## 2. Các lỗi tiếng Việt không dấu đã tìm thấy & Sửa chữa
1. **`materials-catalog.tsx`** & **`materials-stock-table.tsx`**:
   - `Vat tu da luu tru` -> `Vật tư đã lưu trữ`
   - `Khoi phuc vat tu` -> `Khôi phục vật tư`
   - `Loc trang thai vat tu` -> `Lọc trạng thái vật tư`
   - `Dang su dung` -> `Đang sử dụng`
   - `Da luu tru` -> `Đã lưu trữ`
   - `Tat ca trang thai` -> `Tất cả trạng thái`

2. **`material-request-list.tsx`** (Các Toast messages):
   - `Co loi xay ra` -> `Có lỗi xảy ra`
   - `Da xoa phieu yeu cau vat tu` -> `Đã xóa phiếu yêu cầu vật tư`
   - `Da huy phieu yeu cau vat tu` -> `Đã hủy phiếu yêu cầu vật tư`

3. **`lib/material-requests/validation.ts`** (Các Validation Error messages đổ ra UI):
   - `Vui long chon cong trinh` -> `Vui lòng chọn công trình`
   - `ngay de xuat` -> `ngày đề xuất`
   - `ngay can vat tu` -> `ngày cần vật tư`
   - `Ngay can vat tu khong duoc nho hon ngay de xuat` -> `Ngày cần vật tư không được nhỏ hơn ngày đề xuất`
   - `Vui long them it nhat mot dong vat tu` -> `Vui lòng thêm ít nhất một dòng vật tư`
   - `Vui long cap nhat it nhat mot dong vat tu` -> `Vui lòng cập nhật ít nhất một dòng vật tư`
   - `Ten vat tu la bat buoc` -> `Tên vật tư là bắt buộc`
   - `Don vi tinh la bat buoc` -> `Đơn vị tính là bắt buộc`
   - `So luong khong hop le` -> `Số lượng không hợp lệ`
   - `So luong de xuat` -> `Số lượng đề xuất`
   - `So luong da cap khong duoc lon hon so luong de xuat` -> `Số lượng đã cấp không được lớn hơn số lượng đề xuất`
   - `So luong da nhan khong duoc lon hon so luong da cap` -> `Số lượng đã nhận không được lớn hơn số lượng đã cấp`
   - `Dong ${index + 1}` -> `Dòng ${index + 1}`

4. **`app/actions/material-request.ts`** (Server Actions errors):
   - `Chi co the cap nhat cap/nhan cho phieu da duyet hoac dang xu ly` -> `Chỉ có thể cập nhật cấp/nhận cho phiếu đã duyệt hoặc đang xử lý`

5. **`components/reports/types.ts`** (Report status enums):
   - `Da khoa` -> `Đã khóa`
   - `Da huy` -> `Đã hủy`

6. **`components/material-request/material-request-detail.tsx`**:
   - Các lỗi validation ném ra `So luong da cap cua ...` đã được chuyển thành tiếng Việt có dấu.

## 3. Tool Auto QA (`qa-ui-vietnamese-text-audit.ts`)
- Script tùy chỉnh đã được tạo để quét qua toàn bộ source code `src/` nhằm rà soát các regex liên quan đến các cụm không dấu thông dụng.
- **Whitelist áp dụng:** Chỉ cho phép các raw file kỹ thuật (`permissions.ts`), file test nội bộ (`document-file-utils.test.ts`), và các filter logic nội bộ check giá trị `không có`/`khong co`.
- **Kết quả:** **PASS 100%**. Giao diện UI hoàn toàn sạch chữ không dấu.

## 4. Kết quả Build & Static Analysis
- Lệnh `npx eslint` trên module Materials: PASS (14 warnings không đáng kể liên quan đến biến chưa dùng do legacy code).
- Lệnh `npx tsc --noEmit`: PASS (Typecheck thành công toàn hệ thống).
- Lệnh `npm run build`: PASS (Tạo production bundle thành công trong 11s).

## 5. Kết luận
Tất cả UI user-facing hiện tại đã được chuẩn hóa sang tiếng Việt có dấu chuẩn. Mọi validation message phía server và toast alert hiển thị cho người dùng cũng được cập nhật. Trạng thái dự án: **GO**.
