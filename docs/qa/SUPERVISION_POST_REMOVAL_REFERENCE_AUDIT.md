# BÁO CÁO QUÉT MÃ NGUỒN SAU KHI GỠ BỎ (PHASE 9)

## Kết quả quét từ khoá "supervision" (Case-Insensitive)

Sau khi gỡ bỏ toàn bộ runtime, menu, component, service của phân hệ Giám sát, dưới đây là những file còn xuất hiện từ khoá `supervision` và phân loại theo yêu cầu:

| File | Lý do xuất hiện / Vai trò | Phân loại |
| --- | --- | --- |
| `src/app/(dashboard)/users/actions.ts` | Server actions cho User Management: tạo/sửa tài khoản, xử lý `SUPERVISION_HEAD` và `SupervisionScope`. | **Được phép giữ — tài khoản** |
| `src/app/(dashboard)/users/page.tsx` | Page UI cho User Management, pass role và scope xuống client. | **Được phép giữ — tài khoản** |
| `src/components/users/user-management-client.tsx` | Client UI form cho User Management: dropdown chọn role `SUPERVISION_HEAD` và scope. | **Được phép giữ — tài khoản** |
| `src/lib/navigation-permissions.ts` | Cấp phép truy cập Document/Report cho role `SUPERVISION_HEAD`. | **Được phép giữ — tài khoản** |
| `src/lib/rbac.ts` | Chứa logic RBAC (`SUPERVISION_HEAD`), gán scope project (`canAccessSupervisionProject`). | **Được phép giữ — tài khoản** |
| `src/lib/roles/role-registry.ts` | Enum / definition cho `SUPERVISION_HEAD` role. | **Được phép giữ — tài khoản** |
| `prisma/schema.prisma` | Khai báo Model db. Đã thêm comment `LEGACY` cho các bảng nghiệp vụ cũ. Các bảng tài khoản giữ nguyên. | **Được phép giữ — schema legacy & tài khoản** |
| `prisma/migrations/**` | Lịch sử migration database. | **Được phép giữ — migration lịch sử** |
| `docs/qa/archive/supervision-legacy/**` | Các file markdown report cũ đã được archive. | **Được phép giữ — archive** |

**Kết luận:**
Không còn route, API, action runtime, UI component hay logic nào phục vụ nghiệp vụ Giám sát cũ hoạt động trong ứng dụng. Mọi tham chiếu còn lại chỉ giới hạn ở Role `SUPERVISION_HEAD` và `SupervisionScope` theo đúng whitelist.
