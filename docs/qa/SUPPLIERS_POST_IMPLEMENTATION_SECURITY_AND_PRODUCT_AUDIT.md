# Suppliers - Post Implementation Security & Product Audit

**Ngày:** 2026-06-26
**Module:** Nhà cung cấp & thầu phụ (`/suppliers`)
**Skill đã đọc:** `.agents/skills/design-taste-frontend/SKILL.md`

---

## 1. Product Scope: Global vs Project-Scoped

### Kết luận: Supplier là GLOBAL

| Thuộc tính | Giá trị |
|------------|---------|
| Có `projectId` trong model? | Không |
| Dữ liệu lọc theo project? | Không |
| Tất cả user cùng thấy 1 danh sách? | Có (nếu có `canView`) |
| Liên kết Contract? | Có (`Contract.supplierId`) |
| Contract project-scoped? | Có (`Contract.projectId`) |

### Thiết kế hiện tại hợp lý cho MVP

Supplier là "danh bạ đối tác toàn công ty". Hợp đồng (`Contract`) mới gắn theo công trình. Một đối tác có thể có nhiều hợp đồng ở nhiều công trình khác nhau.

### Text UI đã sửa để phản ánh đúng

| Vị trí | Trước | Sau |
|--------|-------|-----|
| Page metadata description | "Quản lý đối tác cung ứng và đơn vị thi công" | "Quản lý danh bạ đối tác cung ứng và đơn vị thi công" |
| Header subtitle | "Quản lý đối tác cung ứng và đơn vị thi công." | "Quản lý danh bạ đối tác cung ứng và đơn vị thi công." |
| Empty state description | "Thêm nhà cung cấp hoặc thầu phụ để quản lý **theo công trình**." | "Thêm nhà cung cấp hoặc thầu phụ để quản lý **danh bạ dùng chung**." |

> [!IMPORTANT]
> Text "theo công trình" / "theo dự án" không xuất hiện ở bất kỳ đâu trong Suppliers UI hiện tại. Đã sửa empty state, nơi duy nhất còn sót.

### Đề xuất project-scoped (chỉ đề xuất, KHÔNG làm)

Nếu sau này cần supplier riêng theo từng công trình:
1. Thêm `projectId` vào model `Supplier`
2. Tạo unique constraint `@@unique([projectId, code])`
3. Thêm project selector UI (giống Materials)
4. Sửa tất cả queries thêm `where: { projectId }`
5. Sửa RBAC để check project membership

---

## 2. RBAC Matrix hiện tại

### Ma trận quyền (server-side enforced)

| System Role | canView | canCreate | canUpdate | canDelete |
|-------------|---------|-----------|-----------|-----------|
| ADMIN | Yes | Yes | Yes | Yes |
| DIRECTOR | Yes | Yes | Yes | Yes |
| DEPUTY_DIRECTOR | Yes | Yes | Yes | Yes |
| CHIEF_COMMANDER | Yes | No | No | No |
| MANAGER | Yes | Yes | Yes | No |
| ENGINEER | Yes | No | No | No |
| ACCOUNTANT | Yes | Yes | Yes | No |
| STAFF | Yes | No | No | No |

> [!NOTE]
> Supplier là global, nên RBAC chỉ dùng `UserRole` (system role). `ProjectRole` parameter tồn tại trong `getSupplierPermissions()` nhưng không được sử dụng trong flow hiện tại. Giữ lại cho tương lai nếu cần project-scoped suppliers.

### Kiểm tra RBAC enforcement trong server actions

| Action | Check session? | Check permission? | Kết quả |
|--------|---------------|-------------------|---------|
| `getSuppliers()` | Yes (L123) | Yes - `canView` (L127) | An toàn |
| `createSupplier()` | Yes - `requireSession()` (L152) | Yes - `canCreate` (L154) | An toàn |
| `updateSupplier()` | Yes - `requireSession()` (L196) | Yes - `canUpdate` (L198) | An toàn |
| `deleteSupplier()` | Yes - `requireSession()` (L229) | Yes - `canDelete` (L231) | An toàn |
| `getSupplierPermissionsForUser()` | Yes (L114) | N/A (returns permissions) | An toàn |

### Đánh giá STAFF / ENGINEER canView

**Quyết định: Giữ `canView: true` cho tất cả user đăng nhập.**

Lý do:
- Danh bạ nhà cung cấp không phải dữ liệu nhạy cảm (tên, SĐT, MST là thông tin công khai)
- Nhân viên công trường cần biết NCC nào đang hợp tác để liên hệ
- STAFF/ENGINEER chỉ xem, không thể sửa/xóa/tạo

> [!WARNING]
> Nếu danh bạ chứa thông tin nhạy cảm (giá bán, điều khoản, đánh giá nội bộ) trong tương lai, cần xem xét lại `canView` cho STAFF/ENGINEER.

