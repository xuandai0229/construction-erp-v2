# FULL SYSTEM AUDIT ROUND 2 (CRITICAL REVIEW)

## 1. Đánh giá Báo cáo Audit Vòng 1
Quá trình phản biện (Audit Vòng 2) cho thấy Báo cáo Vòng 1 có những điểm thiếu sót sau:
- **Kết luận quá sớm**: Vòng 1 kết luận "Hệ thống KHÔNG CÓ LỖI CRITICAL" và "GO cho Production". Đây là kết luận sai. Lỗi RBAC tại module Reports không chỉ là lỗi "Horizontal Privilege Escalation" bình thường, mà thực tế nó **phá vỡ hoàn toàn luồng cộng tác** (collaborators trong cùng một dự án không thể xem báo cáo hay tải file của nhau nếu họ không phải là Admin). Đây phải được xếp loại là lỗi **CRITICAL (Blocker)** cho môi trường Production thực tế.
- **Thiếu bằng chứng**: Vòng 1 mới chỉ dựa vào kết quả quét bằng `git ls-files` và xem lướt một vài file mà không đối chiếu chéo (cross-reference) giữa Backend API và Database Schema.
- **Bỏ sót nhóm file**: Vòng 1 đã bỏ sót các route tải/preview file đính kèm (`[attachmentId]/route.ts`) và lịch sử báo cáo (`history/route.ts`).

## 2. Bảng đối chiếu File/Nhóm file (Review)
| Nhóm File | Đã đọc kỹ | Vai trò | Tương tác hệ thống | Rủi ro nếu bỏ sót (Impact) |
|---|---|---|---|---|
| `reports/actions.ts` | CÓ | CRUD Reports, phân trang, duyệt báo cáo | Server Actions, DB Query | **Rất cao (CRITICAL)**. Phân quyền cứng ngắc khiến team công trường không thấy báo cáo của nhau. |
| `api/reports/.../route.ts` | CÓ | Upload, Download, History API | API Routes, File System | **Rất cao (CRITICAL)**. View/Download sẽ trả về 403 Forbidden cho thành viên cùng dự án do kiểm tra sai Creator. |
| `reports/types.ts` | CÓ | Định nghĩa TypeScript Interfaces | Types / DTOs | **Thấp**. Đang dùng `any` ở một số chỗ, cần mapping lại với Prisma. |
| `reports/create-report-dialog.tsx`| CÓ | UI Nhập liệu Báo cáo | UI Components | **Vừa**. Còn dính `eslint-disable`, tiềm ẩn Tech Debt nhưng đã pass build. |
| `lib/reports/report-workflow-policy.ts`| CÓ | Workflow duyệt/sửa | Logic / Policy | **Vừa**. Đã đọc kỹ, rules transition an toàn. |
| `lib/rbac.ts` | CÓ | Kiểm tra quyền User tại Project | Core Auth | **Cao**. Hàm `requireProjectAccess` không được import để sử dụng trong Reports. |

## 3. Deep Dive Module Reports (Kiểm tra riêng)
- **Actions (`reports/actions.ts`)**: Hàm `getSiteReports` và `getSiteReportsPage` đang hardcode logic: `if (!isSystemAdmin) { where.createdById = session.id; }`. Điều này có nghĩa là Kỹ sư A và Chỉ huy trưởng B (không phải Admin hệ thống) làm cùng một dự án nhưng không thể nhìn thấy báo cáo của nhau. -> **Lỗi CRITICAL về nghiệp vụ**.
- **API Routes**: Tại `api/reports/attachments/[attachmentId]/route.ts` (Dòng 53), logic kiểm tra là `if (!isCreator && !isSystemAdmin) return new NextResponse("Forbidden");`. Lỗi này đồng nghĩa với việc dù người quản lý (Commander) bằng cách nào đó có được link của báo cáo, họ cũng không thể tải file đính kèm hay xem ảnh. -> **Lỗi CRITICAL về Data Access**.
- **Components & Types**: File `create-report-dialog.tsx` rất lớn (39KB), chứa nhiều state phức tạp và sử dụng `any` cho `initialReport` (dòng 47). Không làm sập hệ thống nhưng khó bảo trì.
- **Upload/Download Attachments**: Đã kiểm tra File System. Tốt ở điểm có kiểm tra Magic Bytes (chống mã độc) và giới hạn dung lượng (20MB/file). Tuy nhiên lại quá nghiêm ngặt với người trong cùng dự án.
- **Direct URL Access**: Chống được việc truy cập trực tiếp bằng ID (403 Forbidden) do có RBAC chặn ở mức API.
- **Project-level RBAC**: Mô đun Reports hiện đang **HOÀN TOÀN THIẾU** sự liên kết với bảng `ProjectMember`. Tất cả các TODO comment đều yêu cầu implement ProjectUser nhưng chưa ai làm.

## 4. Kết luận Go/No-Go (Viết lại)

- **GO cho UAT Nội bộ (Single Admin/Tester): CÓ (GO)**. Hệ thống sẽ chạy hoàn hảo nếu người test dùng tài khoản Admin hoặc chỉ test chức năng cá nhân. Giao diện đẹp, logic lưu lượng ổn định.
- **GO cho Production thật (Multi-user/Team): KHÔNG (NO-GO)**. Lỗi RBAC tại module Reports sẽ ngăn cản các thành viên trong cùng công trình phối hợp công việc.

### Những lỗi BẮT BUỘC phải fix trước Production:
1. Sửa hàm `getSiteReports` và `getSiteReportsPage` trong `reports/actions.ts`: Thay vì `where.createdById = session.id`, phải join với bảng `projectMembers` để kiểm tra quyền truy cập công trình của Session User.
2. Sửa các file API route (như `attachments/route.ts`, `attachments/[attachmentId]/route.ts`, `history/route.ts`): Bổ sung kiểm tra `canAccessProject` từ `lib/rbac.ts` thay vì chỉ kiểm tra quyền Creator.
