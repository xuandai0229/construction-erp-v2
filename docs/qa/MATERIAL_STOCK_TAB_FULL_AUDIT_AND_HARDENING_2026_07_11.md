# Báo cáo QA: Kiểm tra toàn diện tab Tồn Kho (Materials Stock Tab)
**Ngày thực hiện:** 2026-07-11 (Phiên bản 3 — sửa lại sau phản hồi)
**Project:** Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ
**ProjectId:** `cmr5p2iwm0009r4wk51lwxhjy`

> **Đính chính lỗi script cũ:** Script audit phiên bản 1 và 2 bị hard-code `projectId="proj_01"` hoặc query toàn hệ thống mà không focus đúng project đang mở trên UI. Dẫn tới số liệu 14 items / 9 Active / 5 Archived ở report cũ là SAI. Số liệu chính xác là **14 items / 10 Active / 4 Archived**.

---

## 1. Data Audit — Raw Output

Script: `scripts/qa-material-stock-tab-data-audit.ts`

```
=== BẮT ĐẦU AUDIT DỮ LIỆU TỒN KHO ===
[INFO] Project: Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ
[INFO] ProjectId: cmr5p2iwm0009r4wk51lwxhjy

[BẢNG CHI TIẾT TỒN KHO]
--------------------------------------------------------------------------------------------------------------------------
CODE            | NAME                         | ACTIVE   | STOCK      | MIN        | STATUS     | HAS_MOV   | HAS_REQ
--------------------------------------------------------------------------------------------------------------------------
C-10            | Ống nhựa tiền phong          | false    | 111        | 2340       | low        | YES       | NO
C-101           | Dây mạng cáp                 | true     | 1          | 0          | healthy    | YES       | NO
CAT-VANG        | Cát vàng                     | false    | 10         | 100        | low        | YES       | YES
DA-1X2          | Đá 1x2                       | true     | 1          | 90         | low        | YES       | NO
DAY-DIEN12      | Dây điện1                    | true     | 3600       | 100        | healthy    | YES       | NO
GACH-XAY        | Gạch xây                     | true     | 18000      | 3000       | healthy    | YES       | NO
M-10            | Cáp mạngVNIT                 | true     | 1000       | 1200       | low        | YES       | NO
N-10            | HDPE                         | false    | 6222       | 0          | healthy    | YES       | NO
ONG-PVC         | Ống PVC                      | true     | 1220       | 250        | healthy    | YES       | NO
SON-NUOC        | Sơn nước                     | false    | 120        | 24         | healthy    | YES       | YES
THEP-D10        | Thép D10 Hòa Phát            | true     | 17500      | 4200       | healthy    | YES       | NO
THEP-D16        | Thép D16 Hòa Phát            | true     | 36500      | 9000       | healthy    | YES       | YES
THEP-D20        | Thép D20 Hòa Phát            | true     | 33500      | 8500       | healthy    | YES       | YES
XM-PCB40        | Xi măng PCB40                | true     | 1740       | 500        | healthy    | YES       | YES
--------------------------------------------------------------------------------------------------------------------------

[TỔNG KẾT]
  Tổng stock records: 14
  Active: 10
  Archived: 4

[WARN] CÓ 4 VẬT TƯ ARCHIVED CÒN TỒN KHO > 0:
  - Ống nhựa tiền phong (C-10): Tồn 111
  - Cát vàng (CAT-VANG): Tồn 10
  - HDPE (N-10): Tồn 6222
  - Sơn nước (SON-NUOC): Tồn 120
[PASS] Tất cả MaterialItem đều có ProjectMaterialStock.
[PASS] Không có tồn kho âm.
[PASS] Không có minStockLevel âm.

=== KẾT THÚC AUDIT ===
```

**Nhận xét:**
- 14 stock records = 10 Active + 4 Archived (thống nhất, không mâu thuẫn).
- 4 vật tư Archived vẫn còn tồn kho > 0. Đây là nghiệp vụ hợp lệ (ngừng sử dụng nhưng kho vật lý chưa xả).
- Cột `HAS_REQ` query thật từ `MaterialRequestItem` theo `materialCode` + `projectId`.

---