### Sidebar visibility

`/suppliers` bị ẩn với `CHIEF_COMMANDER` system role (sidebar.tsx L67). Đây là pattern hiện tại của sidebar, không phải bug RBAC. CHIEF_COMMANDER vẫn có `canView: true` nếu truy cập trực tiếp URL, nhưng UI sidebar không hiện.

---

## 3. CRUD & Soft Delete Audit

### Validation

| Field | Validate? | Chi tiết |
|-------|-----------|----------|
| name | Yes | Bắt buộc, trim whitespace, chặn rỗng |
| code | Auto-gen | Nếu không nhập, tự sinh `NCC-{slug}`. Nếu nhập, check unique |
| email | No | Chỉ normalize, không validate format |
| phone | No | Chỉ normalize |
| taxCode | No | Chỉ normalize |
| address | No | Chỉ normalize |
| contactPerson | No | Chỉ normalize |

> [!NOTE]
> Email/phone/taxCode không validate format. Chấp nhận cho MVP vì dữ liệu nhập thủ công từ người dùng quen thuộc. Nên thêm validate cơ bản trong sprint tiếp.

### Auto-code generation

- Pattern: `NCC-{TEN-DOI-TAC}`
- Tránh trùng: loop 100 lần thử `NCC-X`, `NCC-X-02`, `NCC-X-03`...
- Fallback: `NCC-X-{timestamp}`
- **Đã test và pass.**

### Soft delete

| Kiểm tra | Kết quả |
|----------|---------|
| Delete set `deletedAt` | Pass |
| `getSuppliers()` filter `deletedAt: null` | Pass |
| Supplier đã xóa không xuất hiện trong list | Pass |
| Supplier đã xóa vẫn trong DB | Pass |
| Soft delete không xóa contracts liên kết | N/A (chặn trước khi xóa) |

### Contract protection

| Kiểm tra | Kết quả |
|----------|---------|
| Supplier có contract -> chặn xóa | Pass |
| Error message tiếng Việt | Pass ("Không thể xóa đối tác đang có hợp đồng liên kết.") |
| UI disable nút xóa khi `contractCount > 0` | Pass |
| UI tooltip giải thích lý do | Pass ("Không thể xóa khi có hợp đồng") |

### Error messages

Tất cả error messages bằng tiếng Việt, không lộ enum/stack trace:
- "Tên đối tác là bắt buộc"
- "Mã đối tác đã tồn tại"
- "Đối tác không tồn tại"
- "Bạn không có quyền thực hiện thao tác này."
- "Bạn cần đăng nhập để thao tác"
- "Không thể xóa đối tác đang có hợp đồng liên kết."

---

## 4. QA Script

### File: `scripts/qa-suppliers-crud-rbac.ts`

### Kịch bản test

| # | Kịch bản | Kết quả |
|---|----------|---------|
| 1 | ADMIN permissions matrix | PASS |
| 2 | STAFF chỉ xem | PASS |
| 3 | ENGINEER chỉ xem | PASS |
| 4 | MANAGER tạo/sửa nhưng không xóa | PASS |
| 5 | DIRECTOR toàn quyền | PASS |
| 6 | Admin tạo supplier | PASS |
| 7 | Supplier xuất hiện trong list | PASS |
| 8 | Admin sửa supplier | PASS |
| 9 | Dữ liệu cập nhật khớp | PASS |
| 10 | Tạo supplier auto-code | PASS |
| 11 | Admin xóa supplier soft delete | PASS |
| 12 | Supplier xóa không còn trong list | PASS |
| 13 | Soft delete đúng (deletedAt set) | PASS |
| 14 | STAFF bị chặn tạo | PASS |
| 15 | Supplier có hợp đồng chặn xóa | PASS |
| 16 | Tên rỗng bị chặn | PASS |
| 17 | Tên khoảng trắng bị chặn | PASS |
| 18 | Mã trùng bị chặn | PASS |
| 19 | User chưa đăng nhập bị chặn tạo | PASS |
| 20 | User chưa đăng nhập getSuppliers() rỗng | PASS |

**Kết quả: 20 PASS / 0 FAIL**

### Cleanup

- Dữ liệu test dùng prefix `QA-SUPPLIER-{timestamp}`
- Auto cleanup cuối script: xóa suppliers + users test
- Không tạo dữ liệu lâu dài trong production

---

## 5. UI/UX Audit

### Text accuracy (sau khi sửa)

| Element | Text | Phản ánh đúng global? |
|---------|------|-----------------------|
| Title | "Nhà cung cấp & thầu phụ" | Yes |
| Subtitle | "Quản lý danh bạ đối tác cung ứng và đơn vị thi công." | Yes |
| Empty title | "Chưa có đối tác" | Yes |
| Empty desc | "Thêm nhà cung cấp hoặc thầu phụ để quản lý danh bạ dùng chung." | Yes |
| CTA | "Thêm đối tác" | Yes |

