# Báo cáo nguyên nhân dữ liệu công trình bị mất

**Ngày điều tra:** 17/07/2026  
**Phạm vi:** Chỉ đọc. Không thực hiện khôi phục, xóa, cập nhật dữ liệu hay thay đổi cấu hình kết nối.

## Kết luận

Nguyên nhân đã được **xác nhận** là một thao tác xóa dữ liệu nghiệp vụ trực tiếp trên cơ sở dữ liệu `construction_erp_v2` vào ngày **03/07/2026**. Đây không phải lỗi giao diện hoặc lỗi truy vấn làm ẩn dữ liệu.

Nhật ký thực thi cho thấy thao tác chạy ở chế độ thật (`isDryRun: false`), xóa toàn bộ 10 công trình cùng dữ liệu liên quan và xác minh kết quả thành công. Trước đó, hệ thống đã xuất một bản sao lưu JSON của dữ liệu này.

Ngoài ra, ứng dụng hiện đang kết nối tới cơ sở dữ liệu QA `construction_erp_v2_qa`, không phải cơ sở dữ liệu nghiệp vụ đã bị xóa. Cơ sở dữ liệu QA hiện chỉ có 1 công trình, không có báo cáo hiện trường, tài liệu hoặc thư mục tài liệu. Điều này giải thích vì sao màn hình hiện tại không hiển thị dữ liệu công trình cũ.

## Bằng chứng

| Thời điểm | Bằng chứng | Kết quả |
| --- | --- | --- |
| 03/07/2026 10:25:31 | `backups/business-data-wipe/json-export-2026-07-03T10-25-31-887Z/metadata.json` | Sao lưu JSON hoàn tất trước khi xóa; ghi nhận 10 công trình, 69 thư mục tài liệu, 11 tài liệu, 56 báo cáo hiện trường và các dữ liệu liên quan. |
| 03/07/2026 10:26:28 | `docs/qa/business-data-wipe-execution-result-2026-07-03.json` | Chạy xóa thật (`isDryRun: false`), `Project` từ 10 xuống 0, `DocumentFolder` từ 69 xuống 0, `Document` từ 11 xuống 0, `SiteReport` từ 56 xuống 0; trạng thái xác minh `PASS`. |
| 03/07/2026 | `docs/qa/business-data-wipe-approval-manifest-2026-07-03.json` | Bản ghi phê duyệt cho phép chạy xóa dữ liệu nghiệp vụ, bao gồm công trình, báo cáo, tài liệu, vật tư, thanh toán, hợp đồng, nhà cung cấp và người dùng mẫu. |
| 03/07/2026 | `docs/qa/BLANK_APP_BROWSER_QA_CHECKLIST_2026_07_03.md` | Xác nhận trạng thái sau thao tác là “APP TRỐNG (BLANK APP)” và danh sách công trình được kỳ vọng rỗng. |
| 17/07/2026 | Kiểm tra chỉ đọc cơ sở dữ liệu mà ứng dụng đang dùng | `construction_erp_v2_qa` có 1 công trình, 0 báo cáo, 0 tài liệu và 0 thư mục tài liệu. |

## Phạm vi dữ liệu đã bị xóa

Các bản ghi thực thi xác nhận ít nhất các nhóm dữ liệu sau đã bị xóa trong lần chạy này:

- 10 công trình và dữ liệu thành viên/WBS liên quan.
- 69 thư mục tài liệu và 11 tài liệu.
- 56 báo cáo hiện trường, dòng báo cáo và tệp đính kèm liên quan.
- Hợp đồng, thanh toán, vật tư, phê duyệt, thông báo, trao đổi, nhà cung cấp và danh mục vật tư thuộc phạm vi dọn dữ liệu.
- Nhật ký kiểm toán và người dùng mẫu thuộc phạm vi lệnh xóa.

Con số đầy đủ cho từng bảng được lưu trong tệp kết quả thực thi nêu trên.

## Các khả năng đã loại trừ

- **Không phải lỗi CSS/giao diện:** lỗi CSS trước đó có thể ngăn ứng dụng biên dịch, nhưng không có khả năng xóa dữ liệu trong cơ sở dữ liệu.
- **Không phải đợt migration/cutover V2:** tài liệu kế hoạch và báo cáo rebaseline V2 ghi rõ việc cutover trên cơ sở dữ liệu hiện hữu chưa được thực hiện.
- **Không phải chỉ đổi bộ lọc hay quyền xem:** nhật ký ghi trực tiếp số lượng `Project` từ 10 xuống 0 sau một lệnh xóa thật.

## Khả năng khôi phục

Khả năng khôi phục dữ liệu nghiệp vụ **có cơ sở** vì còn bản xuất JSON trước khi xóa tại:

`backups/business-data-wipe/json-export-2026-07-03T10-25-31-887Z/`

Tuy vậy, chưa được phép ghi đè hoặc nhập thẳng vào môi trường đang chạy. Việc khôi phục an toàn cần thực hiện theo thứ tự:

1. Tạo bản sao lưu mới của mọi cơ sở dữ liệu đích trước khi can thiệp.
2. Khôi phục thử vào một cơ sở dữ liệu cô lập, không phải môi trường ứng dụng hiện tại.
3. Đối chiếu số lượng, quan hệ dữ liệu, tài khoản, quyền truy cập và tệp đính kèm với gói JSON.
4. Kiểm tra riêng kho tệp/đính kèm vì dữ liệu JSON không tự chứng minh rằng toàn bộ tệp vật lý vẫn còn.
5. Chỉ sau khi có xác nhận của chủ hệ thống mới lập kế hoạch nhập chọn lọc hoặc chuyển đổi dữ liệu.

Tệp dump `backups/cutover_rehearsal_20260717090306.dump` được ghi nhận là bản rehearsal cho cơ sở dữ liệu QA; không được xem là bản sao thay thế cho dữ liệu nghiệp vụ trước khi xóa nếu chưa kiểm chứng nội dung.

## Hạn chế của kết luận

- Script xóa gốc không còn hiện diện trong cây mã hiện tại; báo cáo dựa trên artefact sao lưu, manifest phê duyệt và nhật ký thực thi còn lưu lại.
- Chưa kiểm tra trực tiếp các bản sao lưu cấp máy chủ hoặc kho tệp đính kèm lịch sử, nên chưa thể khẳng định tỷ lệ phục hồi tệp là 100%.
- Không có hành động khôi phục nào đã được thực hiện trong quá trình điều tra này.

## Khuyến nghị phòng ngừa

1. Tách hoàn toàn biến môi trường Production và QA, hiển thị rõ tên môi trường trên giao diện quản trị.
2. Cấm script QA/dọn dữ liệu dùng thông tin kết nối Production; thêm chặn theo tên database và yêu cầu xác nhận đa bước.
3. Với mọi thao tác xóa diện rộng, bắt buộc sao lưu có kiểm chứng, bản thử khôi phục cô lập và phê duyệt của hai người.
4. Lưu script vận hành và nhật ký thực thi dưới kiểm soát phiên bản, không chỉ giữ kết quả chạy.
5. Thiết lập chính sách sao lưu định kỳ và diễn tập khôi phục, bao gồm cả kho tệp đính kèm.