## 2. Ledger Reconciliation — Raw Output

Script: `scripts/qa-material-stock-ledger-reconciliation.ts`

```
=== BẮT ĐẦU LEDGER RECONCILIATION ===
[INFO] Project: Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ
[INFO] ProjectId: cmr5p2iwm0009r4wk51lwxhjy
Kiểm tra 14 stock records...

------------------------------------------------------------------------------------------------------------------------
CODE            | NAME                         | ACTIVE   | DB_STOCK   | IMPORT     | EXPORT     | CALC       | DIFF
------------------------------------------------------------------------------------------------------------------------
[PASS] C-10            | Ống nhựa tiền phong          | false    | 111        | 666        | 555        | 111        | 0
[PASS] C-101           | Dây mạng cáp                 | true     | 1          | 1961       | 1960       | 1          | 0
[PASS] CAT-VANG        | Cát vàng                     | false    | 10         | 520        | 510        | 10         | 0
[PASS] DA-1X2          | Đá 1x2                       | true     | 1          | 535        | 534        | 1          | 0
[PASS] DAY-DIEN12      | Dây điện1                    | true     | 3600       | 3600       | 0          | 3600       | 0
[PASS] GACH-XAY        | Gạch xây                     | true     | 18000      | 18000      | 0          | 18000      | 0
[PASS] M-10            | Cáp mạngVNIT                 | true     | 1000       | 12000      | 11000      | 1000       | 0
[PASS] N-10            | HDPE                         | false    | 6222       | 6666       | 444        | 6222       | 0
[PASS] ONG-PVC         | Ống PVC                      | true     | 1220       | 1400       | 180        | 1220       | 0
[PASS] SON-NUOC        | Sơn nước                     | false    | 120        | 120        | 0          | 120        | 0
[PASS] THEP-D10        | Thép D10 Hòa Phát            | true     | 17500      | 24000      | 6500       | 17500      | 0
[PASS] THEP-D16        | Thép D16 Hòa Phát            | true     | 36500      | 52000      | 15500      | 36500      | 0
[PASS] THEP-D20        | Thép D20 Hòa Phát            | true     | 33500      | 46000      | 12500      | 33500      | 0
[PASS] XM-PCB40        | Xi măng PCB40                | true     | 1740       | 2600       | 860        | 1740       | 0
------------------------------------------------------------------------------------------------------------------------

[PASS] Toàn bộ 14 vật tư: sổ cái khớp 100% với tồn kho DB.
=== KẾT THÚC ===
```

**Nhận xét:**
- Tất cả 14/14 vật tư có DIFF = 0. Sổ cái hoàn toàn khớp.
- Script sẽ exit code 1 nếu phát hiện bất kỳ DIFF != 0 nào.

---

## 3. Edge Cases — Raw Output

Script: `scripts/qa-material-stock-tab-edge-cases.ts`

```
=== KIỂM TRA EDGE CASES TAB TỒN KHO ===
[INFO] ProjectId: cmr5p2iwm0009r4wk51lwxhjy

--- PHẦN A: Business Logic (Prisma Simulation) ---

Case 1: Active + stock > 0 → phải Soft Delete (archive)
[PASS] Active + stock > 0 → archived (không hard delete)
Case 2: Active + stock = 0 + có movement → phải Soft Delete
[PASS] Active + stock=0 + movement → archived (không hard delete)
Case 3: Active + stock = 0 + có request → phải Soft Delete
[PASS] Active + stock=0 + request → archived (không hard delete)
Case 4: Active + hoàn toàn trống → Hard Delete
[PASS] Active + trống hoàn toàn → hard delete khỏi DB
Case 5: Archived → Khôi phục → Active lại
[PASS] Archived → restore → isActive=true
Case 6: Archived material → chặn nhập/xuất kho
[PASS] Archived → chặn EXPORT với lỗi 'đã lưu trữ'
[PASS] Archived → chặn IMPORT với lỗi 'đã lưu trữ'

--- PHẦN B: Server Action RBAC ---
[INFO] deleteMaterialItem() và restoreMaterialItem() yêu cầu Next.js cookies() context.
[INFO] Không thể gọi trực tiếp từ tsx CLI vì thiếu session/cookies runtime.
[INFO] RBAC chỉ mới code review, CHƯA E2E mutation test.
[INFO] Kết quả code review:
  - deleteMaterialItem: gọi requireSession() + requireProjectPermissions() + assertPermission('canDelete')
  - restoreMaterialItem: gọi requireSession() + requireProjectPermissions() + assertPermission('canUpdate')
  - applyMaterialMovement: không tự kiểm tra RBAC, phụ thuộc vào caller (createMaterialTransaction)
  - createMaterialTransaction: gọi requireSession() + requireProjectPermissions() + assertPermission('canImport'/'canExport')
[WARN] RBAC server-side: CHỈ CODE REVIEW, CHƯA TEST THẬT

=== KẾT QUẢ: 7 PASS, 0 FAIL ===
```

