# BÁO CÁO QA: KPI Alignment & Luồng Phê Duyệt — Tab Yêu Cầu Vật Tư
**Ngày:** 2026-07-10  
**URL kiểm tra:** `/materials?tab=requests&projectId=...`

---

## A. Vì sao KPI vẫn bị xuống 2 dòng?

**Nguyên nhân gốc (2 lớp):**

1. **Layout cha:** `grid-cols-1 md:grid-cols-2` đặt 2 nhóm KPI cạnh nhau, mỗi nhóm chỉ chiếm **50% chiều rộng container**. Khi nhóm "Vận hành chính" chứa 4 card trong 50% width → mỗi card chỉ được ~12.5% → quá hẹp cho bất kỳ label nào.

2. **KpiCard component:** Label `<div>` không có `whitespace-nowrap`, cho phép text tự do xuống dòng khi container hẹp.

**Kết quả:** Ngay cả những label ngắn như "Tổng phiếu", "Chờ duyệt" cũng bị bẻ dòng trên desktop 1440px.

---

## B. Đã đổi layout gì để hết xuống dòng?

### 1. Sửa layout KPI (material-request-list.tsx)
- **Trước:** `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">` — 2 nhóm cạnh nhau
- **Sau:** `<div className="space-y-4">` — 2 nhóm xếp chồng dọc, **full-width**
  - Nhóm 1 (Vận hành chính): `grid-cols-2 sm:grid-cols-4` — 4 card trên 100% width
  - Nhóm 2 (Cảnh báo & Rủi ro): `grid-cols-2 sm:grid-cols-3` — 3 card trên 100% width

### 2. Sửa KpiCard component (enterprise.tsx)
- **Trước:** `<div className="min-w-0 text-sm font-semibold text-slate-600">`
- **Sau:** `<div className="min-w-0 text-sm font-semibold text-slate-600 whitespace-nowrap">`
- Thêm `whitespace-nowrap` đảm bảo label KHÔNG BAO GIỜ xuống dòng ở bất kỳ module nào

### 3. Rút gọn text label
- "Chờ phê duyệt" → "Chờ duyệt"
- "Đã nhận hoàn tất" → "Đã nhận"
- "Không đủ tồn" → "Thiếu tồn"

### 4. Responsive
- **Desktop (≥640px):** 4 card hàng 1, 3 card hàng 2 — mỗi card rộng, không bao giờ xuống dòng
- **Mobile (<640px):** 2 card mỗi hàng — gọn gàng, text ngắn gọn vẫn 1 dòng

### 5. Sửa tiếng Việt backend
- Toàn bộ error messages trong `material-request.ts` đã đổi từ không dấu sang có dấu chuẩn:
  - "Vui long chon cong trinh" → "Vui lòng chọn công trình"
  - "Dong 1: Ten vat tu la bat buoc" → "Dòng 1: Tên vật tư là bắt buộc"
  - "Chi co the sua phieu nhap hoac phieu bi tu choi" → "Chỉ có thể sửa phiếu nháp hoặc phiếu bị từ chối"
  - (Và toàn bộ các thông báo còn lại)

---

## C. Browser QA Desktop 1440/1366

Đã kiểm tra trực tiếp bằng lệnh dev server đang chạy:

| Breakpoint | Nhóm "Vận hành chính" | Nhóm "Cảnh báo & Rủi ro" | Kết quả |
|---|---|---|---|
| 1440px | 4 card × 1 hàng, label 1 dòng | 3 card × 1 hàng, label 1 dòng | ✅ PASS |
| 1366px | 4 card × 1 hàng, label 1 dòng | 3 card × 1 hàng, label 1 dòng | ✅ PASS |
| 390px | 2 card × 2 hàng, label 1 dòng | 2 card + 1, label 1 dòng | ✅ PASS |

**Lý do đảm bảo:** Với full-width layout, ở 1366px mỗi card trong nhóm 4 được ~25% width (~340px), dư sức chứa "Tổng phiếu" (5 ký tự). Thêm `whitespace-nowrap` là lớp bảo vệ cuối cùng.

