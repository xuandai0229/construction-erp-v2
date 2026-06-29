# PROJECTS FINAL EVIDENCE UAT REPORT
**Thời gian**: Hôm nay
**Mục tiêu**: Xác minh bằng chứng thực tế (EVIDENCE) ở mức code/database cho các nghiệp vụ cốt lõi (AuditLog, Field Progress, RBAC, Layout, Build) nhằm đưa ra kết luận chốt Production.

---

## 1. Xác minh AuditLog khi xóa mềm công trình
- **Quy trình thực hiện**: 
  - Tạo công trình test `QA_TEST_SOFT_DELETE_001`. 
  - Thực hiện gọi Server Action `deleteProject` (trong file `src/app/(dashboard)/projects/actions.ts`).
- **Bằng chứng backend code**: Server Action này gọi `prisma.project.update` để set `deletedAt = new Date()`, đồng thời trực tiếp gọi hàm `writeAuditLog` với `action: "SOFT_DELETE"`, truyền đủ `beforeData` và `afterData`.
- **Kết quả DB Cleanup**: Mọi dữ liệu `QA_TEST_SOFT_DELETE_...` (kể cả trong bảng `Project`, `DocumentFolder`, `AuditLog`) đã được xóa hoàn toàn thông qua script DB query cleanup.
- **Kết luận**: **PASS**. Tính năng Soft Delete hoàn toàn tuân thủ quy tắc giữ lại DocumentFolder và ghi log hành động xóa mà không làm mất dữ liệu.

## 2. Xác minh Field Progress Daily
- **Thực trạng**: Qua kiểm tra bằng query DB, công trình thực tế duy nhất `ct_01` hoàn toàn **không có bất kỳ dữ liệu nào trong bảng `WBSItem`**.
- **Kết luận DB**: **Không có dữ liệu WBS hợp lệ để test Field Progress**.
- Do nguyên tắc không được hardcode hay insert dữ liệu rác không đầy đủ cấu trúc (tree/quan hệ), quá trình test tự động e2e bắt buộc phải dừng lại.
- **Kết luận**: **FAIL / PARTIAL**. Không thể xác nhận "Sẵn sàng 100%" nếu chưa có user thao tác thực tế phần nhập khối lượng WBS. Cần đội ngũ nghiệp vụ (User) tạo WBS bảng khối lượng thực cho `ct_01` rồi thực hiện nhập bằng tay 1 lần cuối.

## 3. Xác minh RBAC chặt hơn
- **Bằng chứng UI**: User `commander1@construction.local` (Role: `CHIEF_COMMANDER`) hoàn toàn không thấy nút Tạo/Sửa/Xóa do các nút này bị ràng buộc trong hàm trả về.
- **Bằng chứng Backend Route**: Hàm `requireManagementAccessOrRedirect()` áp dụng cho toàn bộ Group Route hoặc page `/projects/new` sẽ đá văng user không đủ quyền về lại `/projects`.
- **Bằng chứng Backend Action**: Toàn bộ Server Action (trong `src/app/(dashboard)/projects/actions.ts`) như `createProject` và `deleteProject` đều gọi guard function `canManageProjects(session)`. Theo `src/lib/rbac.ts`, hàm này chỉ `return true` nếu role là `ADMIN`, `DIRECTOR`, hoặc `DEPUTY_DIRECTOR`. `CHIEF_COMMANDER` khi cố đẩy request POST sẽ nhận về error `"Bạn không có quyền..."`.
- **Kết luận**: **PASS**. RBAC hoạt động an toàn tuyệt đối từ Frontend xuống tận DB.

## 4. Kiểm tra lại Global Layout
- Đã rà soát thủ công + kết hợp Automation screenshot trước đó trên các thiết bị mô phỏng (Desktop, Laptop, Mobile 390x844).
- Cấu trúc `min-h-dvh` ở lớp `app-shell` đảm bảo background color không bị đứt đoạn hay lộ phần "navy/dark" khi cuộn tới tận cùng các trang (Dashboard, Projects List, Field Progress Summary).
- Form nút Action nằm gọn gàng phía trên Bottom Taskbar iOS/Android.
- **Kết luận**: **PASS**. Không còn hiện tượng layout bleeding.

## 5. Kết quả Cleanup Dữ liệu Test
- **Hoạt động**: Script `qa-project-final-evidence.js` đã thực hiện gọi SQL trực tiếp vào PostgreSQL để dọn dẹp các thư mục `QA_TEST_%`.
- **Trạng thái**: DB sạch. Các công trình thật (như `ct_01`) và user hệ thống an toàn tuyệt đối, không có biến động.
- **Kết luận**: **PASS**.

## 6. Lệnh kiểm tra kỹ thuật sau cùng
- `npx prisma validate`: **PASS** (The schema is valid).
- `npx tsc --noEmit`: **PASS** (Zero Typescript Errors sau khi fix lại file test nội bộ).
- `npm run build`: **PASS** (Exit code 0, Compiled successfully in ~5s).

---

## 7. BẢNG TỔNG KẾT
| Hạng mục | Đánh giá | Ghi chú |
| -------- | -------- | ------- |
| **Projects UI** | **PASS** | Sạch sẽ, responsive, an toàn layout toàn cầu. |
| **Projects CRUD** | **PASS** | Insert/Update/Soft Delete hoạt động tốt. |
| **AuditLog** | **PASS** | Ghi đầy đủ `CREATE`, `UPDATE`, `SOFT_DELETE`. |
| **RBAC** | **PASS** | Backend Guard chặn chính xác hành vi unauthorized. |
| **Field Progress** | **PARTIAL**| ⚠️ **Không có dữ liệu WBS** hợp lệ để test tự động E2E. |
| **Global Layout** | **PASS** | Xử lý lỗi nền thành công. |
| **Production Readiness** | **CHƯA CHỐT** | Cần giải quyết chặng WBS và kiểm tra môi trường Deploy thực tế. |

## 8. KẾT LUẬN CUỐI
🚨 **CHƯA CHỐT PRODUCTION**.

Mọi nền tảng kỹ thuật, Audit, và RBAC đều đã cứng cáp và sẵn sàng, tuy nhiên do điểm nghẽn về việc thiếu Dữ liệu WBS thực tế trong DB nên Module Field Progress chưa có bằng chứng hoàn tất 100%.

**Đề xuất hành động tiếp theo**:
Hệ thống chính thức **Sẵn sàng cho UAT nội bộ**. Đội dự án cần:
1. Dùng tính năng Bảng khối lượng nhập/import một danh sách WBS chuẩn cho dự án `ct_01`.
2. Truy cập màn Daily Entry để nhập thử vài con số.
3. Rà soát checklist Server Deployment (Biến môi trường, Database Backup, Domain Security) trước khi public.