**Nhận xét:**
- Ở Case 2, script đã được nâng cấp: không tạo movement `quantity = 0` (ảo) nữa, mà tạo movement thật (Nhập 10, Xuất 10) để tồn = 0 nhưng vẫn có lịch sử biến động.
- Hệ thống nhận diện đúng và bảo toàn được lịch sử bằng Soft Delete.
- **Phần B (RBAC):** Chưa test được bằng CLI. Chỉ review mã nguồn xác nhận rằng mọi action đều có guard.

---

## 4. UI KPI Counts Audit

Script: `scripts/qa-material-stock-ui-counts.ts`

```
=== KIỂM TRA KPI UI TỒN KHO ===
ProjectId: cmr5p2iwm0009r4wk51lwxhjy
Tổng số: 14
Active: 10
Archived: 4
- Đủ hàng (Active): 8
- Sắp hết (Active): 2
- Hết hàng (Active): 0
- Âm kho (Active): 0
Danh sách Sắp hết (Active): DA-1X2, M-10
=== KẾT QUẢ: PASS ===
```

**Nhận xét UI/Logic:**
- Component `materials-stock-table.tsx` đã được cập nhật logic để **chỉ đếm vật tư Active vào các KPI rủi ro**.
- Hai vật tư Sắp hết (DA-1X2, M-10) phản ánh đúng dữ liệu Active. Các vật tư Archived (dù còn tồn kho, vd: N-10, CAT-VANG, SON-NUOC) bị loại hoàn toàn khỏi các cảnh báo này, giảm nhiễu cho thủ kho.
- Đã thêm các filter `active` (Đang sử dụng) và `archived` (Đã lưu trữ) vào filter bar, với default là `active`.

---

## 5. Audit rủi ro `MaterialRequestItem` link qua `materialCode`

- **Thực trạng:** 
  - Prisma Schema: `MaterialRequestItem` không có Foreign Key cứng trỏ về `MaterialItem.id`. Nó lưu `materialCode` dưới dạng string.
  - Hàm `deleteMaterialItem` đếm request bằng cách đối chiếu `materialCode` với `materialCode` của item đang cần xóa.
- **Rủi ro Mất Dữ Liệu Lịch Sử:** NẾU một vật tư đã nằm trong MaterialRequest, nhưng sau đó Admin vào đổi mã vật tư đó (VD: `THEP-01` đổi thành `THEP-02`), thì mối liên kết bị đứt gãy. Lúc này `deleteMaterialItem` đếm `THEP-02` sẽ = 0, và cho phép xóa Hard Delete, làm mất luôn vật tư, khiến MaterialRequest cũ bị "treo" với `materialCode` ảo không có master data tương ứng.
- **Cách khắc phục đã áp dụng (Option B):**
  - Trong `actions.ts` -> `updateMaterialItem`: Đã bổ sung guard chặn đứng việc sửa đổi `code` nếu vật tư đã phát sinh bất kỳ Movement nào hoặc Request nào.
  - Lỗi trả về: *"Không thể đổi mã vật tư vì vật tư này đã phát sinh giao dịch nhập/xuất hoặc đã được đưa vào phiếu yêu cầu."*
  - Khắc phục này đảm bảo an toàn tuyệt đối mà không cần chạy DB Migration thêm Foreign Key (giúp bảo toàn cấu trúc hiện tại của dự án).

---

