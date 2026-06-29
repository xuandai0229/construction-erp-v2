# Báo Cáo Triển Khai Phân Quyền (RBAC) Phân Hệ Quản Lý Vật Tư

**Thời gian cập nhật:** 25/06/2026  
**Phân hệ:** Materials (Quản lý Vật tư)  
**Tình trạng:** Đã hoàn tất triển khai & Vượt qua quá trình Build  

---

## 1. Mục Tiêu Kiểm Soát Quyền Hạn (RBAC)
Bảo đảm dữ liệu vật tư công trường được kiểm soát chặt chẽ bằng cách thực thi hệ thống phân quyền **Action-Level** (chặn quyền theo từng hành động cụ thể) thay vì chỉ kiểm tra "tồn tại trong dự án" một cách chung chung như trước đây.

**Yêu cầu hệ thống:**
1. **Bảo mật hai lớp:** UI chỉ mang tính chất hiển thị/ẩn các nút để tối ưu UX. Quyền định đoạt thực sự nằm ở **Server Actions**.
2. **UX tinh gọn:** Màn hình của người dùng chỉ có quyền Xem (Viewer/Giám sát) không chứa các nút "mờ" (disabled). Toàn bộ cột và nút thao tác được **ẩn hoàn toàn**.
3. **Logic vận hành gốc:** Có quyền xóa thì xóa thẳng (không confirm, không ngừng sử dụng). Có quyền sửa thì sửa toàn bộ kể cả đơn vị tính.

---

## 2. Giải Trình Mapping Chức Vụ Tiếng Việt
*Không có bất kỳ thay đổi nào trên `schema.prisma`. Hệ thống sử dụng 100% chức vụ đã có trong schema định nghĩa sẵn.*

### 2.1. Phân quyền cấp Hệ Thống (`UserRole`)
Quy định quyền hạn của thành viên khi họ chưa được gán vào dự án cụ thể. Nếu không phải Quản trị hệ thống, quyền trong dự án sẽ phụ thuộc vào `ProjectRole`.

- `ADMIN` → Quản trị hệ thống (Toàn quyền mọi dự án)
- `DIRECTOR` → Giám đốc (Cần gán vào dự án)
- `DEPUTY_DIRECTOR` → Phó giám đốc (Cần gán vào dự án)
- `CHIEF_COMMANDER` → Chỉ huy trưởng (Cần gán vào dự án)
- `MANAGER` → Quản lý (Cần gán vào dự án)
- `ENGINEER` → Kỹ sư (Cần gán vào dự án)
- `ACCOUNTANT` → Kế toán (Cần gán vào dự án)
- `STAFF` → Nhân viên (Cần gán vào dự án)

### 2.2. Phân quyền cấp Dự Án (`ProjectRole`)
Các chức vụ được phân công trong công trình cụ thể sẽ quyết định quyền hạn tại phân hệ Vật tư của công trình đó.

- `PROJECT_MANAGER` → Quản lý dự án
- `SITE_COMMANDER` → Chỉ huy công trường
- `CHIEF_COMMANDER` → Chỉ huy trưởng công trình
- `ASSISTANT_COMMANDER` → Chỉ huy phó
- `QA_QC` → QA/QC
- `HSE` → An toàn lao động
- `SUPERVISOR` → Giám sát
- `VIEWER` → Chỉ xem

---

## 3. Ma Trận Phân Quyền Thực Tế

| Enum hệ thống | Chức vụ tiếng Việt | Xem phân hệ vật tư | Thêm vật tư | Sửa vật tư | Xóa vật tư | Nhập kho | Xuất kho | Xem lịch sử nhập/xuất | Xem đề xuất mua |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ADMIN` | Quản trị hệ thống | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `PROJECT_MANAGER` | Quản lý dự án | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `SITE_COMMANDER` | Chỉ huy công trường | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `CHIEF_COMMANDER` | Chỉ huy trưởng công trình | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ASSISTANT_COMMANDER` | Chỉ huy phó | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `QA_QC` | QA/QC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `HSE` | An toàn lao động | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `SUPERVISOR` | Giám sát | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `VIEWER` | Chỉ xem | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| *(N/A)* | User không thuộc công trình | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. UI Gating (Điều Khiển Giao Diện)
1. **Không lộ Enum:** Không hiển thị chữ `ADMIN` hay `PROJECT_MANAGER` ra giao diện, màn hình báo lỗi được việt hóa hoàn toàn: *"Bạn không có quyền xem phân hệ vật tư của công trình này."*
2. **User Chỉ xem:** Không có cột thao tác trong bảng. Không có nút thêm, sửa, xóa, nhập hay xuất kho.
3. **Không UI thừa:** Không có các trạng thái "archive", "restore", "ngừng sử dụng" hay "confirm xóa". Nút bấm gọn gàng và không rối mắt bởi CSS disabled (nếu không có quyền, hệ thống cắt thẳng HTML Node không render).
4. **Form Giao Dịch:** Nếu chỉ có quyền Import, người dùng sẽ không thấy và không chọn được Export từ code.

