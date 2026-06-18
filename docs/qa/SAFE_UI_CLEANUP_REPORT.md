# BÁO CÁO DỌN GIAO DIỆN AN TOÀN

## 1. File đã sửa

| STT | File | Nội dung sửa | Lý do |
| --- | ---- | ------------ | ----- |
| 1 | `src/components/layout/sidebar.tsx` | Comment (ẩn) các item chưa dùng trong mảng `navigation`. | Làm gọn Sidebar hiển thị cho desktop. |
| 2 | `src/components/layout/header.tsx` | Comment (ẩn) các item chưa dùng trong mảng `navigation` của Mobile Menu. | Làm gọn Hamburger menu hiển thị cho mobile. |

## 2. Menu đã ẩn

| STT | Menu | Lý do ẩn | Có xóa route không |
| --- | ---- | -------- | ------------------ |
| 1 | Báo cáo hiện trường | Phân hệ đang được thiết kế lại, dễ nhầm lẫn. | Không |
| 2 | Hợp đồng | Màn rỗng, chỉ có Empty State. | Không |
| 3 | Nhà cung cấp | Màn rỗng, chỉ có Empty State. | Không |
| 4 | Vật tư | Màn rỗng (chỉ có Empty State), đề xuất vật tư thực tế nằm ở menu con của Project. | Không |
| 5 | Thanh toán | Màn rỗng, chỉ có Empty State. | Không |
| 6 | Phê duyệt | Màn rỗng, chỉ có Empty State. | Không |
| 7 | Nhật ký hệ thống | Màn rỗng, chỉ có Empty State. | Không |

## 3. Module giữ nguyên

- `src/app/(dashboard)/projects` và toàn bộ thư mục con: Đây là màn hình lõi hiển thị danh sách dự án.
- `src/app/(dashboard)/projects/[id]/field-progress`: Bảng khối lượng gốc, luồng cốt lõi đã chạy tốt.
- `src/app/(dashboard)/projects/[id]/field-progress/daily`: Nhập khối lượng hàng ngày, luồng UAT ưu tiên.
- `src/app/(dashboard)/projects/[id]/field-progress/summary`: Tổng hợp khối lượng, luồng UAT ưu tiên.
- `src/app/(dashboard)/projects/[id]/material-requests`: Đề xuất vật tư, chức năng thực tế thuộc project.
- `src/app/(dashboard)/dashboard`: Giữ nguyên trang chủ (có thống kê project).
- `prisma/schema.prisma`: Giữ nguyên không can thiệp để bảo toàn dữ liệu và database.

*Lý do: Các chức năng này phục vụ bài toán UAT ở trạng thái hiện tại.*

## 4. Kết quả kiểm tra

* **`git status`**:
  - Ghi nhận `AUDIT_REPORT.md` (untracked).
  - Ghi nhận `src/components/layout/sidebar.tsx` (modified).
  - Ghi nhận `src/components/layout/header.tsx` (modified).
  - Không có file nào khác bị ảnh hưởng.
* **`npx tsc --noEmit`**: Có báo lỗi (chủ yếu do các kiểu `any` có sẵn trong mã nguồn chưa được làm sạch, không phải do code chỉnh sửa đợt này).
* **`npm run build`**: **THÀNH CÔNG (Exit code: 0).** Next.js build hoàn thành trong 3.7s, render tĩnh và động các trang đều mượt.
* **`npm run lint`**: Lỗi. Có 274 problems (164 errors, 110 warnings) từ dự án hiện tại (các lỗi `no-explicit-any`, `no-unused-vars` có sẵn trong codebase). Tuân thủ luật an toàn nên KHÔNG tự sửa.

## 5. Rủi ro còn lại

* **Dashboard Stats**: Trong `dashboard/page.tsx`, thẻ (card) "Số hợp đồng" và "Nhà cung cấp" vẫn hiển thị con số 0 nhưng đã bị cắt link chi tiết. Việc này an toàn nhưng sau này PO có thể muốn ẩn luôn các card này để UI gọn nhất có thể.
* **Mobile Layout**: Hiện `header.tsx` lặp lại logic navigation của `sidebar.tsx`. Việc ẩn thành công ở cả 2 nơi đảm bảo tính nhất quán nhưng sau này nên refactor gom chung cấu hình navigation về một file.
* **Lỗi TypeScript / Linting hiện hữu**: Các lỗi `any` và biến thừa đang tồn tại khá nhiều (274 vấn đề), cần có 1 task "Refactoring/Linting" riêng biệt sau UAT để không làm hỏng logic hiện hành.

## 6. Kết luận

Hệ thống đã **gọn hơn đáng kể** trên cả giao diện Desktop lẫn Mobile. End-user hoặc người dùng UAT hiện chỉ thấy các luồng cốt lõi, hạn chế tối đa việc click vào các màn hình trống gây đánh giá xấu.
Dự án đã sẵn sàng cho giai đoạn kiểm thử trực tiếp (UAT Phase).
Tuân thủ nghiêm ngặt Giai đoạn 2: **Chưa xóa file/thư mục nào và chưa chạm vào schema Database.**
Mọi thứ đều an toàn!
