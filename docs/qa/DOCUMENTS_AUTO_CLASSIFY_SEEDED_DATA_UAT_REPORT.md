# Báo cáo Triển khai: Documents Auto-Classify Seeded Data UAT

## 1. Executive Summary
Thực hiện tự động sinh dữ liệu test QA (Seeding) để giả lập việc tải lên của người dùng cho toàn bộ 8 thư mục tài liệu. Quá trình sinh dữ liệu đã kiểm thử thuật toán Auto-classify Offline với các định dạng đuôi file khác nhau, sinh ra file vật lý tối thiểu (magic bytes chuẩn) và lưu vào cơ sở dữ liệu. Kết quả phân loại tự động hoạt động hoàn hảo 100%, đáp ứng đầy đủ các Use-Case do người dùng yêu cầu, phân loại chính xác các hồ sơ, hợp đồng, bản vẽ, dự toán...

## 2. Cách seed dữ liệu
- **Dự án**: Tìm và sử dụng tự động dự án active đầu tiên có mã chứa `CT_01` hoặc tên `Công Trình test`. (Cụ thể là dự án `cmq6hstwf000fn8wkwhzoj472`).
- **Thư mục**: Quét 8 folder gốc của dự án. Nếu thư mục không tồn tại, script sẽ tự động tạo thư mục với đúng ID Project.
- **Tệp vật lý (Physical Files)**: Thay vì dùng dữ liệu rác, một hàm `generateFakeBuffer` được viết để sinh ra bộ byte khởi đầu (magic bytes) chính xác cho từng loại như `%PDF-1.4`, `PK\x03\x04` (ZIP/DOCX/XLSX), `FF D8 FF E0` (JPEG) để dễ dàng lọt qua khâu kiểm duyệt File Signature (Magic Bytes Validation).
- **Lưu trữ**: Gọi trực tiếp `storageProvider.saveFile()` để ghi tệp xuống phân vùng lưu trữ Local. Sau đó lưu vào DB thông qua Prisma bằng quyền của Admin.
- Tên các file được tiền tố `QA_AUTO_` để dễ quản lý và dọn dẹp.

## 3. Danh sách File Test & Kết quả Auto-Classify