---

## 5. Kết Quả Kiểm Định

### 5.1. Kịch bản Test RBAC (`qa-materials-rbac.ts`)
Script kiểm thử đã thực thi bằng cách giả lập Session an toàn, tạo các User tương ứng với toàn bộ các chức vụ hệ thống và dọn dẹp sạch sẽ sau khi test.
**Chức vụ đã test cấp hệ thống (UserRole):** Quản trị hệ thống, Giám đốc, Phó giám đốc, Chỉ huy trưởng, Quản lý, Kỹ sư, Kế toán, Nhân viên.
**Chức vụ đã test cấp dự án (ProjectRole):** Quản lý dự án, Chỉ huy công trường, Chỉ huy trưởng công trình, Chỉ huy phó, QA/QC, An toàn lao động, Giám sát, Chỉ xem.

*Bảng kết quả Console Output:*
```text
Đang thiết lập dữ liệu test...
[PASS] Quản trị hệ thống có toàn quyền vật tư
[PASS] Giám đốc không thuộc công trình bị chặn theo đúng thiết kế
[PASS] Phó giám đốc không thuộc công trình bị chặn theo đúng thiết kế
[PASS] Chỉ huy trưởng không thuộc công trình bị chặn theo đúng thiết kế
[PASS] Quản lý không thuộc công trình bị chặn theo đúng thiết kế
[PASS] Kỹ sư không thuộc công trình bị chặn theo đúng thiết kế
[PASS] Kế toán không thuộc công trình bị chặn theo đúng thiết kế
[PASS] Nhân viên không thuộc công trình bị chặn theo đúng thiết kế
[PASS] User không thuộc công trình bị chặn
[PASS] Quản lý dự án có toàn quyền trong công trình
[PASS] Chỉ huy công trường có toàn quyền trong công trình
[PASS] Chỉ huy trưởng công trình có toàn quyền trong công trình
[PASS] Chỉ huy phó có quyền đúng theo ma trận
[PASS] QA/QC chỉ được xem và bị chặn thao tác ghi
[PASS] An toàn lao động chỉ được xem và bị chặn thao tác ghi
[PASS] Giám sát chỉ được xem và bị chặn thao tác ghi
[PASS] Chỉ xem không thể thêm/sửa/xóa/nhập/xuất
[PASS] Payload xuyên công trình bị chặn
[PASS] Người có quyền sửa sửa được toàn bộ field kể cả đơn vị tính
[PASS] Người có quyền xóa xóa thẳng vật tư có tồn kho/giao dịch
Đang dọn dẹp dữ liệu test...
```

*Đánh giá phân quyền:*
- **Role Full Quyền (Cấp dự án & Admin):** `ADMIN`, `PROJECT_MANAGER`, `SITE_COMMANDER`, `CHIEF_COMMANDER`, `ASSISTANT_COMMANDER`.
- **Role Chỉ Xem (Cấp dự án):** `QA_QC`, `HSE`, `SUPERVISOR`, `VIEWER`.
- **Bị chặn nếu không thuộc dự án (Cấp hệ thống):** `DIRECTOR`, `DEPUTY_DIRECTOR`, `CHIEF_COMMANDER`, `MANAGER`, `ENGINEER`, `ACCOUNTANT`, `STAFF` (Toàn bộ user trừ ADMIN).
- **Cross-project:** Bị chặn thành công bằng API backend (403/Throw Error).
- **Cleanup test data:** Đã xóa toàn bộ vật tư, tồn kho, project và user test thành công ngay sau khi kết thúc flow.

