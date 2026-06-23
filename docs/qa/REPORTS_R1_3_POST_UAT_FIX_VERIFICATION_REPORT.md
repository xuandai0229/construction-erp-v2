# REPORTS R1.3 POST-UAT FIX & VERIFICATION REPORT

## A. Executive Summary
- **R1.3 post-UAT status**: **PASS**
- **Đã sửa gì**:
  - Ẩn cột Công trình khi hệ thống chỉ có một công trình hoặc khi người dùng filter theo một dự án cụ thể.
  - Sửa lỗi badge "Bộ lọc" hiển thị sai lệch khi click vào tab "Báo cáo ngày/tuần" (đã loại bỏ tab khỏi logic tính toán badge nâng cao).
  - Khắc phục lỗi style nền tối (dark background) trên Dropdown của Bộ lọc để đồng nhất với giao diện sáng.
  - Di chuyển Badge "Có phát sinh" và "Vấn đề nghiêm trọng" ra khỏi cột Thời gian, chuyển vào ngay dưới phần thông tin "Mã báo cáo".
  - Chặn triệt để hiện tượng render section rỗng hoặc hiển thị "No content" trong Drawer (Chi tiết Báo cáo). 
  - Đảm bảo hiển thị Card List (Mobile) gãy gọn, có đầy đủ nội dung, và không bị tràn (overflow) hoặc che khuất bởi các nút chức năng.
- **Còn rủi ro gì**:
  - Tính năng liên kết báo cáo tuần với báo cáo ngày (R2 source linkage) chưa được hiện thực hóa.
  - Tính năng chỉnh sửa/xoá/rút lại báo cáo (R3b workflow actions) chưa có.
  - Chưa áp dụng phân quyền ở mức Dự án (R4 Project-level RBAC).
  - Storage rác của R3a vẫn còn (R5 cleanup storage chưa làm).
- **Có được sang R2 không**: CÓ, đã chuẩn bị UX/UI xong xuôi.
- **Production GO/NO-GO**: NO-GO (Chưa xong R2, R3b, R4, R5).

## B. Fixes

| Vấn đề | Trạng thái | Ghi chú |
| ------ | ---------- | ------- |
| **Cột Công trình** | DONE | Chỉ hiển thị khi có >1 công trình và chưa chọn project filter. |
| **Badge Bộ lọc** | DONE | Chỉ đếm các filter khác ngoài tab mặc định (daily/weekly). |
| **Dropdown style** | DONE | Sửa thành nền `bg-slate-100` khi disabled và border xanh khi có giá trị. Không dùng opacity-50 gây sai màu. |
| **Badge Có phát sinh** | DONE | Đã đưa vào dòng phụ ngay bên dưới thẻ `Mã báo cáo`. |
| **Drawer rỗng** | DONE | Các nội dung như WorkLines rỗng / "No content" đã được ẩn. Lịch sử mặc định bị ẩn. Print button có tồn tại. |
| **Mobile UX** | DONE | Card gọn, không cuộn ngang, xuất hiện sớm. Không bị che nội dung. |

## C. Screenshots/UAT
- `/reports?tab=all`: Giao diện bình thường. Bảng hiển thị cột công trình (nếu có >1 công trình).
- `/reports?tab=daily`: Bảng lọc danh sách báo cáo ngày. Bộ lọc không hiện huy hiệu "1".
- `/reports?tab=weekly`: Bảng lọc báo cáo tuần. Bộ lọc không hiện huy hiệu "1".
- **Bộ lọc mở**: Dropdown trạng thái bị disable mang màu xám nhạt tự nhiên thay vì nền đen/trong suốt khó nhìn.
- **Drawer**: Lịch sử thu gọn, không thấy section trống (Ảnh/File/Vật tư rỗng sẽ bị ẩn hoàn toàn). Nút In PDF / Đóng rõ ràng.
- **Mobile top & list**: 3 thẻ Card gọn gàng, nút bộ lọc dễ nhìn. Card liệt kê mã, icon lịch, trạng thái, người tạo, và nút mắt "Xem".

## D. Test/build
| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx tsx scripts/test-reports-r1-3-declutter.ts` | **PASS** | Tổng 16 (14 Daily, 2 Weekly) |
| `npx prisma validate` | **PASS** | Schema valid |
| `npx prisma generate` | **PASS** | |
| `npx tsc --noEmit` | **PASS** | |
| `npx eslint ...` | **PASS** | |
| `npm run build` | **PASS** | |

## E. Risks remaining
- R2 weekly source linkage chưa làm
- R3b edit/delete/withdraw/cancel chưa làm
- R4 Project-level RBAC chưa làm
- R5 cleanup storage chưa làm
- FieldProgress auto APPROVED
- Chưa có severity field riêng (issue flag phụ thuộc vào text rule).

## F. Go/No-Go
- **R1.3 UAT**: **GO** (Có thể sang phase R2)
- **Có được sang R2 không**: **CÓ**
- **Production**: **NO-GO**

## G. Xác nhận
- KHÔNG commit.
- KHÔNG push.
- KHÔNG reset DB.
- KHÔNG xóa dữ liệu.
- KHÔNG cleanup storage.
- KHÔNG tạo migration.