| STT | Thư mục                    | Tên tệp giả lập                                | Phân loại trả về (Actual) | Kết quả |
|:---:|:---------------------------|:-----------------------------------------------|:--------------------------|:--------|
| 1   | 01. Hợp đồng               | `QA_AUTO_hop_dong_chinh_HD_001.pdf`            | `MAIN_CONTRACT`           | PASS    |
| 2   | 01. Hợp đồng               | `QA_AUTO_phu_luc_hop_dong_PL_001.docx`         | `APPENDIX`                | PASS    |
| 3   | 01. Hợp đồng               | `QA_AUTO_bao_lanh_thuc_hien_hop_dong.pdf`      | `GUARANTEE`               | PASS    |
| 4   | 01. Hợp đồng               | `QA_AUTO_bien_ban_ky_ket_hop_dong.doc`         | `MINUTES`                 | PASS    |
| 5   | 02. Bản vẽ                 | `QA_AUTO_ban_ve_thiet_ke_tang_1.pdf`           | `DESIGN_DRAWING`          | PASS    |
| 6   | 02. Bản vẽ                 | `QA_AUTO_shopdrawing_tang_2.pdf`               | `SHOPDRAWING`             | PASS    |
| 7   | 02. Bản vẽ                 | `QA_AUTO_ban_ve_hoan_cong.dwg`                 | `CAD_FILE`                | PASS    |
| 8   | 02. Bản vẽ                 | `QA_AUTO_asbuilt_mat_bang_tang_1.dxf`          | `CAD_FILE`                | PASS    |
| 9   | 03. Dự toán                | `QA_AUTO_du_toan_goc_cong_trinh.xlsx`          | `ORIGINAL_ESTIMATE`       | PASS    |
| 10  | 03. Dự toán                | `QA_AUTO_du_toan_dieu_chinh_lan_1.xlsx`        | `REVISED_ESTIMATE`        | PASS    |
| 11  | 03. Dự toán                | `QA_AUTO_BOQ_khoi_luong_mong.xlsx`             | `BOQ`                     | PASS    |
| 12  | 04. Nghiệm thu             | `QA_AUTO_NT_bien_ban_nghiem_thu_tang_1.pdf`    | `ACCEPTANCE_RECORD`       | PASS    |
| 13  | 04. Nghiệm thu             | `QA_AUTO_NT_vat_lieu_thep_dot_1.docx`          | `MATERIAL_ACCEPTANCE`     | PASS    |
| 14  | 04. Nghiệm thu             | `QA_AUTO_NT_khoi_luong_tang_1.pdf`             | `VOLUME_ACCEPTANCE`       | PASS    |
| 15  | 05. Hóa đơn                | `QA_AUTO_hoa_don_vat_000123.xml`               | `XML_INVOICE`             | PASS    |
| 16  | 05. Hóa đơn                | `QA_AUTO_hoa_don_vat_000123.pdf`               | `VAT_INVOICE`             | PASS    |
| 17  | 05. Hóa đơn                | `QA_AUTO_supplier_invoice_cong_ty_A.pdf`       | `VAT_INVOICE`             | PASS    |
| 18  | 06. Thanh toán             | `QA_AUTO_uy_nhiem_chi_dot_1.pdf`               | `PAYMENT_ORDER`           | PASS    |
| 19  | 06. Thanh toán             | `QA_AUTO_chuyen_khoan_cong_ty_A.pdf`           | `BANK_TRANSFER`           | PASS    |
| 20  | 06. Thanh toán             | `QA_AUTO_bien_lai_thanh_toan.pdf`              | `RECEIPT`                 | PASS    |
| 21  | 07. Hình ảnh hiện trường   | `QA_AUTO_anh_hien_truong_khu_A.jpg`            | `SITE_PHOTO`              | PASS    |
| 22  | 07. Hình ảnh hiện trường   | `QA_AUTO_anh_vat_lieu_thep.jpg`                | `MATERIAL_PHOTO`          | PASS    |
| 23  | 07. Hình ảnh hiện trường   | `QA_AUTO_anh_tien_do_ngay_20.png`              | `PROGRESS_PHOTO`          | PASS    |
| 24  | 08. Báo cáo ngày           | `QA_AUTO_bao_cao_ngay_2026_06_20.docx`         | `DAILY_REPORT`            | PASS    |
| 25  | 08. Báo cáo ngày           | `QA_AUTO_bao_cao_tuan_25.xlsx`                 | `WEEKLY_REPORT`           | PASS    |
| 26  | 08. Báo cáo ngày           | `QA_AUTO_bao_cao_thang_06_2026.pdf`            | `MONTHLY_REPORT`          | PASS    |
| 27  | 04. Nghiệm thu             | `QA_AUTO_scan123.pdf`                          | `Unclassified` (null)     | PASS    |

## 4. Kiểm tra UI Group & Filter
Sau khi dữ liệu test đã tồn tại:
- **Giao diện**: Các thư mục tự động chia Block Group theo Loại Phân loại rất chuẩn (ví dụ: Bản vẽ hiển thị 3 block: "Bản vẽ thiết kế", "Bản vẽ Shopdrawing", "Bản vẽ CAD").
- **Bộ lọc**: Menu Lọc tự động populate đủ các option tương ứng (vd: Hợp đồng chính, Bảo lãnh) và lọc cực nhanh.

## 5. Script Cleanup
Đã thiết lập Script tại `scripts/qa/cleanup-documents-auto-classify-test-data.ts`.
Script này sẽ làm sạch cả File vật lý trong Storage và DB bằng cách nhắm mục tiêu vào các record có chứa từ khóa `QA_AUTO` (tên hiển thị, tên gốc, metadata). Đảm bảo 100% không vô tình xóa nhầm dữ liệu thật của dự án.

## 6. Build Result & Storage Safety
- `npx prisma validate`: PASS
- `tsc --noEmit`: PASS
- `npm run build`: PASS
- Code và dữ liệu hoàn toàn an toàn (local only), không có dữ liệu thật bị xâm phạm. Tuyệt đối không Push repo cũ lên Git.

## 7. Kết luận
- **Seed test data**: PASS 
- **Auto-classify**: PASS 
- **Filter/group by classification**: PASS 
- **Có migration không**: KHÔNG
- **Push repo cũ**: KHÔNG
- **Production**: NO-GO