### 5.2. Kết quả Regression CRUD (`qa-materials-crud-flow.ts`)
Xóa vật tư được thực thi qua hàm xóa thẳng. Mọi lịch sử và tồn kho gắn liền được cascade xóa bỏ trọn vẹn.
```text
=== MATERIALS CRUD FLOW TEST ===
Created material: (TEST-MAT-01)
Updated material name and unit successfully.
Imported 100 bao. Stock is now 100.
Exported 30 tấn. Stock is now 70.
Deleted material directly with all related data.
✅ CRUD FLOW TEST PASSED SUCCESSFULLY!
```

### 5.3. Kết quả DB Sync (`qa-materials-db-sync-audit.ts`)
```text
=== AUDIT SUMMARY ===
Projects audited: 2
Total Mismatches: 0
Negative stocks: 0
```

### 5.4. Kết quả Project-Scoped Flow (`qa-materials-project-scoped-flow.ts`)
```text
=== MATERIALS PROJECT SCOPED FLOW TEST ===
Other project sees A?: NO ✅
Stock after import: 100 (Expected: 100)
Stock after export: 70 (Expected: 70)
Blocked! Cannot export 999999 when stock is 70 ✅
✅ FLOW TEST PASSED SUCCESSFULLY!
```

### 5.5. Build & System Status
- `npx prisma validate`: **Valid 🚀**
- `npx prisma format`: **Success**
- `npx tsc --noEmit`: **Exit code 0**
- `npm run build`: **Compiled successfully in 5.4s**
- `git status --short`:
```text
 M src/app/(dashboard)/materials/actions.ts
 M src/app/(dashboard)/materials/page.tsx
 M src/components/materials/materials-catalog.tsx
 M src/components/materials/materials-overview.tsx
 M src/components/materials/materials-stock-table.tsx
 M src/components/materials/materials-transactions.tsx
 M src/components/materials/materials-workspace.tsx
 M src/components/materials/transaction-form-dialog.tsx
?? docs/qa/MATERIALS_RBAC_IMPLEMENTATION_REPORT.md
?? scripts/qa-materials-rbac.ts
?? src/lib/materials/materials-permissions.ts
```

---

## 6. Đánh Giá Cuối Cùng & Rủi Ro Còn Lại

- **Test đủ toàn bộ UserRole**: Đã test đủ (Admin, Giám đốc, Phó giám đốc, Chỉ huy trưởng, Quản lý, Kỹ sư, Kế toán, Nhân viên).
- **Test đủ toàn bộ ProjectRole**: Đã test đủ (Quản lý dự án, Chỉ huy công trường, Chỉ huy trưởng công trình, Chỉ huy phó, QA/QC, An toàn lao động, Giám sát, Chỉ xem).
- **Output test tiếng Việt**: Console test hoàn toàn bằng tiếng Việt rõ ràng từng step.
- **Không dùng role không tồn tại**: Tuyệt đối không sinh ra enum lỗi như `CHIEF_COMMANDER_SYS` (Chỉ dùng `UserRole.CHIEF_COMMANDER` và phân biệt rõ với `ProjectRole.CHIEF_COMMANDER`).
- **Chưa phát hiện rủi ro trong phạm vi kiểm thử hiện tại.** (Không ghi báo cáo ảo rủi ro bảo mật = 0%).
- **Logic Materials không bị phá**: Có quyền xóa thì xóa thẳng (không dùng archive/ngừng sử dụng), có quyền sửa thì sửa toàn bộ kể cả đơn vị tính.

**Hạn chế trong tương lai cần lưu ý (Do cấu trúc Schema hiện tại chưa hỗ trợ):**
1. **Chưa có chức vụ Thủ kho riêng biệt:** Schema chưa có enum role cho Thủ kho (người chỉ có chức năng thao tác kho, hoặc chỉ nhập không xuất). Toàn bộ quyền thao tác ghi hiện đang được phân mảng cho Ban quản lý chung. Nếu quy trình vận hành yêu cầu người nhập riêng người xuất riêng, thì lúc đó cần mở rộng Schema.
2. **Khi mở rộng toàn hệ thống cần chuẩn hóa role/permission chung:** Việc gán Full Access cho Ban quản lý ở phân hệ Vật tư là hợp lý, nhưng khi ghép với Phê duyệt Kế toán hay Văn bản, cần một ma trận chuẩn hóa tổng thể để đảm bảo phân tách trách nhiệm.
