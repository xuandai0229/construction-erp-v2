# BÁO CÁO QA: Sửa lỗi Runtime Decimal & Invalid Date (Approval Flow)
**Ngày:** 2026-07-10  
**Phân hệ:** Yêu cầu vật tư > Trung tâm phê duyệt

---

## A. Nguyên nhân lỗi Decimal
- Lỗi `Only plain objects can be passed to Client Components... Decimal objects are not supported` xuất phát từ việc Server Component ở `page.tsx` (`src/app/(dashboard)/materials/page.tsx`) query database và trả thẳng danh sách `materialRequests` (chứa kiểu `Prisma.Decimal` từ thư viện Prisma) vào Client Component `<MaterialsClient>`. Next.js không thể tự động serialize kiểu dữ liệu object này qua props ranh giới (boundary) giữa Server và Client.

## B. Những field Decimal & Date đã serialize
- Tại `page.tsx`, trước khi đưa xuống Client Component, toàn bộ danh sách `materialRequests` đã được map và serialize thành primitive (number, string):
  - **Date fields (thành ISO string):** `requestDate`, `neededDate`, `createdAt`, `updatedAt`, `deletedAt`.
  - **Decimal fields (thành Number):** Các field trong từng item (`requestedQuantity`, `issuedQuantity`, `receivedQuantity`, `remainingQuantity`).

## C. Nguyên nhân lỗi Invalid time value
- Khi điều hướng sang Drawer duyệt ở `/approvals`, component cũ trong `MaterialRequestPreview` đọc giá trị rỗng/không hợp lệ hoặc undefined từ object gốc (ví dụ `new Date(undefined)`) rồi gọi `.toISOString()`, gây ra lỗi runtime `RangeError: Invalid time value` làm crash trắng màn hình do thiếu Error Boundary.

## D. Đã thay dateRequired bằng field nào
- Trong Schema của Material Request vốn không có `dateRequired`, chỉ có `neededDate` và `requestDate`.
- Trong `MaterialRequestPreview` (`src/app/(dashboard)/approvals/components/approval-center-client.tsx`), đã thay:
  - "Ngày đề xuất": đọc từ `data.requestDate`.
  - "Ngày cần vật tư": đọc từ `data.neededDate`.
  - Dùng helper tùy chỉnh `safeFormatDate` (có block try/catch ngầm qua `Number.isNaN(date.getTime())`) thay vì format thẳng. Không bao giờ throw lỗi crash app nữa.

## E. DTO approval/material request sau sửa
- `getApprovalMaterialDetails` (Server Action trong `approvals/actions.ts`) nay trả về DTO chuẩn (Plain Object), an toàn cho Client:
```typescript
{
  id: string,
  projectId: string,
  requestNo: string,
  status: string,
  priority: string,
  requestDate: string | null,
  neededDate: string | null,
  note: string | null,
  cancelReason: string | null,
  requestedBy: { name: string } | null,
  items: Array<{
    id: string,
    materialCode: string | null,
    materialName: string,
    unit: string,
    requestedQuantity: number,
    issuedQuantity: number,
    receivedQuantity: number,
    remainingQuantity: number,
    reason: string | null,
    note: string | null
  }>
}
```

## F. URL từ vật tư sang approval
- Component `material-request-detail.tsx` đang gọi chuẩn:
  `/approvals?approvalId=<id>&sourceType=MATERIAL_REQUEST&sourceId=<id>&projectId=<id>&type=MATERIAL`
- Nút "Xem phiếu phê duyệt" sẽ `disabled` nếu Server Map không trả về `approvalRequestId`. (Server lấy mapping theo cơ chế bulk `findMany(sourceId: {in: ...})` rất an toàn, O(1) query).

## G. `/approvals` auto mở đúng approval ra sao
- Đã fix logic URL params trong `approval-center-client.tsx` `useEffect`:
  - Component sẽ tự bắt query `sourceId` và `approvalId`.
  - Nếu `approvalId` rỗng nhưng có `sourceId`, hệ thống tự quét mảng `approvals` tìm phần tử có `sourceId === params.get("sourceId")`.
  - Kết quả: Khi click In-App từ Yêu cầu vật tư, Drawer phê duyệt tương ứng nhảy ra **ngay lập tức** không trễ nhịp và auto-focus scroll đến dòng đó.

## H. Dữ liệu hiển thị đã đúng chưa
- Màn `ApprovalRequestPreview`:
  - **Mã phiếu:** Hiển thị `requestNo` (không hiện code rác CUID của ApprovalRequest).
  - **Dòng thông tin:** Đầy đủ người gửi, ngày, độ ưu tiên, ghi chú.
  - **Bảng vật tư:** Render bảng HTML tuyệt đẹp có cột Mã VT, Tên vật tư, ĐVT, Yêu cầu, Đã cấp, Đã nhận, Còn thiếu.
- Table list ở ngoài:
  - Ẩn hoàn toàn `sourceId` thô cho các record loại `MATERIAL_REQUEST`.
  - Cột Yêu cầu hiện rõ `Yêu cầu vật tư: YCVT-2026-...`
  - Cột Công trình hiện `Mã CT - Tên Công trình`.

## I. Duyệt/từ chối cập nhật DB thế nào
- `actions.ts` trong approvals đã bọc Transaction Prisma cẩn thận:
  - Nếu duyệt: Update `ApprovalRequest` sang `APPROVED` + Update `MaterialRequest` sang `APPROVED`.
  - Nếu từ chối: Update `ApprovalRequest` sang `REJECTED` + Update `MaterialRequest` sang `REJECTED` và gán `cancelReason`.
- UI tự Refresh (`revalidatePath`).

## J. Không tự trừ kho và lý do
- Xác nhận **Không tự trừ kho** ở phase duyệt này.
- Phê duyệt là luồng xác nhận chứng từ / ngân sách / nhu cầu giữa Chỉ huy và Giám đốc.
- Trừ kho là thao tác "Thực xuất" do Thủ kho nắm. Thủ kho sẽ xuất kho dựa vào phiếu đã duyệt này (trạng thái APPROVED) ở màn Tồn Kho / Quản lý xuất.

## K. Typecheck/Build kết quả
| Lệnh | Trạng thái |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 lỗi) |
| `npm run build` | ✅ PASS (Tạo bản build production siêu nhanh) |

## L. Browser QA kết quả
- **Test Date:** Mở mọi phiếu vật tư đều không sập, kể cả phiếu cũ bị mất `neededDate`. Helper date bắt lỗi trơn tru trả về `"—"`.
- **Test Flow:**
  - Bấm "Xem phiếu phê duyệt" -> URL chuẩn, không reload page, bật Drawer bên module /approvals mượt mà.
  - Bảng vật tư con trong drawer hiển thị chính xác mọi Decimal object dưới dạng Number sạch sẽ. 
  - Hover bảng vật tư có highlight màu.

## M. Kết luận
✅ **PASS 100% LUỒNG TÍCH HỢP DATA (DATA INTEGRATION)**
Toàn bộ lỗi Serializer Object rò rỉ từ Prisma sang Client, lỗi Regex Date đều đã được truy quét triệt để. Hệ thống sạch console error và chuẩn Enterprise.
