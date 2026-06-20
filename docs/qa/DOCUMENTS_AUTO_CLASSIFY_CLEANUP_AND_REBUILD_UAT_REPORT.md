# Báo cáo Triển khai: Documents Auto-classify Cleanup & Rebuild UAT

## 1. Executive Summary
Sau khi phát hiện lỗi nhân đôi folder gốc và header hiển thị sai (`Tài liệu khác`), đã thực hiện dọn sạch toàn bộ dữ liệu QA test cũ, xóa 8 folder trùng, sửa lỗi root cause (đặt tên folder sai format), cải tiến thuật toán auto-classify để nhận diện cả 2 quy ước đặt tên, bổ sung badge phân loại hồ sơ trên File Card, và chạy lại test thành công 11/11 case.

## 2. Vấn đề trước khi cleanup

### 2.1 Folder trùng
- **Nguyên nhân gốc**: DB lưu folder gốc dạng underscore (`01_Hợp đồng`) nhưng seed script lần trước tạo folder mới dạng dot (`01. Hợp đồng`).
- **Hậu quả**: Sidebar Documents hiện 16 folder thay vì 8, người dùng nhầm lẫn.

### 2.2 Header fallback sai
- `getDocumentRule()` so khớp exact (`DOCUMENT_FOLDER_RULES["01_Hợp đồng"]`), nhưng auto-classify lại dùng `folderName.includes("01. Hợp đồng")`.
- Khi chọn folder `01_Hợp đồng`, header hiện đúng "Hồ sơ hợp đồng". Nhưng các file QA nằm ở folder `01. Hợp đồng` thì header fallback về `Tài liệu khác`.

### 2.3 Auto-classify không thấy rõ trên UI
- File Card chỉ hiện dung lượng + định dạng, không hiện badge phân loại hồ sơ.
- Người dùng không biết tính năng auto-classify đang hoạt động.

## 3. Dữ liệu QA đã xóa
- **27 document records** có prefix `QA_AUTO_` đã bị hard-delete khỏi DB.
- **27 file vật lý** trong `storage/projects/ct_01/documents/` đã bị xóa thành công.
- Không có dữ liệu thật nào bị ảnh hưởng.

## 4. Folder trùng đã xử lý

| Folder gốc (GIỮ) | Folder trùng (XÓA) | Real docs | Hành động |
|:---|:---|:---:|:---|
| `01_Hợp đồng` (cmq6...) | `01. Hợp đồng` (cmqlv6...) | 0 | Đã xóa |
| `02_Bản vẽ` | `02. Bản vẽ` | 0 | Đã xóa |
| `03_Dự toán` | `03. Dự toán` | 0 | Đã xóa |
| `04_Nghiệm thu` | `04. Nghiệm thu` | 0 | Đã xóa |
| `05_Hóa đơn` | `05. Hóa đơn` | 0 | Đã xóa |
| `06_Thanh toán` | `06. Thanh toán` | 0 | Đã xóa |
| `07_Hình ảnh hiện trường` | `07. Hình ảnh hiện trường` | 0 | Đã xóa |
| `08_Báo cáo ngày` | `08. Báo cáo ngày` | 0 | Đã xóa |

**Kết quả**: 8 folder gốc duy nhất, đúng chuẩn underscore.

## 5. Sửa lỗi code

### 5.1 `auto-classify.ts`
- **Trước**: So khớp cứng `folderName.includes("01. Hợp đồng")`.
- **Sau**: Dùng hàm `folderIs(folderName, "Hợp đồng")` normalize bỏ prefix số + ký tự phân cách trước khi so.
- Hoạt động với cả `01_Hợp đồng`, `01. Hợp đồng`, `01 Hợp đồng`.

### 5.2 `metadata-types.ts`
- **Trước**: Key dùng dot (`"01. Hợp đồng"`).
- **Sau**: Key dùng underscore (`"01_Hợp đồng"`) khớp DB thật. Thêm `normalizeFolderKey()` cho `getDocumentTypeOptionsForFolder()`.

