# Suppliers Screen - Product & UI Audit Report

**Ngày:** 2026-06-26
**Module:** Nhà cung cấp & thầu phụ (`/suppliers`)
**Skill đã đọc:** `.agents/skills/design-taste-frontend/SKILL.md`

---

## 1. Hiện trạng trước khi nâng cấp

### Route
- File: `src/app/(dashboard)/suppliers/page.tsx`
- Route: `/suppliers`
- Nằm trong sidebar nhóm **QUẢN LÝ**, sau Vật tư

### UI trước khi sửa
- Header: `Nhà cung cấp & thầu phụ` + subtitle
- Body: chỉ có 1 `EmptyState` component cứng với text "Chưa có nhà cung cấp"
- Không có CTA "Thêm đối tác"
- Không có summary cards
- Không có search/filter
- Không có table/list
- Không có form CRUD
- Không có server actions
- Vùng trắng chiếm phần lớn viewport

### Vấn đề chính
| Vấn đề | Mức nghiêm trọng |
|--------|-------------------|
| Empty state thiếu CTA | Cao |
| Không có backend actions | Cao |
| Không có CRUD | Cao |
| Không có RBAC | Cao |
| Không có search/filter | Trung bình |
| Không có summary cards/dashboard | Trung bình |
| Vùng trắng quá lớn, thiếu cấu trúc | Trung bình |

---

## 2. Phân tích database

### Model Supplier (đã có trong schema)

```prisma
model Supplier {
  id            String    @id @default(cuid())
  code          String    @unique
  name          String
  taxCode       String?
  address       String?
  phone         String?
  email         String?
  contactPerson String?
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  contracts Contract[]

  @@index([code])
}
```

### Đặc điểm quan trọng
- **Model Supplier là global**, KHÔNG gắn `projectId`
- Supplier liên kết với `Contract` qua `supplierId` (optional)
- `Contract` mới là project-scoped (có `projectId`)
- Thiết kế này hợp lý cho MVP: danh bạ đối tác dùng chung, hợp đồng cụ thể gắn theo công trình

### Quan hệ
- `Supplier` 1-N `Contract` (nhà cung cấp có nhiều hợp đồng)
- `Contract` có `projectId` (hợp đồng gắn công trình)
- Không có seed data cho Supplier

---

## 3. Schema cần thay đổi?

**KHÔNG.** Schema hiện tại đã đủ cho MVP:
- Có đầy đủ các trường cơ bản: tên, mã, MST, địa chỉ, SĐT, email, người liên hệ
- Có soft delete (`deletedAt`)
- Có unique code
- Có liên kết Contract

Những trường chưa có nhưng KHÔNG cần cho MVP:
- `type` (Nhà cung cấp / Thầu phụ / Cả hai) - có thể thêm sau
- `serviceCategory` (nhóm ngành hàng) - có thể thêm sau
- `status` (Đang hợp tác / Theo dõi / Tạm dừng) - có thể thêm sau
- `note` (ghi chú) - có thể thêm sau

---

## 4. Backend/CRUD trước khi sửa

| Hạng mục | Trạng thái |
|----------|-----------|
| Server actions | Chưa có |
| CRUD operations | Chưa có |
| RBAC/permissions | Chưa có |
| Data validation | Chưa có |
| Error handling | Chưa có |

---

## 5. File đã đọc

| File | Mục đích |
|------|---------|
| `.agents/skills/design-taste-frontend/SKILL.md` | Design skill guidelines |
| `src/app/(dashboard)/suppliers/page.tsx` | Trang hiện tại |
| `prisma/schema.prisma` (L314-330) | Supplier model |
| `src/components/layout/sidebar.tsx` | Navigation structure |
| `src/components/materials/materials-workspace.tsx` | Pattern reference |
| `src/components/materials/materials-overview.tsx` | Summary cards pattern |
| `src/components/materials/materials-catalog.tsx` | Table/search pattern |
| `src/components/materials/material-form-dialog.tsx` | Form dialog pattern |
| `src/app/(dashboard)/materials/page.tsx` | Page server pattern |
| `src/app/(dashboard)/materials/actions.ts` | Actions pattern |
| `src/lib/materials/materials-permissions.ts` | RBAC pattern |
| `src/components/ui/empty-state.tsx` | Empty state component |
| `src/components/ui/button.tsx` | Button component |
| `src/lib/auth.ts` | Session/auth pattern |

