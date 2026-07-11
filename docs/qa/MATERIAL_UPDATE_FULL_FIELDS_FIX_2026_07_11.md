# BÁO CÁO FIX LỖI CẬP NHẬT VẬT TƯ (UPDATE FULL FIELDS)

**Tên file:** `MATERIAL_UPDATE_FULL_FIELDS_FIX_2026_07_11.md`
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Nguyên nhân gây lỗi (Root Cause)
Lỗi "chỉ cập nhật được Ghi chú, các trường khác giữ nguyên" xảy ra do 2 nguyên nhân song song:
1. **Tại Client Component (`materials-workspace.tsx`):**
   Hàm `handleCreateMaterial` (phụ trách cả thêm mới và cập nhật) khi gọi hàm update đã hardcode bỏ qua các tham số quan trọng: `code` và `minStockLevel`. Nó chỉ gửi đi `{ name, unit, group, description }`. 
2. **Tại Server Action (`actions.ts` - `updateMaterialItem`):**
   Hàm `updateMaterialItem` cũng thiếu định nghĩa cho `code` và `minStockLevel` trong signature. Nó hoàn toàn không map dữ liệu vào `MaterialItem.code`, và càng không đụng đến bảng `ProjectMaterialStock` để update `minStockLevel`. 

Đó là lý do dù người dùng có điền đúng trên form, dữ liệu được truyền về server bị mất hoặc bị server phớt lờ. (Các trường `name`, `unit`, `group` có được gửi đi nhưng vì không có phản hồi trực quan trên mã/cảnh báo nên người dùng lầm tưởng là không lưu).

## 2. Giải pháp khắc phục (Fixes)

### 2.1 Mở rộng Server Action (`updateMaterialItem`)
Tôi đã refactor hàm `updateMaterialItem`:
- Thêm `code` và `minStockLevel` vào signature.
- Wrap toàn bộ quá trình cập nhật vào trong một **Prisma Transaction**.
- **Cập nhật `MaterialItem`**: Cập nhật tên, mã, đơn vị, nhóm, ghi chú. Đặc biệt, nếu có cập nhật mã (`code`), hệ thống sẽ check trùng lặp (Unique constraint) trong phạm vi Project để ném ra lỗi nếu mã đã tồn tại.
- **Cập nhật `ProjectMaterialStock`**: Sử dụng hàm `upsert` an toàn để update `minStockLevel` (ngưỡng cảnh báo). Nếu chưa có bản ghi (trường hợp cực hiếm do data hỏng), nó sẽ tạo mới với stock = 0 và minStockLevel = giá trị mới.

### 2.2 Sửa lỗi tại Client State
- Cập nhật lại UI Handler trong `materials-workspace.tsx` để truyền đủ object có chứa `code` và `minStockLevel` xuống server.
- **Về vấn đề "Stale State" của Drawer**: Vì Next.js Server Actions sử dụng `revalidatePath` ở cuối hành động, ngay khi `updateMaterialItem` thành công, Next.js tự động invalid cache và fetch bản mới từ server. Do React Component `MaterialsCatalog` nhận prop trực tiếp từ Server, component sẽ re-render lập tức và truyền object mới nhất vào `MaterialDetailDrawer`. Không cần phải mutate state thủ công ở client. Drawer mở ra sẽ thấy ngay dữ liệu mới!

### 2.3 Quản lý chữ hoa Tiếng Việt
- Code logic trong file `actions.ts` sử dụng hàm `normalizeText()` – hàm này chỉ dùng lệnh `.trim()` để loại bỏ khoảng trắng thừa, hoàn toàn **không can thiệp** `.toLowerCase()` hay thay đổi chữ hoa tiếng Việt của tên vật tư. Do đó chuỗi `"Ống nhựa Tiền Phong"` được giữ nguyên trạng và lưu thành công.

## 3. Kết quả QA Testing (Test Cases)
- Đã tạo QA Script tự động: `scripts/qa-material-update-full-fields.ts`.
- Script đã chạy qua kịch bản:
  - Tạo `"C-10"` với tồn kho = `111` và ngưỡng cảnh báo = `2340`.
  - Cập nhật toàn bộ field thành `"C-104"`, tên mới, nhóm mới, ghi chú mới, ngưỡng cảnh báo `660`.
  - Kết quả Database trả về đúng mọi field. Đặc biệt: lượng tồn thực tế **vẫn là 111**, không hề bị ghi đè hay thay đổi khi người dùng chỉnh sửa thông tin. Transaction bảo toàn History snapshot và Stock trọn vẹn.

## 4. Kiểm định Build & Runtime
Tất cả các lệnh bắt buộc đều vượt qua với Exit Code 0:
- `npx prisma validate`: **PASS**
- `npx tsc --noEmit`: **PASS** (Không có lỗi TS rò rỉ kiểu Decimal hay Date)
- `npx tsx scripts/qa-material-update-full-fields.ts`: **PASS**
- `npm run build`: **PASS**

## 5. Kết luận
Luồng cập nhật vật tư đã được sửa triệt để, hoạt động ổn định trên cả Client Form, Server Actions và Database Ledger. Các thông số liên đới (stock, history) được bảo toàn trong transaction.

=> **Kết luận: GO** (Sẵn sàng đưa tính năng này ra khỏi chế độ bảo trì).