## 6. Audit Callers của `applyMaterialMovement`

Tìm kiếm toàn hệ thống hàm `applyMaterialMovement(tx, input)` chỉ được gọi tại 2 nơi trong production:

1. **Caller 1:** `src/app/(dashboard)/materials/actions.ts` -> `createMaterialItem`
   - **Mục đích:** Khởi tạo tồn kho ban đầu (initial stock) lúc tạo mới vật tư.
   - **Guard (Có):** `requireSession()`, `assertPermission(perms, "canCreate")`. Thêm vào đó, nếu `initialStock > 0`, hàm sẽ gọi thêm `assertPermission(perms, "canImport")`. Rất an toàn.

2. **Caller 2:** `src/app/(dashboard)/materials/actions.ts` -> `createMaterialTransaction`
   - **Mục đích:** User tự tạo phiếu Nhập / Xuất từ giao diện.
   - **Guard (Có):** `requireSession()`. Nếu type=IMPORT gọi `assertPermission(perms, "canImport")`. Nếu type=EXPORT gọi `assertPermission(perms, "canExport")`. An toàn.

3. *(QA Scripts)*: Có gọi trong các script test (`qa-material-stock-tab-edge-cases.ts`, `qa-material-transaction-runtime-create.ts`...) nhưng đây là script chạy offline.

=> **Kết luận:** Toàn bộ Caller production đều có đủ RBAC guard kiểm tra session và quyền `canImport/canExport`. Hàm core `applyMaterialMovement` không tự kiểm tra quyền (để dễ test/mock) là pattern hợp lý miễn là các Caller (Action Server) đã bọc bảo vệ.

---

## 7. Nghiệp vụ Archived còn tồn kho

| Câu hỏi | Trả lời |
|---------|---------|
| Có được tính vào KPI? | KHÔNG — logic `counts` UI chỉ đếm vật tư Active |
| Có nằm trong filter mặc định? | KHÔNG — default filter là "Đang sử dụng" |
| Có được Nhập/Xuất? | KHÔNG — UI vô hiệu hóa nút + ledger server chặn đứng |
| Có nút Khôi phục? | CÓ — menu 3 chấm hiện "Khôi phục vật tư" (icon RotateCcw) cho archived |
| Workflow xử lý tồn kho archived? | Khôi phục → Xuất kho phần còn lại → Archive lại (soft delete) |

---

## 8. Trải nghiệm Permission-based RBAC

Hệ thống ERP sử dụng permission-based RBAC (dựa vào `MaterialPermissionSet`), hoàn toàn không hard-code `role === "ADMIN"`. Quyền được cấp theo mapping trong `materials-permissions.ts`.

### Mapping Quy Tắc Hiện Tại
- **Xem tồn kho**: Dựa trên `canView`. Mọi thành viên dự án đều xem được.
- **Tạo vật tư mới**: Dựa trên `canCreate`. Chỉ Ban Quản Lý (Admin, Giám đốc, Chỉ huy trưởng).
- **Sửa vật tư**: Dựa trên `canUpdate`. Tương tự canCreate.
- **Xóa / Lưu trữ**: Dựa trên `canDelete`. Tương tự canCreate.
- **Nhập / Xuất kho**: Dựa trên `canImport` và `canExport`. (Ban Quản Lý, Chỉ huy trưởng, Kế toán, Thủ kho đều được cấp quyền này).
- **Khôi phục vật tư**: Dựa trên `canUpdate`. Vì thao tác này là đảo ngược trạng thái `isActive` của Master Data, nó cần cùng level quyền với việc cập nhật (Sửa vật tư).

### Thực Tế Tài Khoản (Từ script `qa-materials-rbac-permission-matrix.ts`)
| User | SysRole | ProjRole | Nhập/Xuất | Tạo/Sửa/Khôi Phục |
|------|---------|----------|-----------|------------------|
| Admin / Giám đốc | ADMIN / DIRECTOR | PROJECT_MANAGER | ✅ CÓ | ✅ CÓ |
| Trần Quang Huy | CHIEF_COMMANDER | SITE_COMMANDER | ✅ CÓ | ✅ CÓ |
| Hoàng Văn Phúc (Thủ kho) | STAFF | SUPERVISOR | ✅ CÓ | ❌ KHÔNG |
| Vũ Mai Linh (Kế toán) | ACCOUNTANT | VIEWER | ✅ CÓ | ❌ KHÔNG |
| Đỗ Minh Quân (Kỹ sư) | ENGINEER | SUPERVISOR | ❌ KHÔNG | ❌ KHÔNG |