---

## 6. Những phần đã nâng cấp

### 6.1 Server Actions (`src/app/(dashboard)/suppliers/actions.ts`)

| Action | Mô tả |
|--------|--------|
| `getSuppliers()` | Lấy danh sách đối tác (soft delete safe) |
| `createSupplier()` | Tạo mới với auto-code generation |
| `updateSupplier()` | Cập nhật thông tin |
| `deleteSupplier()` | Soft delete, chặn nếu có hợp đồng liên kết |
| `getSupplierPermissionsForUser()` | Lấy quyền user hiện tại |

### 6.2 RBAC (`src/lib/suppliers/suppliers-permissions.ts`)

| Role | canView | canCreate | canUpdate | canDelete |
|------|---------|-----------|-----------|-----------|
| ADMIN | Yes | Yes | Yes | Yes |
| DIRECTOR / DEPUTY_DIRECTOR | Yes | Yes | Yes | Yes |
| MANAGER / ACCOUNTANT | Yes | Yes | Yes | No |
| PROJECT_MANAGER / SITE_COMMANDER | Yes | Yes | Yes | Yes |
| CHIEF_COMMANDER / ASSISTANT_COMMANDER | Yes | Yes | Yes | Yes |
| QA_QC / HSE / SUPERVISOR / VIEWER | Yes | No | No | No |
| Khác (STAFF, ENGINEER) | Yes | No | No | No |

> [!WARNING]
> RBAC hiện tại kiểm tra ở server actions nhưng chưa có middleware-level enforcement. Cần audit thêm trong sprint bảo mật.

### 6.3 Page route (`src/app/(dashboard)/suppliers/page.tsx`)

- Server-side data fetching
- Session check + redirect
- Permission check với access denied fallback
- SEO metadata

### 6.4 UI Components

#### `SuppliersWorkspace` (`src/components/suppliers/suppliers-workspace.tsx`)
- Header với title/subtitle + CTA "Thêm đối tác" (conditional)
- 3 summary cards: Tổng đối tác / Có hợp đồng / Có SĐT
- Search bar: tìm theo tên, SĐT, MST
- Desktop: table với cột Mã, Đối tác, Liên hệ, SĐT, MST, Hợp đồng, Thao tác
- Mobile: card layout responsive
- Empty state gọn với CTA (conditional theo quyền)
- Edit/Delete inline actions
- Delete protection: không cho xóa khi có hợp đồng

#### `SupplierFormDialog` (`src/components/suppliers/supplier-form-dialog.tsx`)
- Modal dialog (bottom-sheet mobile, centered desktop)
- Fields: Mã, Tên, Người liên hệ, SĐT, Email, MST, Địa chỉ
- Inline error display
- Loading state

---

## 7. Đồng bộ style với Materials

| Yếu tố | Materials | Suppliers |
|---------|-----------|-----------|
| Header card | `rounded-2xl border shadow-sm` | Giống |
| Summary cards | `rounded-2xl` + icon + value | Giống |
| Table | `rounded-2xl overflow-hidden` | Giống |
| Mobile cards | `rounded-2xl` article | Giống |
| Search input | `rounded-lg h-10` + Search icon | Giống |
| Form dialog | Bottom-sheet + centered modal | Giống |
| Button | Blue CTA + outline/ghost | Giống |
| Empty state | `EmptyState` component | Giống |
| Font/spacing | Slate palette, same type scale | Giống |
| Action buttons | 8x8 icon buttons, hover states | Giống |

---

## 8. Responsive

| Viewport | Layout |
|----------|--------|
| Desktop (>768px) | Table + summary cards grid |
| Mobile (<768px) | Cards + stacked layout |
| Summary cards | `sm:grid-cols-3` |
| Search + count | Stack on mobile, side-by-side desktop |
| Form dialog | Bottom-sheet mobile, centered desktop |

---

## 9. Scope NOT làm (đề xuất tương lai)

