# BÁO CÁO KIỂM KÊ HIỆN TRẠNG (PHASE 0) - GỠ BỎ PHÂN HỆ GIÁM SÁT

## 1. Kiểm kê file

| File/Thư mục | Chức năng | Thuộc nghiệp vụ Giám sát | Thuộc tài khoản | Hành động | Lý do |
| --- | --- | --- | --- | --- | --- |
| `src/app/(dashboard)/supervision/**` | Toàn bộ route/page của Giám sát | Có | Không | XÓA | Không tái sử dụng |
| `src/components/supervision/**` | UI components riêng biệt cho Giám sát | Có | Không | XÓA | Không dùng chung |
| `src/lib/supervision/**` | Logic xử lý, export docx của Giám sát | Có | Không | XÓA | Logic nghiệp vụ sẽ bị bỏ |
| `src/app/api/supervision/**` | API Endpoint cho Giám sát | Có | Không | XÓA | API không còn cần thiết |
| `docs/qa/*SUPERVISION*` | Báo cáo QA và tài liệu lịch sử | Có | Không | CHUYỂN VÀO ARCHIVE | Lưu trữ lịch sử |
| `prisma/schema.prisma` | Cấu trúc CSDL | Có | Có | GIỮ | Sẽ có phương án xử lý (migration) sau. Giữ nguyên để tránh drift. |
| `prisma/migrations/**` | Lịch sử Database | Có | Có | GIỮ | Lịch sử DB, không được xoá |
| `src/components/layout/sidebar.tsx` | Menu điều hướng | Có (Menu) | Không | SỬA | Xóa menu Giám sát |
| `src/lib/navigation-permissions.ts` | Phân quyền route/menu | Có | Có (Role) | SỬA | Xóa navigation của Giám sát, giữ role SUPERVISION_HEAD |
| `src/lib/roles/role-registry.ts` | Khai báo Role | Không | Có | GIỮ | Giữ Role Trưởng ban giám sát |
| `src/lib/rbac.ts` | Role based access control | Không | Có | GIỮ | Tránh lỗi cho tài khoản cũ |
| `src/components/users/**` | UI quản lý tài khoản | Không | Có | GIỮ | Không can thiệp module khác |
| `src/app/(dashboard)/users/**` | Route User Management | Không | Có | GIỮ | Không can thiệp module khác |
| `src/components/layout/app-shell.tsx` | App shell wrapper | Không | Không | SỬA (nếu có) | Xóa query liên quan Giám sát nếu có |

## 2. Kiểm kê route

| Route | File triển khai | Có mutation khi render | Đang có menu | Hành động |
| --- | --- | --- | --- | --- |
| `/supervision` | `src/app/(dashboard)/supervision/page.tsx` | Có thể | Có | XÓA |
| `/supervision/journal` | `src/app/(dashboard)/supervision/journal/page.tsx` | Không | Có | XÓA |
| `/supervision/findings` | `src/app/(dashboard)/supervision/findings/page.tsx` | Không | Có | XÓA |
| `/supervision/weekly-reports` | `src/app/(dashboard)/supervision/weekly-reports/page.tsx` | Không | Có | XÓA |
| `/supervision/weekly-reports/[id]` | `src/app/(dashboard)/supervision/weekly-reports/[id]/page.tsx` | Không | Không | XÓA |

## 3. Kiểm kê import phụ thuộc (Dependency Graph)

Các file đang import `supervision` bên ngoài module giám sát:
- `src/app/(dashboard)/users/actions.ts` -> Import Role/Scope (GIỮ)
- `src/app/(dashboard)/users/page.tsx` -> Import Role/Scope (GIỮ)
- `src/components/layout/mobile-bottom-nav.tsx` -> Import link supervision (XÓA link)
- `src/components/layout/sidebar.tsx` -> Import link/menu (XÓA link)
- `src/components/users/user-management-client.tsx` -> Import Role (GIỮ)
- `src/lib/navigation-permissions.ts` -> Khai báo navigation (XÓA)
- `src/lib/rbac.ts` -> Khai báo role permissions (SỬA)
- `src/lib/roles/role-registry.ts` -> Khai báo SUPERVISION_HEAD (GIỮ)

## 4. Kiểm kê database (Model đếm bản ghi)

Các bảng sau được đánh dấu là `LEGACY` và giữ nguyên trạng thái không tác động tới data hiện tại:
- `SupervisionInspectionSchedule`: (Skipped count do môi trường local DB off) - LEGACY
- `SupervisionVisit`: (Skipped) - LEGACY
- `SupervisionFinding`: (Skipped) - LEGACY
- `SupervisionWeeklyPackage`: (Skipped) - LEGACY
- `SupervisionTransitionCheck`: (Skipped) - LEGACY
- `SupervisionQuantityVerification`: (Skipped) - LEGACY
- `SupervisionProgressAssessment`: (Skipped) - LEGACY
- `SupervisionAttachment`: (Skipped) - LEGACY
- `SupervisionWorkflowHistory`: (Skipped) - LEGACY
- `SupervisionPlanItem`: (Skipped) - LEGACY
- `SupervisionRecommendation`: (Skipped) - LEGACY

Các bảng sau thuộc phần Tài khoản được GIỮ NGUYÊN:
- `SupervisionScope`
- `SupervisionScopeProject`