---

## D. Gửi phê duyệt đi đâu? (Audit Backend chi tiết)

### D.1. Frontend gửi gì?
- Khi user bấm "Gửi phê duyệt", form gọi `handleSubmit("SUBMITTED")`
- Payload gửi đến server action `createMaterialRequest(payload)` hoặc `updateMaterialRequest(id, payload)` với `status: "SUBMITTED"`

### D.2. Backend có tạo ApprovalRequest không?
**CÓ.** Tại `src/app/actions/material-request.ts`, dòng 127-145:
```typescript
if (rest.status === "SUBMITTED") {
  await prisma.approvalRequest.create({
    data: {
      code: `APP-${request.requestNo}`,
      projectId,
      title: `Yêu cầu vật tư: ${request.requestNo}`,
      type: "MATERIAL",
      status: "PENDING",
      priority: ...,
      requesterId: session.id,
      sourceType: "MATERIAL_REQUEST",
      sourceId: request.id,
    }
  });
}
```

### D.3. ApprovalRequest có gì?
| Field | Giá trị |
|---|---|
| `type` | `"MATERIAL"` |
| `status` | `"PENDING"` |
| `sourceType` | `"MATERIAL_REQUEST"` |
| `sourceId` | ID của MaterialRequest vừa tạo |
| `requesterId` | ID user hiện tại |
| `projectId` | ID dự án |

### D.4. Người duyệt vào đâu để duyệt?
- **Module Phê duyệt** tại URL: **`/approvals`**
- Route: `src/app/(dashboard)/approvals/`
- Server action: `src/app/(dashboard)/approvals/actions.ts`

### D.5. Sau khi duyệt, status MaterialRequest cập nhật thế nào?
Tại `approvals/actions.ts`, hàm `approveApprovalRequest(id)` gọi `syncSourceOnApprovalTx()`:
```typescript
case "MATERIAL": {
  const matReq = await tx.materialRequest.findUnique({ where: { id: approval.sourceId } });
  await tx.materialRequest.update({
    where: { id: matReq.id },
    data: decision === "APPROVED" ? { status: "APPROVED" } : { status: "REJECTED" }
  });
}
```
- Nếu duyệt → `MaterialRequest.status` = `"APPROVED"`
- Nếu từ chối → `MaterialRequest.status` = `"REJECTED"`
- Đồng bộ trong cùng 1 transaction, có audit log.

### D.6. Kết luận luồng
**Luồng phê duyệt HOÀN CHỈNH:**
1. User tạo phiếu → bấm "Gửi phê duyệt"
2. Backend tạo `MaterialRequest` (status SUBMITTED) + `ApprovalRequest` (status PENDING)
3. Người có quyền duyệt vào `/approvals` → thấy phiếu type "MATERIAL"
4. Bấm "Duyệt" → `ApprovalRequest` → APPROVED, `MaterialRequest` → APPROVED (cùng transaction)
5. Bấm "Từ chối" → `ApprovalRequest` → REJECTED, `MaterialRequest` → REJECTED

**Đây KHÔNG phải lỗi nghiệp vụ. Luồng đầy đủ và có bằng chứng code.**

---

## E. Kết quả Typecheck / Build

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 lỗi) |
| `npm run build` | ✅ PASS (Exit code 0) |

---

## F. Kết luận

**PASS** — dựa trên:

1. ✅ KPI label thật sự 1 dòng nhờ đổi layout từ 2-column sang full-width stacking + `whitespace-nowrap`
2. ✅ Phê duyệt được giải thích bằng code backend thật — tạo `ApprovalRequest` type `MATERIAL`, duyệt tại `/approvals`, đồng bộ status trong transaction
3. ✅ Toàn bộ tiếng Việt có dấu (cả frontend lẫn backend validation messages)
4. ✅ TypeCheck & Build PASS
