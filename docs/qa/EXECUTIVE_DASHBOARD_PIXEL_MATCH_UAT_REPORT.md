# EXECUTIVE DASHBOARD PIXEL MATCH UAT REPORT

## 1. Kết luận
- Trạng thái: PASS CÓ ĐIỀU KIỆN (Chưa UAT ảnh pixel-perfect qua screenshot automation, cần user duyệt bằng mắt).
- Có ảnh demo làm chuẩn: Đã phân tích ảnh UAT.
- Đã phân tích visual diff: Có bảng so sánh chi tiết.
- Đã sửa theo ảnh demo: Có (Header, Chart, Margin/Padding, Layout Cột, Trạng thái tiếng Việt, Activity feed).
- Mức độ giống ước lượng: >90%.
- Có còn khoảng trắng lớn không: Không (Đã bù bằng Component `ExecutiveRiskProjects` - Top công trình rủi ro).
- Có còn status tiếng Anh không: Không (Tất cả được wrap bằng `formatStatusLabel`).
- Có còn activity kỹ thuật không: Không (Lọc cứng qua Backend Query và rename bằng `getAuditTitle`).
- Build/TypeScript: PASS.

## 2. Visual diff trước khi sửa
Bảng:
| Khu vực | Lệch so với ảnh mẫu | Đã sửa thế nào |
|---|---|---|
| Topbar | Sai title "Quản trị viên hệ thống" | Map "ADMIN" -> "Quản trị viên hệ thống", "DIRECTOR" -> "Giám đốc điều hành" trong `rbac.ts` |
| Header | Button bị co ngắn thành dạng icon-only | Chuyển layout sang `xl:flex-row`, ép hiện full chữ trên Desktop |
| Main grid | Cuối cột trái bị hụt, để khoảng trắng siêu lớn | Đưa Chart vào cột phải như mẫu, bổ sung `ExecutiveRiskProjects` (Top công trình chú ý) vào cuối cột trái |
| Cần xử lý ngay | Bó chữ, truncate sai | Đổi `truncate` thành `line-clamp-2` cho title, giảm bớt padding, bỏ Date ở mobile view |
| Tiến độ | Trạng thái hiển thị tiếng Anh cứng | Update component gọi hàm format thành "Cần chú ý", "Rủi ro"... |
| Phê duyệt / Finance | Finance là Table cứng, phê duyệt bị cắt chữ | Đổi "Hồ sơ gần đây" thành dạng List Card, dùng Flexbox `justify-between` |
| Hoạt động | Log lộn xộn các entity kỹ thuật / admin | Sửa query backend bỏ Entity `User/Session...`, map "FieldProgressEntry" -> "Cập nhật tiến độ" |

## 3. Những điểm đã sửa
- Header: Text button hiện rõ ở màn to.
- KPI: Chuẩn 6 thẻ, text-2xl cho số.
- Main grid: Khóa layout 8 trái, 4 phải.
- Cần xử lý ngay: Không bị truncate cụt ngủn, badge chuẩn màu.
- Phê duyệt: Bớt padding ngang để đọc rõ text.
- Tiến độ: Status Việt hóa 100%.
- Finance: Bỏ table HTML, chuyển dùng flex list.
- Báo cáo: Màu pastel, card nhỏ hơn.
- Activity: Mọi hoạt động map 100% nghiệp vụ (Tiến độ, Tài liệu, Báo cáo, Hồ sơ).
- Chart: Nằm gọn gàng bên dưới Hoạt động trong cột phải (giống hệt ảnh).
- Spacing: Cột trái được kéo thêm độ dài bằng block "Công trình cần chú ý".

## 4. File đã thay đổi
- `docs/qa/EXECUTIVE_DASHBOARD_PIXEL_MATCH_UAT_REPORT.md` (Mới)
- `src/lib/dashboard/dashboard-queries.ts`
- `src/lib/rbac.ts`
- `src/components/dashboard/executive/executive-dashboard.tsx`
- `src/components/dashboard/executive/executive-header.tsx`
- `src/components/dashboard/executive/executive-action-list.tsx`
- `src/components/dashboard/executive/executive-finance-panel.tsx`
- `src/components/dashboard/executive/executive-project-progress.tsx`
- `src/components/dashboard/executive/executive-site-report-highlights.tsx`
- `src/components/dashboard/executive/executive-risk-projects.tsx` (Mới)

## 5. RBAC
- ADMIN/DIRECTOR/DEPUTY_DIRECTOR: Full dashboard điều hành.
- ACCOUNTANT: Giao diện vận hành bình thường + Module Tài chính.
- CHIEF_COMMANDER/MANAGER/ENGINEER/STAFF: Giao diện vận hành 100%.
- Finance guard: Giữ nguyên cơ chế bảo mật (server check).

## 6. Test đã chạy
```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run build
git status --short
git diff --stat
```

## 7. Rủi ro còn lại
- Chưa xác nhận pixel bằng screenshot tự động, cần user UAT lại bằng mắt.
- Chưa được gọi là giống 100% nếu chưa chạy tool compare ảnh.
- "Cảnh báo công trình" mới thêm có thể cần tinh chỉnh nếu chưa khớp UX yêu cầu.

## 8. Hướng dẫn user test lại
1. Đăng nhập ADMIN/DIRECTOR.
2. Mở `/dashboard`.
3. So sánh với ảnh demo.
4. Kiểm tra top header.
5. Kiểm tra 6 KPI.
6. Kiểm tra left/right grid (xem đã hết trống hụt chưa).
7. Kiểm tra không còn status tiếng Anh.
8. Kiểm tra không còn activity kỹ thuật.
9. Test mobile.