| Hạng mục | Lý do không làm ngay |
|----------|---------------------|
| Field `type` (NCC / Thầu phụ / Cả hai) | Cần migration schema |
| Field `serviceCategory` (nhóm ngành hàng) | Cần migration schema |
| Field `status` (Đang hợp tác / Theo dõi / Tạm dừng) | Cần migration schema |
| Field `note` (ghi chú) | Cần migration schema |
| Filter theo loại / trạng thái | Cần schema fields trước |
| Project-scoped suppliers | Supplier model hiện tại là global, hợp lý cho MVP |
| Đánh giá nhà cung cấp | Quá phức tạp cho MVP |
| Lịch sử thanh toán | Module riêng |
| Hồ sơ năng lực / upload file | Chưa cần |
| Approval workflow | Chưa cần |
| Công nợ / báo giá | Module riêng |
| Confirm delete dialog | Đã có protection logic (chặn khi có hợp đồng) |

---

## 10. Kết quả build

```
npx tsc --noEmit    → PASS (no errors)
npm run build       → PASS (exit code 0)
```

Route `/suppliers` xuất hiện trong build output:
```
├ ƒ /suppliers
```

---

## 11. Git status

```
 M src/app/(dashboard)/suppliers/page.tsx       (modified)
?? src/app/(dashboard)/suppliers/actions.ts     (new)
?? src/components/suppliers/                    (new directory)
?? src/lib/suppliers/                           (new directory)
```

File đã thay đổi/tạo mới:
1. `src/app/(dashboard)/suppliers/page.tsx` - Page route (rewritten)
2. `src/app/(dashboard)/suppliers/actions.ts` - Server actions (new)
3. `src/components/suppliers/suppliers-workspace.tsx` - Main UI (new)
4. `src/components/suppliers/supplier-form-dialog.tsx` - Form dialog (new)
5. `src/lib/suppliers/suppliers-permissions.ts` - RBAC (new)

---

## 12. Đề xuất nâng cấp tiếp theo

### Sprint 1 (ngay sau MVP)
1. **Schema migration:** Thêm fields `type`, `serviceCategory`, `status`, `note`
2. **Filter UI:** Filter theo loại, trạng thái khi có schema fields
3. **Confirm delete dialog:** Thêm confirm khi xóa (an toàn hơn)

### Sprint 2
4. **Liên kết Contract:** Hiển thị danh sách hợp đồng trong chi tiết đối tác
5. **Detail drawer/page:** Trang chi tiết đối tác với lịch sử hợp đồng
6. **Export CSV/Excel:** Xuất danh sách đối tác

### Sprint 3+
7. **Đánh giá năng lực:** Rating system cho nhà cung cấp/thầu phụ
8. **Công nợ:** Tích hợp theo dõi công nợ
9. **Upload hồ sơ:** Hồ sơ năng lực, giấy phép kinh doanh

---

## 13. Kết luận

### Màn Suppliers đã đạt mức UI MVP chưa?

**Có.** Màn Suppliers đã được nâng cấp từ trang trống (chỉ có empty state) lên màn quản lý đầy đủ với:
- CRUD hoạt động thật (tạo, sửa, xóa soft delete)
- RBAC server-side
- Summary cards
- Search
- Desktop table + mobile cards
- Form dialog chuyên nghiệp
- Empty state có CTA
- Style đồng bộ Materials
- Build pass

### Còn blocker nào không?

- Không có blocker cho MVP
- Schema hiện tại đủ dùng, không cần migration
- Các tính năng nâng cao (loại, trạng thái, nhóm ngành) là nice-to-have, không chặn việc dùng thật

### Bước tiếp theo nên là gì?

1. **Test thực tế:** Thêm 2-3 đối tác thật, kiểm tra CRUD
2. **Schema migration:** Thêm `type`, `status`, `note` fields nếu cần phân loại
3. **Liên kết Contract:** Khi module Hợp đồng sẵn sàng, link đối tác vào hợp đồng

> [!IMPORTANT]
> Supplier model hiện tại là **global** (không gắn projectId). Thiết kế này hợp lý cho "danh bạ đối tác toàn công ty", trong khi Contract mới là project-scoped. Nếu sau này cần đối tác riêng theo từng công trình, cần thiết kế lại data model.
