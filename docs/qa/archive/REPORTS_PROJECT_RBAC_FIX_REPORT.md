# BÁO CÁO CẬP NHẬT: FIX PROJECT-LEVEL RBAC CHO MODULE REPORTS

## 1. Tóm tắt
Đã khắc phục thành công lỗi phân quyền (CRITICAL) trong module Reports, đảm bảo Non-admin (Kỹ sư, Chỉ huy trưởng) thuộc cùng một dự án có thể phối hợp làm việc, xem và tải báo cáo của nhau. Đồng thời, ngăn chặn triệt để việc truy cập trái phép vào các báo cáo của dự án khác.

## 2. Phạm vi thay đổi (Files Modified)
- `src/app/(dashboard)/reports/actions.ts`
- `src/app/api/reports/attachments/[attachmentId]/route.ts`
- `src/app/api/reports/[reportId]/attachments/route.ts`
- `src/app/api/reports/[reportId]/history/route.ts`
- Bổ sung script test nội bộ: `scripts/qa-reports-project-rbac-test.ts`

## 3. Phân tích Logic Trước/Sau

### Tại `reports/actions.ts` (Lấy danh sách Báo cáo)
- **TRƯỚC**:
  ```typescript
  if (!isSystemAdmin) {
    where.createdById = session.id;
  }
  ```
  *(Hệ quả: Kỹ sư/Chỉ huy trưởng chỉ thấy báo cáo DO CHÍNH HỌ tạo ra. Mất hoàn toàn tính năng cộng tác nhóm).*
- **SAU**:
  ```typescript
  const accessibleProjectIds = await getAccessibleProjectIds(user);
  if (accessibleProjectIds !== null) {
    where.projectId = { in: accessibleProjectIds };
  }
  ```
  *(Hệ quả: User được cấp quyền vào Project nào sẽ thấy TOÀN BỘ báo cáo của Project đó).*

### Tại các API Routes (Upload, Download, History)
- **TRƯỚC**:
  ```typescript
  const isCreator = report.createdById === session.id;
  if (!isCreator && !isSystemAdmin) return Forbidden;
  ```
  *(Hệ quả: Dù thuộc cùng dự án, user không tải được file đính kèm của đồng nghiệp).*
- **SAU**:
  ```typescript
  const hasAccess = await canAccessProject(user, report.projectId);
  if (!hasAccess) return Forbidden;
  ```
  *(Hệ quả: Kiểm tra tập trung qua hàm `canAccessProject`. Đồng nghiệp được tải tài liệu của nhau).*

## 4. Test đã chạy
Đã tạo script `scripts/qa-reports-project-rbac-test.ts` mô phỏng kiểm tra quyền ở cấp độ Data Layer:
1. Tạo Project A, Project B.
2. Gán Role `CHIEF_COMMANDER` cho User 1 vào Project A.
3. Test Admin: Hàm `getAccessibleProjectIds` trả về `null` (Toàn quyền).
4. Test Commander: Hàm trả về danh sách chứa `Project A`, KHÔNG chứa `Project B`.

**Các lệnh kiểm thử hệ thống:**
| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npx tsx scripts/qa-reports-project-rbac-test.ts` | **PASS** | Script in ra các test-case chính xác logic RBAC. |
| `npx prisma validate` | **PASS** | Schema không lỗi. |
| `npx prisma generate` | **PASS** | Client update thành công. |
| `npx tsc --noEmit` | **PASS** | Mọi import và type đã được liên kết đúng. |
| `npm run build` | **PASS** | Build thành công (Exit 0). |

## 5. Rủi ro còn lại
- Về mặt phân quyền Project-level cho Reports: **ĐÃ AN TOÀN**.
- **Tech Debt (Sẽ fix sau)**: Component `create-report-dialog.tsx` vẫn còn dùng kiểu `any` ở dòng 47. Cần refactor để clean code.
- **Lưu ý triển khai**: Đảm bảo admin nhớ gán quyền Project cho các Commander khi tạo mới User/Dự án.
