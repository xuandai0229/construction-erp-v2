# R3B ROLE-BASED EDIT/DELETE POLICY REPORT

## A. Executive Summary
- **R3b role policy:** PASS WITH RISKS
- **Rule sửa/xóa mới:** 
  - `DRAFT` / `REJECTED`: được sửa theo quyền (Người tạo hoặc Quyền cao).
  - `DRAFT` / `REJECTED`: chỉ Admin/Director/Quyền cao được xóa mềm.
  - Cấp dưới KHÔNG được xóa báo cáo, kể cả báo cáo do chính mình tạo.
  - Báo cáo `SUBMITTED`, `APPROVED`, `CANCELLED`, `LOCKED` bị chặn tuyệt đối cả sửa và xóa.
- **Admin/Director làm được gì:** Sửa và xóa mềm mọi báo cáo `DRAFT` / `REJECTED`.
- **Chỉ huy trưởng/cấp dưới làm được gì:** Chỉ được sửa báo cáo `DRAFT` / `REJECTED` do chính mình tạo. Không được xóa. Không được sửa báo cáo của người khác.
- **Project-level RBAC:** Chưa implement trong phase này, nhưng hệ thống role hiện tại tương thích và không phá vỡ logic tương lai.
- **Production GO/NO-GO:** **NO-GO** (Cần xác nhận UAT trên trình duyệt thật sự).

## B. Role mapping
| Role trong DB | Nhóm nghiệp vụ |
| ------------- | -------------- |
| `ADMIN` | Quyền cao |
| `DIRECTOR` | Quyền cao |
| `DEPUTY_DIRECTOR` | Quyền cao |
| `CHIEF_COMMANDER` | Chỉ huy trưởng/cấp dưới |
| `MANAGER` | Chỉ huy trưởng/cấp dưới |
| `ENGINEER` | Chỉ huy trưởng/cấp dưới |
| `ACCOUNTANT` | Chỉ huy trưởng/cấp dưới |
| `STAFF` | Chỉ huy trưởng/cấp dưới |

## C. Policy matrix
| Status | Admin/Director edit | Admin/Director delete | Lower-role creator edit | Lower-role creator delete |
| ------ | ------------------- | --------------------- | ----------------------- | ------------------------- |
| **DRAFT** | Yes | Yes | Yes | No |
| **REJECTED** | Yes | Yes | Yes | No |
| **SUBMITTED** | No | No | No | No |
| **APPROVED** | No | No | No | No |
| **LOCKED** | No | No | No | No |
| **DELETED** | No | No | No | No |

## D. Server enforcement
- `updateSiteReport`: Sử dụng `canEditReportContent`.
- `softDeleteSiteReport`: Sử dụng `canSoftDeleteReport`.
- Status guard: Chặn tuyệt đối trạng thái không thuộc `DRAFT` / `REJECTED` hoặc đã `deletedAt`.
- Role guard: Kiểm tra bằng role từ Database của session user.
- AuditLog: Đã cấu hình đẩy đủ (`SITE_REPORT_UPDATED` & `SITE_REPORT_SOFT_DELETED`).

## E. UI result
- **Table** (`reports-table.tsx`): Kiểm tra riêng biệt quyền hiện nút Edit/Delete (Delete bị giới hạn chặt hơn).
- **Drawer** (`report-detail-drawer.tsx`): Ẩn hoàn toàn nút Xóa nếu role thấp, hiện đủ 2 nút nếu role cao. Confirm dialog trình duyệt hoạt động cho nút Xóa.
- **Mobile** (`reports-mobile-cards.tsx`): Đồng bộ logic của Drawer và Table.

## F. Browser UAT
- **Admin/Director:** Browser NOT VERIFIED — subagent not used
- **Lower-role:** Lower-role browser UAT NOT VERIFIED — no test account available

## G. Test/build
| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx tsx scripts/test-reports-r3b-role-policy.ts` | **PASS** | Script tự tạo account ENGINEER test pass |
| `npx prisma validate` | **PASS** | Schema không lỗi |
| `npx prisma generate` | **PASS** | Client updated |
| `npx tsc --noEmit` | **PASS** | Type-safe |
| `npx eslint ...` | **PASS** | Không warning/error logic |
| `npm run build` | **PASS** | NextJS build thành công |

## H. Next phase note
Chưa làm project-level RBAC ở phase này, sau này cần:
- Admin/Director được xem và chỉnh sửa trên toàn bộ công trình.
- Chỉ huy trưởng chỉ được phép thao tác/xem trên 1 hoặc nhiều công trình được giao.
- Không cho phép người chưa được assign xem dữ liệu toàn cục.

## I. Risks remaining
- **Project-level RBAC:** Chưa làm.
- **Withdraw/Cancel:** Chưa làm.
- **R2 weekly source linkage:** Chưa làm.
- **R5 storage cleanup:** Chưa dọn rác storage cho báo cáo soft-deleted.
- **25 attachment missing file cũ:** Vẫn tồn đọng chưa cleanup.

## J. Confirmation
- [x] Không commit
- [x] Không push
- [x] Không reset DB
- [x] Không hard delete dữ liệu thật
- [x] Không cleanup storage
- [x] Không tạo migration