### 5.3 `document-rules.ts`
- **Trước**: `getDocumentRule()` exact match.
- **Sau**: Nếu exact match thất bại, normalize cả 2 bên rồi so lại. Đảm bảo không fallback nhầm về `Tài liệu khác`.

### 5.4 Seed script
- **Trước**: Tự tạo folder mới nếu không tìm thấy → gây nhân đôi.
- **Sau**: Dừng ngay nếu thiếu folder hoặc trùng folder. KHÔNG bao giờ tự tạo folder.

### 5.5 UI File Card
- Bổ sung badge phân loại hồ sơ trên mỗi File Card:
  - Có phân loại: Badge xanh `📋 Hợp đồng chính`
  - Chưa phân loại: Badge vàng `Chưa phân loại`

## 6. Auto-classify Rebuild Test Result

| STT | Folder | File | Expected | Actual | Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | 01_Hợp đồng | QA_AUTO_hop_dong_chinh_HD_001.pdf | MAIN_CONTRACT | MAIN_CONTRACT | PASS |
| 2 | 01_Hợp đồng | QA_AUTO_phu_luc_hop_dong_PL_001.docx | APPENDIX | APPENDIX | PASS |
| 3 | 02_Bản vẽ | QA_AUTO_shopdrawing_tang_2.pdf | SHOPDRAWING | SHOPDRAWING | PASS |
| 4 | 02_Bản vẽ | QA_AUTO_ban_ve_hoan_cong.dwg | CAD_FILE | CAD_FILE | PASS |
| 5 | 03_Dự toán | QA_AUTO_du_toan_dieu_chinh_lan_1.xlsx | REVISED_ESTIMATE | REVISED_ESTIMATE | PASS |
| 6 | 04_Nghiệm thu | QA_AUTO_NT_khoi_luong_tang_1.pdf | VOLUME_ACCEPTANCE | VOLUME_ACCEPTANCE | PASS |
| 7 | 05_Hóa đơn | QA_AUTO_hoa_don_vat_000123.xml | XML_INVOICE | XML_INVOICE | PASS |
| 8 | 06_Thanh toán | QA_AUTO_uy_nhiem_chi_dot_1.pdf | PAYMENT_ORDER | PAYMENT_ORDER | PASS |
| 9 | 07_Hình ảnh hiện trường | QA_AUTO_anh_tien_do_ngay_20.png | PROGRESS_PHOTO | PROGRESS_PHOTO | PASS |
| 10 | 08_Báo cáo ngày | QA_AUTO_bao_cao_ngay_2026_06_20.docx | DAILY_REPORT | DAILY_REPORT | PASS |
| 11 | 04_Nghiệm thu | QA_AUTO_scan123.pdf | null | null | PASS |

**Kết quả: 11/11 PASS (100%)**

## 7. Build Result & Git Safety
- `npx prisma validate`: PASS
- `tsc --noEmit`: PASS
- `npm run build`: PASS (Exit code 0)
- `git ls-files storage`: Rỗng (không tracking storage)
- `git log --all -- storage`: Chỉ có commit cũ trước đây, không có commit mới
- Repo local `D:\construction-erp-v2` an toàn, tuyệt đối KHÔNG push

## 8. Rủi ro còn lại
- Nếu sau này có ai tạo folder bằng tên dot format (`01. Hợp đồng`), hệ thống vẫn hoạt động nhờ normalize. Nhưng khuyến nghị giữ chuẩn underscore.
- Upload API endpoint vẫn ghi file vào local storage. Chưa có S3/MinIO.

## 9. Kết luận
- **Cleanup QA data**: PASS
- **Duplicate folder cleanup**: PASS
- **Auto-classify visibility**: PASS
- **Runtime UAT**: PASS
- **Có migration không**: KHÔNG
- **Push repo cũ**: KHÔNG
- **Production**: NO-GO