**Trả lời cụ thể cho vai trò Chỉ huy trưởng:**
Chỉ huy trưởng (role `SITE_COMMANDER`) thuộc nhóm `isManager` theo `materials-permissions.ts`. Do đó, Chỉ huy trưởng hoàn toàn **CÓ ĐẦY ĐỦ QUYỀN** nhập kho, xuất kho, sửa, xóa, và khôi phục vật tư. Quyền này đồng bộ hoàn toàn giữa giao diện UI và Server Actions.

| Action | Guard Server | Test thật? |
|--------|-------|-----------|
| `deleteMaterialItem` | `requireSession` + `assertPermission("canDelete")` | ❌ Chỉ code review |
| `restoreMaterialItem` | `requireSession` + `assertPermission("canUpdate")` | ❌ Chỉ code review |
| `createMaterialTransaction` | `requireSession` + `assertPermission("canImport"/"canExport")` | ❌ Chỉ code review |
| `updateMaterialItem` | `requireSession` + `assertPermission("canUpdate")` | ❌ Chỉ code review |

**Lý do chưa test E2E Mutation:** Server Actions dùng `cookies()` từ Next.js runtime. Không thể mock cookies bằng tsx script CLI độc lập. Cần viết kịch bản Playwright/Cypress login từng user thật và thao tác trình duyệt. Tuy nhiên, qua code review và RBAC script, **UI và Server đang dùng cùng một nguồn quyền `permissions` object**, không có tình trạng UI cho bấm nhưng server chặn sai.

---

## 9. Validation Commands

| Lệnh | Kết quả |
|------|---------|
| `npx prisma validate` | ✅ Schema valid |
| `npx tsc --noEmit` | ✅ Không lỗi |
| `npx eslint` (materials scope) | ✅ 0 errors, 8 warnings (unused imports) |
| `qa-material-stock-tab-data-audit.ts` | ✅ PASS — 10 Active, 4 Archived, 4 archived còn tồn |
| `qa-material-stock-ledger-reconciliation.ts` | ✅ PASS — 14/14 DIFF = 0 |
| `qa-material-stock-ui-counts.ts` | ✅ PASS — KPI Sắp hết = 2 (DA-1X2, M-10) |
| `qa-material-stock-tab-edge-cases.ts` | ✅ 7/7 business logic PASS (có tạo movement thật) |
| `npm run build` | ✅ Build thành công, exit code 0 |

---

## KẾT LUẬN

**PASS CÓ ĐIỀU KIỆN**

| Hạng mục | Trạng thái |
|----------|-----------|
| Data integrity (sổ cái) | ✅ PASS — 14/14 khớp, diff = 0 |
| Business logic (delete/archive/restore/block) | ✅ PASS — 7/7 edge cases |
| UI/UX (labels, KPI counts, filters, badges) | ✅ PASS — đã chuẩn hóa và bóc tách KPI |
| Integrity Code Protection | ✅ PASS — đã block sửa mã vật tư nếu có request/movement |
| Security Callers (applyMaterialMovement) | ✅ PASS — mọi Action đều bọc RBAC đầy đủ |
| Permission-based RBAC | ✅ PASS — UI và Server đồng bộ, phân quyền đúng nghiệp vụ, Chỉ huy trưởng/Thủ kho được giao đúng quyền |
| RBAC Server-side Test | ⚠️ CHỈ CODE REVIEW — chưa E2E mutation test với session thật |
| Build & TypeCheck | ✅ PASS |

**Điều kiện còn thiếu để GO tuyệt đối:**
1. Cần thực hiện E2E mutation test bằng Playwright/Cypress với các Session thật của Chỉ huy trưởng, Thủ kho, Kế toán để đảm bảo Middleware và Guard thực thi đúng 100% trên trình duyệt.
