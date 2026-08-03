# BẢNG MA TRẬN ĐỒNG BỘ THỊ GIÁC TOÀN HỆ THỐNG (FULL SYSTEM VISUAL CONSISTENCY MATRIX)

**Dự án**: ERP Thi công Xây dựng (`construction-erp-v2`)  
**Ngày thực hiện**: 01/08/2026  
**Tiêu chuẩn thiết kế**: Modern Light Enterprise Construction ERP (Light Content Theme, Dark Navy Sidebar)

---

| Route / Module | Page Header | Button System | Card & Surface | Table System | Form & Input | Status Badges | Dropdown / Menu | Empty State | Loading State | Motion & Micro | Mobile Responsiveness | System Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/dashboard` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/projects` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/projects/[id]` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/projects/new` | PASS | PASS | PASS | N/A | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/projects/[id]/edit` | PASS | PASS | PASS | N/A | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/documents` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/documents/[projectId]` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/reports` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/reports/field` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/reports/weekly-inspection` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/reports/safety` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/materials` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/approvals` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/tasks` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/users` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/settings` | PASS | PASS | PASS | N/A | PASS | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Global Project Selector | PASS | PASS | PASS | N/A | PASS | PASS | PASS | N/A | PASS | PASS | PASS | **PASS** |
| Notification Panel | PASS | PASS | PASS | N/A | N/A | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Global Search | PASS | PASS | PASS | N/A | PASS | N/A | PASS | PASS | PASS | PASS | PASS | **PASS** |

---

### Ghi chú kiểm thử
- **Light Theme Integrity**: 100% các route trong vùng Content đều có background `#F8FAFC`, card surface `#FFFFFF`, viền `#E2E8F0`, không bị lọt dark/navy panel hay background xám đậm gây chói mắt.
- **Data Freeze**: Không có bất kỳ thay đổi nào đối với cơ sở dữ liệu, seed, RBAC hay thông tin nghiệp vụ.
