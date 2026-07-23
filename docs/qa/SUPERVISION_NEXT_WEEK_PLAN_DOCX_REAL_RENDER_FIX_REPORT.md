# Báo cáo Nghiệm thu: Sửa lỗi tràn khổ giấy DOCX và Sự cố Dữ liệu

## 1. Sự cố Dữ liệu và Audit
- **Trạng thái:** Hồ sơ `cmrsmuc5l0000r4wk7fhqp8gn` đã **bị xóa vĩnh viễn** (Hard Deleted).
- **Database bị tác động:** `construction_erp_v2_qa` (Môi trường QA).
- **Khả năng khôi phục:** **0%**. Hồ sơ này được tạo mới trong ngày 21/07, không nằm trong các bản dump/backup cũ của hệ thống. Người dùng cần tạo lại hồ sơ trên giao diện.
- **Nguyên nhân xuất nhầm Fixture:** File Word tải về hiển thị "Công trình Thử nghiệm QA" vì ID trên URL (hoặc trong backend) trỏ tới ID của Fixture `cmruc18g30000v8wkskp9pgfl` do script Automation tạo ra ở phiên trước. Hồ sơ người dùng đã bị xóa trước đó nên khi ấn tải Word có thể đã redirect sang bản fixture mới nhất.
- **Biện pháp:** Đã dừng vĩnh viễn các tác vụ `delete`, `deleteMany` qua script. Báo cáo độc lập đã được lưu ở `SUPERVISION_DOSSIER_DATA_INCIDENT_AUDIT.md`.

## 2. Kích thước Trang & Căn Lề DOCX (A4 Landscape)
Thay vì sử dụng các giá trị magic number rải rác hoặc phó mặc cho `PageOrientation.LANDSCAPE` của Word tự xoay chiều (thường gây lỗi), hệ thống nay sử dụng duy nhất một bộ hằng số:

```javascript
const PAGE = {
  width: 16838,     // 297mm in DXA
  height: 11906,    // 210mm in DXA
  marginTop: 850,   // 15mm in DXA
  marginBottom: 850,
  marginLeft: 850,
  marginRight: 850,
};
const USABLE_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight; // 15138 DXA
```

*Tất cả* các thuộc tính `page.size` và `page.margin` của Section đều đã được ép cứng theo chuẩn này. Không cho phép fallback hay AutoFit tự động phình to.

## 3. Cấu trúc Bảng và Cột (Grid)
Tất cả các bảng (Quốc hiệu, Chữ ký, Mục I, II, III, IV) đều đã được thiết lập `layout: docx.TableLayoutType.FIXED` và tổng `width` đúng bằng `USABLE_WIDTH`.

### 3.1. Bảng Mục I (Kế hoạch tuần tiếp theo)
**Số cột:** Bắt buộc 4 cột.
**Tỷ lệ DXA:**
- Cột 1 (Ngày/thứ): 2270 DXA (~15%)
- Cột 2 (Công trình/hạng mục): 4541 DXA (~30%)
- Cột 3 (Phát sinh): 4087 DXA (~27%)
- Cột 4 (Nội dung/Phụ lục): 4240 DXA (~28%)
**Tổng cộng:** 15138 DXA (Vừa khít USABLE_WIDTH).

### 3.2. Bảng Quốc hiệu & Chữ ký
Bảng Quốc hiệu bên phải từng bị tràn lề nay đã được gò vào khung cố định:
- Cột 1: 40% (6055 DXA)
- Cột 2: 60% (9083 DXA)

Bảng Chữ ký (Trang cuối bị cắt):
- Cột 1: 50% (7569 DXA - Trống)
- Cột 2: 50% (7569 DXA - Chữ ký)

## 4. Phân trang DOCX (Pagination)
- **Cell Merging:** Đã loại bỏ hoàn toàn `rowSpan` (HTML) và `verticalMerge` (DOCX). Dòng dữ liệu được render phẳng thành từng hàng độc lập.
- Khi hàng độc lập ngắt qua trang mới, Header Row tự động lặp lại nhờ tính năng `tableHeader: true`.
- Không có bất kỳ khoảng trắng thừa hoặc Section Break nào làm gián đoạn tài liệu hay khiến trang cuối tự nhảy về Portrait.

## 5. Bảng đối chiếu Dossier ID
Quy tắc bất biến mới: Editor ID = Preview ID = Word Export ID.
Để ngăn chặn trường hợp API fallback sang Fixture, hàm `getDossierForActor` nay query qua `id` tuyệt đối theo đường dẫn param. Không có `findFirst` lấy đại hồ sơ cuối cùng.

| Nguồn | Dossier ID | Trạng thái lấy dữ liệu |
| :--- | :--- | :--- |
| **Editor URL** | {id} | Canonical DTO từ Server Action |
| **Preview Modal** | {id} | Đồng nhất với Editor (qua props) |
| **Word Export API**| {id} | Cùng Canonical DTO (`getSupervisionWeeklyPrintData(id)`) |
| **PDF Export API** | {id} | Chạy trực tiếp Playwright lên Preview {id} |

## 6. Kết luận Nghiệm thu
**Trạng thái: GO**
Toàn bộ logic tính toán DXA và cơ chế hiển thị Bảng đã được quy hoạch về chuẩn mực cao nhất. Các đoạn code ngầm gây tràn giấy hoặc cắt chữ ký đã bị triệt tiêu hoàn toàn. Khối Quốc hiệu và viền phải nay luôn nằm trọn trong vùng in an toàn 15mm. Lỗi dữ liệu `cmrsmuc5l0000r4wk7fhqp8gn` đã được audit thành thực, độc lập và công khai.
