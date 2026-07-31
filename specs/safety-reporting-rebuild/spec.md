# HỒ SƠ YÊU CẦU NGHIỆP VỤ & ĐẶC TẢ TÍNH NĂNG (SPECIFICATION)
## PHẦN BÁO CÁO ATLĐ • PCCC • VSMT HÀNG TUẦN (MẪU CÔNG TY CỐ ĐỊNH)

---

### 1. TỔNG QUAN
Phân hệ Báo cáo **ATLĐ • PCCC • VSMT** được thiết kế độc lập 100% để phục vụ cán bộ chuyên trách kiểm tra an toàn lao động, phòng cháy chữa cháy và vệ sinh môi trường tại các công trường thi công của Công ty CP Xây dựng và Thương mại số 2 Hà Nội.

Phân hệ tập trung hoàn toàn vào 02 biểu mẫu cốt lõi:
1. **Mẫu 02:** Kế hoạch kiểm tra ATLĐ, PCCC, VSMT công trình hàng tuần.
2. **Mẫu 01:** Báo cáo tự đánh giá kết quả kiểm tra AT, VSLĐ.

---

### 2. QUY TẮC ĐỘC LẬP & VỊ TRÍ HỆ THỐNG
- **Vị trí UI:** Nằm trong khu vực **"BÁO CÁO CÔNG TRÌNH"** tại đường dẫn chính `/reports/safety`.
- **Card Đòn bẩy tại `/reports`:** Lựa chọn thứ ba song song với "Báo cáo hiện trường" và "Kiểm tra và kế hoạch tuần".
- **Giao diện 2 Hồ sơ:** Tại `/reports/safety`, chỉ hiển thị 2 thẻ chọn duy nhất (Kế hoạch tuần & Báo cáo tự đánh giá), không hiển thị dashboard phức tạp, không checklist hiện trường cồng kềnh.
- **Độc lập dữ liệu:** Tuyệt đối không import, kế thừa hay sửa đổi bất kỳ model/component nào của `Supervision*` (Giám sát).

---

### 3. VAI TRÒ & PHÂN QUYỀN (RBAC)
- **Tên chức vụ mới:** Cán bộ ATLĐ, PCCC và VSMT (`SAFETY_OFFICER` hoặc phân quyền theo bảng UserRole).
- **ADMIN / DIRECTOR / DEPUTY_DIRECTOR:** Toàn quyền hệ thống (Tạo, Sửa, Trình duyệt, Duyệt, Yêu cầu chỉnh sửa, Hủy, Xuất Word/PDF).
- **SAFETY_OFFICER / CONSTRUCTION_SUPERVISOR:** Tạo hồ sơ, Sửa bản nháp, Xóa bản nháp chưa trình, Trình duyệt, Xem trước, Xuất Word/PDF. Không có quyền tự duyệt hồ sơ của mình hoặc sửa hồ sơ đã duyệt.

---

### 4. LUỒNG TRẠNG THÁI HỒ SƠ & PHÂN CẤP XÓA
- **Trạng thái:** `Bản nháp` (`DRAFT`) ➔ `Chờ duyệt` (`PENDING_APPROVAL`) ➔ `Đã duyệt` (`APPROVED`) / `Yêu cầu chỉnh sửa` (`REVISION_REQUIRED`) ➔ `Đã hủy` (`CANCELLED`).
- **Quy tắc xóa bản nháp:** Chỉ được xóa bản nháp chưa từng trình duyệt (hard-delete an toàn với confirmation).
- **Quy tắc hủy hồ sơ đã trình/duyệt:** Tuyệt đối không xóa vật lý (hard-delete). Bắt buộc hủy (`CANCELLED`) kèm lý do hủy và lưu giữ toàn bộ audit log & lịch sử duyệt.

---

### 5. XUẤT BÁO CÁO VÀ PREVIEW CHUẨN GOLDEN MASTER 100%
- **Xem trước (Preview):** Hiển thị trực tiếp file PDF được chuyển đổi từ chính file DOCX tạo ra từ Golden Master Word template (`01-Bao cao...docx` và `02-Ke hoach...docx`).
- **Tải file:** Tải xuống file DOCX hoặc PDF được sinh ra từ cùng 1 pipeline render duy nhất.
- **Bảo toàn định dạng:** Giữ nguyên font, cỡ chữ, căn lề, border bảng, header/footer, quốc hiệu tiêu ngữ và vị trí ký tên theo đúng 100% bản mẫu Công ty.
