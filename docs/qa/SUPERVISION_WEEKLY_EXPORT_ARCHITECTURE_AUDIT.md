# Supervision Weekly Export Architecture Audit

## 1. Vị trí và Hiện trạng Dữ liệu

| Vị trí dữ liệu | Prisma field | Canonical field | Preview | DOCX | XLSX | PDF | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ID Hồ sơ | `id` | `metadata.dossierId` | Có | Có | Có | Có | Đã có |
| Tên công ty | N/A (Hardcode) | `metadata.companyName` | Không | Lỗi thiếu | Lỗi thiếu | Không | Cần bổ sung |
| Quốc hiệu | N/A (Hardcode) | `metadata.nationalMotto` | Không | Lệch | Mất | Không | Cần format |
| Số báo cáo | `reportNumber` | `metadata.reportNumber` | Có | Có | Lệch | Có | Cần chuẩn hóa |
| Nơi lập, Ngày | `place`, Date | `metadata.issueDate` | Có | Lỗi | Lỗi | Có | Đang ISO |
| Tiêu đề | N/A (Dựa type) | `metadata.title` | Có | Có | Có | Có | Tạm ổn |
| Kính gửi | `recipientName` | `metadata.recipientName` | Không | Lỗi thiếu | Lỗi thiếu | Có | Cần ghép |
| Chức vụ | `recipientTitle` | `metadata.recipientTitle` | Không | Lỗi thiếu | Lỗi thiếu | Có | Cần ghép |
| Kỳ báo cáo | `weekStart`, `weekEnd` | `metadata.period` | Có | Sai format | Sai format | Có | Cần format |
| Lịch Mục I | `entries` | `schedule` | Không đủ | Lỗi thiếu 7 ngày| Dữ liệu raw | Không đủ | Sai kiến trúc (thiếu ngày rỗng) |
| Cột Thời gian | `entryDate`, `shift` | `schedule[x].shifts[y]`| Lỗi lặp | Sai 2 cột Ngày/Buổi| Lỗi raw | Lỗi lặp | Phải gộp Sáng/Chiều/Tối |
| Cột Công trình | `projectNameSnapshot` | `sourceText` | Có | Lỗi chuỗi | Lỗi chuỗi | Có | Cần phân dòng rõ ràng |
| Cột Hạng mục | `categoryNameSnapshot`| `sourceText` | Có | Lỗi chuỗi | Lỗi chuỗi | Có | Cần phân dòng rõ ràng |
| Nội dung KT | `inspectionContent` | `content` | Có | Có | Có | Có | Nullable |
| Kết quả | `result` | `result` | Có | Có | Có | Có | Nullable |
| Mục II (KL) | `transitions` | `transitionRows` | Có | Có | Sang sheet mới | Có | XLSX bị sai cấu trúc |
| Mục III (KL) | `quantities` | `quantityRows` | Có | Có | Sang sheet mới | Có | XLSX bị sai cấu trúc |
| Mục IV (TĐ) | `progressRows` | `progressRows` | Có | Có | Sang sheet mới | Có | XLSX bị sai cấu trúc |
| Chữ ký | `createdBy.name` | `signature.signerName`| Có | Thiếu Ký Tên | Thiếu Khối ký | Có | Word/Excel đang hỏng khối ký |

## 2. Nguyên nhân Lỗi
- **Word sai khổ giấy**: Dùng sai cấu hình `convertMillimetersToTwip` hoặc không set explicit orientation cho Sections đúng cách, bỏ quên bảng thông tin hành chính 2 cột (Công ty / Quốc hiệu).
- **Excel chia nhiều sheet**: Sử dụng `XLSX.utils.aoa_to_sheet` tách biệt cho mỗi bảng dữ liệu thay vì vẽ toàn bộ báo cáo lên chung một vùng tọa độ (grid) của 1 sheet như một form báo cáo thật.
- **Word thiếu cả tuần**: Chỉ filter những `entries` có dữ liệu rồi loop qua `new docx.TableRow()`, thay vì tạo sẵn khung 7 ngày (Thứ 2 -> CN) x 3 buổi (Sáng, Chiều, Tối).
- **Thứ tự mục sai**: Logic mapper của DOCX/XLSX hoàn toàn độc lập với Preview (tự code tay lại bằng `map()`), dẫn đến không đồng nhất với luồng xem trước gốc.

## 3. Hướng Giải Quyết Kiến Trúc Mới
1. **Model Chuẩn (`DocumentModel`)**: Tạo mapper `buildWeeklyResultDocument(dossier)` trả về object thuần đã nhào nặn đủ 7 ngày x 3 buổi, mọi field rỗng thành string rỗng, null-safe 100%.
2. **Word (`export-docx.ts`)**: Render từ `DocumentModel`. Vẽ bảng CÔNG TY - CỘNG HÒA bằng Table không viền. Render 7 ngày x 3 buổi thành các TableRow, ô buổi gộp row nếu nhiều công việc.
3. **Excel (`export-xlsx.ts`)**: Bỏ chia sheet. Vẽ báo cáo từ A1 đến cuối cùng bằng mảng 2 chiều khổng lồ chứa toàn bộ title, metadata, bảng Mục I, Mục II, Mục III, Mục IV và chữ ký nối tiếp nhau.
4. **PDF/Preview**: Update `weekly-print-template.tsx` để render trực tiếp từ `DocumentModel` thay vì tự loop `dossier.entries`.
