# R3B POST-UAT ADMIN ACTION VISIBILITY FIX REPORT

## A. Executive Summary
- **Admin action visibility:** PASS WITH RISKS (Browser UAT not explicitly verified via bot, but passed via automated integration scripts).
- **Tại sao trước đó Admin không thấy gì:** Bởi vì điều kiện render UI trong các component (`reports-table.tsx`, `report-detail-drawer.tsx`...) đang giới hạn chặt chẽ: chỉ render nhóm chức năng khi report status là `DRAFT` hoặc `REJECTED`. Do đó, kể cả tài khoản `ADMIN` hay `DIRECTOR` cũng không thấy bất kỳ nút nào ở trạng thái `SUBMITTED`. Ngoài ra, server policy `canSoftDeleteReport` cũng block `SUBMITTED`.
- **Đã sửa gì:** 
  - Sửa `canSoftDeleteReport` trong `report-workflow-policy.ts` cho phép Role Cao (Admin/Director) xóa báo cáo `SUBMITTED`.
  - Mở khóa UI `reports-table.tsx`, `report-detail-drawer.tsx`, và `reports-mobile-cards.tsx` để render nút "Xóa" cho Admin khi status là `SUBMITTED`.
  - Cập nhật server action `softDeleteSiteReport` để cho phép thao tác này diễn ra đúng nghiệp vụ (với thông báo lỗi tiếng Việt nếu cần).
- **SUBMITTED hiện có action gì (với Admin):** Xem chi tiết (View), Từ chối (Reject), Duyệt (Approve), Xóa mềm (Soft Delete). **Không có** nút Sửa trực tiếp nội dung để đảm bảo tính toàn vẹn thông tin.
- **APPROVED còn khóa không:** Có, bị khóa hoàn toàn không thể Sửa hay Xóa ở tất cả các cấp role.
- **Production GO/NO-GO:** **NO-GO** (Cần xác nhận UAT trên trình duyệt thật sự).

## B. Root cause
- **UI Guard:** Nút Sửa/Xóa bị bọc hoàn toàn bởi logic `if (status === 'DRAFT' || status === 'REJECTED')` ở bên ngoài. Nên status `SUBMITTED` làm cho các nút này ẩn với tất cả các role kể cả Admin.
- **Server Guard:** Hàm `canSoftDeleteReport` cũng không hỗ trợ status `SUBMITTED` trong phiên bản cũ, dẫn đến việc Admin có gọi API cũng sẽ bị chặn.

## C. Policy matrix after fix
| Status | Admin/Director edit | Admin/Director soft delete | Admin/Director approve/reject | Lower-role creator edit | Lower-role creator delete |
| ------ | ------------------- | -------------------------- | ----------------------------- | ----------------------- | ------------------------- |
| **DRAFT** | Yes | Yes | No | Yes | No |
| **REJECTED** | Yes | Yes | No | Yes | No |
| **SUBMITTED** | **No** (Direct edit blocked) | **Yes** | Yes | No | No |
| **APPROVED** | No | No | No | No | No |
| **CANCELLED/LOCKED** | No | No | No | No | No |

## D. UI result
- **Table** (`reports-table.tsx`): Đã tách điều kiện hiển thị nút Edit và Delete. Nút Delete nay hiển thị cho Admin ở cả trạng thái `SUBMITTED`.
- **Drawer** (`report-detail-drawer.tsx`): Bổ sung hiển thị nút Xóa (nằm cạnh Sửa/Duyệt/Từ chối) cho Admin với báo cáo `SUBMITTED`.
- **Mobile** (`reports-mobile-cards.tsx`): Tương tự Table và Drawer, cập nhật logic hiển thị.

## E. Browser UAT
- **Admin/Director:** Browser NOT VERIFIED (nhưng server auth & UI component logic đã map chính xác 100%). Admin sẽ thấy Xóa ở `DRAFT`, `REJECTED`, `SUBMITTED` và không thấy gì nguy hiểm ở `APPROVED`.
- **Lower-role:** Lower-role browser UAT NOT VERIFIED — no test account available. (Chỉ huy trưởng chỉ thấy Sửa ở `DRAFT`/`REJECTED` do mình tạo và không bao giờ thấy nút Xóa).

## F. Test/build
| Lệnh | Kết quả |
| ---- | ------- |
| `npx tsx scripts/test-reports-r3b-admin-actions.ts` | **PASS** |
| `npx prisma validate` | **PASS** |
| `npx prisma generate` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npx eslint ...` | **PASS** |
| `npm run build` | **PASS** |

## G. Risks remaining
- **Project-level RBAC:** Chưa làm.
- **Withdraw/Cancel:** Chưa làm.
- **R2/R5:** Chưa implement.

## H. Confirmation
- [x] Không commit
- [x] Không push
- [x] Không reset DB
- [x] Không hard delete dữ liệu thật
- [x] Không cleanup storage
- [x] Không tạo migration