### UI elements audit

| Kiểm tra | Kết quả |
|----------|---------|
| Không filter Loại (schema chưa có type field) | Pass - không hiển thị |
| Không filter Trạng thái (schema chưa có status field) | Pass - không hiển thị |
| Không hiện "NCC / Thầu phụ / Cả hai" badge | Pass - không fake data |
| Summary cards phản ánh dữ liệu thật | Pass (count từ DB) |
| Search placeholder đúng fields | Pass ("Tìm tên, SĐT, MST...") |
| User chỉ xem không thấy Sửa/Xóa/Thêm | Pass (`hasActions` check) |
| Không text tiếng Anh enum | Pass |
| Mobile card layout | Pass (grid-cols-2) |
| Desktop table | Pass (7 cột + responsive) |
| Action button count | Pass (2: Sửa + Xóa, hợp lý) |

### Không fake field chưa có trong schema

Schema hiện tại không có:
- `type` (NCC / Thầu phụ) -> UI không hiện
- `status` (Đang hợp tác) -> UI không hiện
- `serviceCategory` (nhóm ngành hàng) -> UI không hiện
- `note` (ghi chú) -> UI không hiện

UI chỉ hiển thị đúng fields có trong schema: name, code, phone, email, taxCode, address, contactPerson, contractCount.

---

## 6. Build & Git

### Build

```
npx tsc --noEmit    -> PASS (0 errors)
npm run build       -> PASS (exit code 0)
```

### Git status

```
 M src/app/(dashboard)/suppliers/page.tsx        (text fixes)
 M src/components/suppliers/suppliers-workspace.tsx (text fixes)
?? scripts/qa-suppliers-crud-rbac.ts             (new)
```

### Git diff (trong vòng audit này)

```
 src/app/(dashboard)/suppliers/page.tsx           | 2 +-   (metadata desc)
 src/components/suppliers/suppliers-workspace.tsx  | 4 ++-- (subtitle + empty state)
```

---

## 7. Những gì đã sửa trong vòng audit này

| File | Thay đổi |
|------|---------|
| `src/components/suppliers/suppliers-workspace.tsx` | Sửa subtitle thêm "danh bạ", sửa empty state từ "theo công trình" thành "danh bạ dùng chung" |
| `src/app/(dashboard)/suppliers/page.tsx` | Sửa metadata description thêm "danh bạ" |
| `scripts/qa-suppliers-crud-rbac.ts` | Tạo mới - 20 test cases |

---

## 8. Những gì chỉ đề xuất, chưa làm

| Đề xuất | Lý do chưa làm |
|---------|----------------|
| Thêm `type` field (NCC/Thầu phụ) | Cần schema migration |
| Thêm `status` field | Cần schema migration |
| Thêm `serviceCategory` field | Cần schema migration |
| Thêm `note` field | Cần schema migration |
| Validate email/phone format | Chấp nhận MVP, dự kiến sprint tiếp |
| Confirm delete dialog | Đã có protection logic, chấp nhận MVP |
| Project-scoped suppliers | Cần thiết kế lại data model |
| Chặn canView cho STAFF | Không cần thiết cho danh bạ công khai |
| AuditLog cho supplier CRUD | Chưa có pattern audit log cho module khác |

---

## 9. Kết luận

### Suppliers MVP có thể test thủ công chưa?

**Có.** Module hoàn chỉnh cho MVP:
- CRUD server actions hoạt động đúng (20/20 test pass)
- RBAC enforced ở backend cho mọi action
- Soft delete bảo vệ dữ liệu
- Contract protection chặn xóa
- UI đồng bộ Materials, responsive
- Text chính xác, không gây hiểu nhầm global/project-scoped
- Không fake field chưa có trong schema

### Còn blocker bảo mật/nghiệp vụ nào không?

**Không có blocker.**

Các điểm lưu ý (không phải blocker):
1. Email/phone/taxCode chưa validate format - rủi ro thấp, dữ liệu nhập thủ công
2. `projectRole` parameter trong permissions function là dead code cho flow hiện tại - không ảnh hưởng logic
3. CHIEF_COMMANDER system role bị sidebar ẩn nhưng vẫn có canView nếu truy cập trực tiếp - consistent với sidebar pattern hiện tại
4. Chưa có AuditLog cho supplier CRUD - không phải blocker MVP

### Bước tiếp theo

1. Test thủ công trên browser: tạo 2-3 đối tác thật
2. Schema migration thêm `type`, `status`, `note` nếu cần phân loại
3. Validate email/phone format cơ bản
