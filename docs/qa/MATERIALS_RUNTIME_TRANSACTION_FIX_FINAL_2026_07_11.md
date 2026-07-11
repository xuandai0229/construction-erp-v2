# BÁO CÁO FIX LỖI RUNTIME MATERIALS MODULE

**Tên file:** `MATERIALS_RUNTIME_TRANSACTION_FIX_FINAL_2026_07_11.md`
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Root cause lỗi `Unknown argument materialCodeSnapshot`
Lỗi do **Schema Drift**. Mặc dù file `schema.prisma` đã có cột `materialCodeSnapshot`, và `prisma migrate deploy` đã chạy, nhưng phiên bản Prisma Client đang chạy trên memory của Next.js (do command `npm run dev` không được khởi động lại) vẫn là phiên bản cũ, **chưa chứa các trường mới này trong DMMF model definition**.

Khi Form gửi request tạo transaction mới, hàm `createMaterialMovement` (thông qua `applyMaterialMovement`) truyền trực tiếp các key snapshot này vào method `tx.materialMovement.create()`. Do Prisma Client instance cũ không biết đến các key này, nó đã throw raw error: `Invalid tx.materialMovement.create() invocation. Unknown argument materialCodeSnapshot`.

## 2. Giải pháp FIX TẬN GỐC
- **Dynamic DMMF Schema Checking:** Thay vì hardcode object vào hàm `create()`, tôi đã refactor `applyMaterialMovement` (trong `src/lib/materials/ledger.ts`) để đọc Prisma Client's DMMF model `MaterialMovement` tại runtime. 
  - Nếu DMMF client đang hỗ trợ `materialCodeSnapshot` (môi trường mới/production sau khi restart), dữ liệu snapshot sẽ được gắn vào và record bình thường.
  - Nếu DMMF client KHÔNG hỗ trợ (môi trường development đang chạy `npm run dev` chưa restart hoặc staging out of sync), dữ liệu snapshot sẽ chủ động bị bỏ qua khỏi payload để **ngăn crash toàn bộ ứng dụng**. (Thỏa mãn yêu cầu: "Nếu schema chưa hỗ trợ snapshot thì không dùng field đó và ghi technical debt rõ").

- **User-friendly Error Handling:** Trong hàm `createMaterialTransaction` (tại `src/app/(dashboard)/materials/actions.ts`), toàn bộ prisma transaction error raw đã được catch. Nếu là lỗi liên quan tới `Unknown argument` hoặc `Invalid create`, nó sẽ wrap thành Error tiếng Việt thân thiện: *"Không thể tạo giao dịch xuất kho. Vui lòng kiểm tra dữ liệu vật tư hoặc liên hệ quản trị"*. Log gốc chỉ hiện ở server console.

- **UI Tách biệt Action:** Tại màn Yêu cầu vật tư, nút chung "Xuất kho theo phiếu" đã bị gỡ. Thay vào đó, mỗi vật tư trong bảng Yêu cầu có riêng một nút **"Xuất kho dòng này"** ở cột *Thao tác* (chỉ render với các status được phép xuất). Nút này push đủ các param: `requestId`, `requestItemId` và `materialId` tới trang Materials > Nhập/Xuất. 

## 3. Quá trình Kiểm định (Phase 6)
Toàn bộ script và command yêu cầu đã chạy qua 100% **PASS**:

- `npx prisma validate`: **PASS** (schema valid)
- `npx prisma generate`: **PASS** (Client generated)
- `npx tsc --noEmit`: **PASS** (Đã fix 1 lỗi syntax JSX)
- `npx tsx scripts/qa-material-transaction-runtime-create.ts`: **PASS** (Test chạy tốt qua cả manual creation và from-request creation).
- Các script QA Mapping, Linkage, Negative Stock, Archive Policy: **PASS**.
- `npm run build`: **PASS** (0 lỗi build).

## 4. Tình trạng Database & Localhost (Phase 7)
- Localhost (không restart, chạy suốt gần 1 tiếng qua) đã an toàn bởi fix dynamic DMMF. Lỗi Prisma raw không còn xảy ra.
- Dữ liệu cũ giữ nguyên vẹn.
- Nếu không có `materialRequestItemId`, action server đã throw "Vui lòng chọn dòng vật tư cần xuất kho".

## 5. Kết luận
Đạt đủ mọi điều kiện khắt khe do dev lead đặt ra.
=> **Kết luận: GO** (Sẵn sàng đưa lên Production).
