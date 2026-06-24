# BÁO CÁO TỔNG HỢP PHÂN HỆ BÁO CÁO NGÀY VÀ BÁO CÁO TUẦN

## 1. Thông tin chung

**Phân hệ:** Báo cáo hiện trường
**Loại báo cáo:**

* Báo cáo ngày
* Báo cáo tuần

**Mục tiêu:**
Phân hệ báo cáo hiện trường dùng để ghi nhận tình hình thi công thực tế tại công trình, bao gồm khối lượng thực hiện, nhân sự, vật tư, kỹ thuật, phát sinh, hình ảnh/file đính kèm, tình trạng duyệt và khả năng in/xuất báo cáo.

Hiện tại hệ thống đã có cấu trúc cho báo cáo ngày và báo cáo tuần, có dữ liệu UAT demo để kiểm thử UI/UX. Tuy nhiên dữ liệu hiện tại **không phải dữ liệu thật** và chưa được phép coi là production.

---

## 2. Báo cáo ngày

### 2.1. Mục đích của báo cáo ngày

Báo cáo ngày dùng để ghi nhận tình hình thi công từng ngày tại công trường. Đây là dữ liệu gốc quan trọng để:

* Theo dõi công việc thực tế ngoài công trường.
* Ghi nhận khối lượng thực hiện trong ngày.
* Ghi nhận thời tiết, nhân sự, vật tư, máy móc, kỹ thuật.
* Ghi nhận phát sinh, vướng mắc, kiến nghị.
* Lưu ảnh hiện trường và file tài liệu liên quan.
* Làm căn cứ tổng hợp báo cáo tuần.
* Làm căn cứ kiểm tra tiến độ, nghiệm thu, thanh toán sau này.

### 2.2. Các thông tin chính của báo cáo ngày

Một báo cáo ngày nên có đầy đủ các nhóm thông tin sau:

#### A. Thông tin chung

* Mã báo cáo.
* Công trình.
* Ngày báo cáo.
* Người lập báo cáo.
* Trạng thái báo cáo.
* Thời tiết.
* Nhiệt độ nếu có.
* Ghi chú tổng quan trong ngày.

#### B. Nội dung công việc

Mỗi báo cáo ngày cần có danh sách công việc thực hiện trong ngày:

* Tên công việc.
* Hạng mục/nhóm công việc.
* Khu vực thi công.
* Đơn vị tính.
* Khối lượng thực hiện trong ngày.
* Ghi chú công việc.
* Vấn đề phát sinh nếu có.

#### C. Khối lượng thực hiện

Báo cáo ngày phải liên kết với bảng khối lượng gốc/Field Progress nếu có.

Yêu cầu chuẩn:

* Công việc trong báo cáo ngày nên khớp với công việc trong bảng khối lượng gốc.
* Khối lượng nhập trong ngày không được vượt quá khối lượng thiết kế nếu không có cơ chế phát sinh riêng.
* Tổng hợp khối lượng ngày phải cộng đúng lên màn tổng hợp.
* Ngày nhập phải đúng timezone Việt Nam, không bị lệch ngày.

#### D. Ảnh và file đính kèm

Báo cáo ngày cần hỗ trợ:

* Ảnh hiện trường.
* File tài liệu liên quan.
* Biên bản, bản vẽ, ghi chú, ảnh nghiệm thu nếu có.
* Xem được trong drawer chi tiết.
* In/xuất PDF hiển thị được ảnh trước phần chữ ký.

Lưu ý hiện tại: bộ dữ liệu UAT demo mới tạo **chưa có attachment ảnh thật**, nên luồng ảnh/file báo cáo ngày vẫn cần kiểm thử bằng file thật sau.

---

## 3. Trạng thái và workflow của báo cáo ngày

### 3.1. Các trạng thái chính

Hệ thống đang dùng các trạng thái dạng:

* `DRAFT` — Nháp.
* `SUBMITTED` — Đã gửi/chờ duyệt.
* `APPROVED` — Đã duyệt.
* `REJECTED` hoặc `REVISION_REQUESTED` — Bị trả lại/yêu cầu chỉnh sửa.
* Có thể có `CANCELLED` hoặc `LOCKED` nếu mở rộng sau.

### 3.2. Quy trình chuẩn

Quy trình nên vận hành như sau:

1. Người lập tạo báo cáo ngày ở trạng thái nháp.
2. Người lập nhập nội dung công việc, khối lượng, ghi chú, ảnh/file.
3. Người lập gửi báo cáo.
4. Báo cáo chuyển sang trạng thái chờ duyệt.
5. Admin/Giám đốc/Người có quyền duyệt kiểm tra.
6. Nếu đạt yêu cầu:

   * Duyệt báo cáo.
   * Báo cáo bị khóa chỉnh sửa.
7. Nếu chưa đạt:

   * Từ chối hoặc yêu cầu chỉnh sửa.
   * Người lập sửa lại và gửi lại.
8. Báo cáo đã duyệt được dùng để tổng hợp tuần.

### 3.3. Quy tắc khóa dữ liệu

Quy tắc hiện tại nên giữ:

* Báo cáo `DRAFT`: được sửa.
* Báo cáo `REJECTED/REVISION_REQUESTED`: được sửa lại.
* Báo cáo `SUBMITTED`: người thường không được sửa, Admin/Giám đốc được duyệt/từ chối/xóa mềm nếu cần.
* Báo cáo `APPROVED`: khóa, không cho sửa/xóa thông thường.
* Upload ảnh/file chỉ nên cho phép ở `DRAFT` hoặc `REJECTED/REVISION_REQUESTED`.

---

## 4. Báo cáo tuần

### 4.1. Mục đích của báo cáo tuần

Báo cáo tuần dùng để tổng hợp tình hình thi công trong một tuần, dựa trên các báo cáo ngày đã nhập.

Báo cáo tuần phục vụ:

* Chỉ huy trưởng báo cáo tình hình tuần.
* Ban lãnh đạo theo dõi tiến độ tổng quan.
* Tổng hợp khối lượng hoàn thành trong tuần.
* Tổng hợp vấn đề phát sinh.
* Đề xuất kế hoạch tuần tiếp theo.
* Làm tài liệu họp giao ban công trường.

### 4.2. Nội dung chuẩn của báo cáo tuần

Một báo cáo tuần nên gồm các phần:

#### A. Thông tin chung

* Mã báo cáo tuần.
* Công trình.
* Tuần báo cáo.
* Từ ngày — đến ngày.
* Người lập.
* Người duyệt.
* Trạng thái báo cáo.

#### B. Đánh giá kết quả tuần

Nội dung nên có:

* Công việc đã hoàn thành trong tuần.
* Công việc đang thực hiện.
* Công việc chậm/không đạt kế hoạch nếu có.
* Tỷ lệ hoàn thành chính.
* Đánh giá chung của chỉ huy trưởng.

#### C. Báo cáo tiến độ

Cần tổng hợp:

* Khối lượng trong tuần.
* Khối lượng lũy kế.
* Tỷ lệ hoàn thành so với thiết kế.
* Công việc có phát sinh.
* Công việc chưa có phát sinh.

#### D. Báo cáo vật tư

Nên có phần:

* Vật tư chính đã sử dụng.
* Vật tư còn thiếu.
* Vật tư cần cấp trong tuần tới.
* Vướng mắc về cung ứng nếu có.

#### E. Báo cáo kỹ thuật

Nên có phần:

* Vấn đề kỹ thuật phát sinh.
* Công tác nghiệm thu/kỹ thuật đã thực hiện.
* Hạng mục cần kiểm tra.
* Rủi ro kỹ thuật nếu có.

#### F. Báo cáo phát sinh/vướng mắc

Nên ghi rõ:

* Nội dung phát sinh.
* Nguyên nhân.
* Ảnh hưởng tiến độ/chi phí.
* Người phụ trách xử lý.
* Kiến nghị.

#### G. Kế hoạch tuần tiếp theo

Cần có:

* Công việc dự kiến thực hiện.
* Khối lượng mục tiêu.
* Vật tư cần chuẩn bị.
* Nhân lực/máy móc cần huy động.
* Rủi ro cần theo dõi.

---

## 5. Quan hệ giữa báo cáo ngày và báo cáo tuần

### 5.1. Quan hệ nghiệp vụ

Báo cáo tuần nên được tổng hợp từ báo cáo ngày.

Luồng chuẩn:

1. Mỗi ngày tạo báo cáo ngày.
2. Báo cáo ngày được duyệt.
3. Cuối tuần tạo báo cáo tuần.
4. Báo cáo tuần lấy dữ liệu từ các báo cáo ngày đã duyệt.
5. Người lập có thể bổ sung đánh giá và kế hoạch tuần sau.
6. Báo cáo tuần được gửi duyệt.

### 5.2. Trạng thái hiện tại

Hiện tại hệ thống đã có báo cáo tuần demo, nhưng phần liên kết nguồn từ báo cáo ngày sang báo cáo tuần chưa được coi là hoàn thiện tuyệt đối.

Cần lưu ý:

* R2 weekly source linkage chưa hoàn thiện.
* Báo cáo tuần demo hiện có thể dùng để test UI/UX.
* Chưa nên coi báo cáo tuần là dữ liệu tổng hợp chuẩn nếu chưa kiểm tra lại logic liên kết daily-weekly.

### 5.3. Yêu cầu cần hoàn thiện sau

Cần làm thêm:

* Báo cáo tuần chỉ tổng hợp báo cáo ngày thuộc cùng công trình.
* Chỉ lấy báo cáo ngày đã duyệt nếu quy trình yêu cầu.
* Không lấy báo cáo nháp hoặc bị từ chối.
* Không tạo trùng báo cáo tuần cùng khoảng ngày.
* Có bảng nguồn dữ liệu: báo cáo tuần này lấy từ những báo cáo ngày nào.
* Khi báo cáo ngày thay đổi sau khi đã tạo tuần, hệ thống phải có cảnh báo.

---

## 6. Giao diện báo cáo ngày

### 6.1. Màn danh sách

Màn danh sách báo cáo ngày cần có:

* Bộ lọc theo loại báo cáo.
* Bộ lọc theo trạng thái.
* Tìm kiếm theo mã báo cáo, công trình, nội dung.
* Hiển thị ngày báo cáo.
* Hiển thị người lập.
* Hiển thị trạng thái.
* Hiển thị số lượng ảnh/file nếu có.
* Nút xem chi tiết.
* Nút in/xuất PDF.
* Nút sửa/xóa nếu đủ quyền.

### 6.2. Drawer chi tiết

Drawer báo cáo ngày nên gồm:

* Header rõ mã báo cáo, trạng thái, ngày.
* Thông tin công trình.
* Thông tin thời tiết.
* Danh sách công việc trong ngày.
* Khối lượng thực hiện.
* Ghi chú.
* Ảnh hiện trường.
* File đính kèm.
* Lịch sử duyệt.
* Footer hành động: Đóng, In, Sửa, Xóa, Duyệt, Từ chối tùy quyền.

### 6.3. In/xuất PDF

Mẫu in báo cáo ngày cần có:

* Header công ty/công trình.
* Tiêu đề “Báo cáo hiện trường ngày”.
* Thông tin chung.
* Bảng công việc.
* Ảnh hiện trường.
* File đính kèm nếu có.
* Chữ ký:

  * Người lập báo cáo.
  * Chỉ huy trưởng.
  * Người phê duyệt.

---

## 7. Giao diện báo cáo tuần

### 7.1. Màn danh sách

Màn danh sách báo cáo tuần cần:

* Hiển thị mã báo cáo tuần.
* Hiển thị khoảng thời gian tuần.
* Hiển thị công trình.
* Hiển thị trạng thái.
* Hiển thị người lập.
* Hiển thị số báo cáo ngày nguồn nếu có.
* Nút xem chi tiết.
* Nút in/xuất PDF.
* Nút duyệt/từ chối nếu đủ quyền.

### 7.2. Drawer chi tiết

Drawer báo cáo tuần nên tách biệt với báo cáo ngày, gồm:

* Tổng quan tuần.
* Tổng hợp công việc.
* Tiến độ và khối lượng.
* Vấn đề phát sinh.
* Vật tư.
* Kỹ thuật.
* Kế hoạch tuần tiếp theo.
* Ảnh tiêu biểu.
* File đính kèm.
* Lịch sử duyệt.

### 7.3. In/xuất PDF

Mẫu in báo cáo tuần nên có bố cục văn bản chuyên nghiệp:

1. Thông tin chung.
2. Đánh giá kết quả tuần.
3. Tổng hợp khối lượng.
4. Vật tư.
5. Kỹ thuật.
6. Phát sinh/vướng mắc.
7. Kế hoạch tuần tiếp theo.
8. Ảnh tiêu biểu.
9. Chữ ký.

Ảnh nên nằm trước chữ ký. Không nên để ảnh sau chữ ký vì nhìn thiếu chuyên nghiệp.

---

## 8. Phân quyền báo cáo

### 8.1. Admin/Giám đốc

Nên có quyền:

* Xem tất cả báo cáo.
* Duyệt/từ chối báo cáo.
* Xóa mềm báo cáo nếu cần.
* In/xuất PDF.
* Xem lịch sử xử lý.

### 8.2. Chỉ huy trưởng/Kỹ sư hiện trường

Nên có quyền:

* Tạo báo cáo ngày.
* Sửa báo cáo nháp hoặc báo cáo bị trả lại.
* Gửi báo cáo duyệt.
* Xem báo cáo của công trình mình phụ trách.
* Không được xóa báo cáo đã gửi/đã duyệt nếu không có quyền cao hơn.

### 8.3. Người xem

Nên có quyền:

* Xem báo cáo đã duyệt.
* In/xuất nếu được cấp quyền.
* Không được sửa/xóa/duyệt.

### 8.4. Hạn chế hiện tại

Hiện tại hệ thống mới ở mức phân quyền MVP. Project-level RBAC chưa hoàn thiện. Nghĩa là cần làm thêm:

* Admin/Giám đốc xem tất cả dự án.
* Chỉ huy trưởng chỉ xem dự án được phân công.
* Kỹ sư chỉ nhập báo cáo trong dự án được phân công.
* Người không thuộc dự án không được xem báo cáo dự án đó.

---

## 9. Dữ liệu và lưu trữ file

### 9.1. File báo cáo ngày

Báo cáo ngày cần hỗ trợ tốt:

* Ảnh hiện trường thật.
* File biên bản/tài liệu thật.
* Preview ảnh.
* Tải file.
* In ảnh trong PDF.

### 9.2. File báo cáo tuần

Báo cáo tuần nên hỗ trợ:

* Ảnh tiêu biểu của tuần.
* File tổng hợp tuần.
* Biên bản họp tuần nếu có.
* File kế hoạch tuần sau nếu có.

### 9.3. Yêu cầu kiểm soát file

Cần kiểm tra:

* File DB có tồn tại trong storage không.
* Path có an toàn không.
* Không có path traversal.
* Không có file giả đổi đuôi.
* Không có attachment bị mất file vật lý.
* Backup storage định kỳ.

Hiện bộ UAT demo mới tạo chưa có attachment ảnh báo cáo, nên cần test thêm bằng ảnh/file thật.

---

## 10. Kiểm thử hiện tại

### 10.1. Những phần đã có thể kiểm thử

Bộ UAT demo hiện đã tạo:

* 1 project demo.
* 4 nhóm WBS.
* 16 công việc.
* 10 entry khối lượng.
* 8 folder tài liệu.
* 4 file text mẫu.
* 5 báo cáo ngày.
* 1 báo cáo tuần.

Có thể kiểm thử:

* Danh sách công trình.
* Bảng khối lượng gốc.
* Nhập khối lượng theo ngày.
* Tổng hợp khối lượng.
* Danh sách tài liệu.
* Danh sách báo cáo.
* Drawer báo cáo ngày.
* Drawer báo cáo tuần.
* In/xuất PDF cơ bản.

### 10.2. Những phần chưa đủ bằng chứng

Cần kiểm thử thêm:

* Browser UAT thật nếu chưa mở từng màn.
* Upload ảnh thật vào báo cáo ngày.
* Upload file thật vào báo cáo ngày.
* Preview ảnh trong drawer.
* Ảnh trong print/PDF.
* Luồng duyệt/từ chối bằng user role khác nhau.
* Mobile thực tế ngoài điện thoại.
* Báo cáo tuần tự tổng hợp từ báo cáo ngày đã duyệt.
* Cleanup UAT demo có xóa sạch toàn bộ AuditLog liên quan không.

---

## 11. Các vấn đề cần theo dõi

### 11.1. Đơn vị công việc trong báo cáo ngày

Trong script UAT demo có dấu hiệu dùng `unit: 'n/a'` cho report line. Việc này không đẹp và có thể gây khó hiểu trong UI/Print.

Khuyến nghị:

* Report line cần lấy đúng đơn vị từ Field Progress Item.
* Không hiển thị `n/a` trên giao diện người dùng.
* Nếu thiếu đơn vị, hiển thị `—` hoặc bỏ trống nhẹ.

### 11.2. Trạng thái `REVISION_REQUESTED`

Cần kiểm tra UI có hiển thị đúng trạng thái này không. Nếu hệ thống đang dùng `REJECTED` nhưng seed dùng `REVISION_REQUESTED`, cần đồng bộ lại nhãn tiếng Việt:

* `REVISION_REQUESTED`: Yêu cầu chỉnh sửa.
* `REJECTED`: Từ chối.

Không nên để mỗi nơi một cách gọi gây rối.

### 11.3. Báo cáo tuần chưa có source linkage chuẩn

Cần làm phase riêng để hoàn thiện:

* Weekly lấy nguồn từ daily nào.
* Chỉ tổng hợp daily approved.
* Không trùng tuần.
* Có cảnh báo khi daily thay đổi sau khi tạo weekly.

### 11.4. Attachment ảnh/file chưa được test đủ

Vì UAT demo chưa tạo attachment báo cáo, cần test thủ công:

* Tạo 1 báo cáo ngày nháp.
* Upload 1 ảnh thật.
* Upload 1 file PDF thật.
* Lưu nháp.
* Gửi duyệt.
* Mở drawer.
* In PDF.
* Duyệt hoặc từ chối.

---

## 12. Đánh giá hiện trạng

### 12.1. Báo cáo ngày

**Trạng thái:** Có thể UAT tiếp.

Điểm tốt:

* Có cấu trúc báo cáo ngày.
* Có trạng thái workflow.
* Có drawer.
* Có print.
* Có liên kết với công việc/khối lượng.
* Có thể test bằng UAT demo.

Rủi ro:

* Attachment ảnh/file chưa test đủ.
* Đơn vị `n/a` cần sửa nếu hiện ra UI.
* Cần browser UAT thật.
* Cần test role thấp.

### 12.2. Báo cáo tuần

**Trạng thái:** Có thể test UI/Print, nhưng chưa nên coi là tổng hợp chuẩn.

Điểm tốt:

* Đã có loại báo cáo tuần.
* Có thể hiện trên list.
* Có drawer/print.
* Có thể dùng để kiểm tra giao diện.

Rủi ro:

* Source linkage với báo cáo ngày chưa hoàn thiện.
* Chưa chắc chỉ lấy báo cáo ngày đã duyệt.
* Chưa có chống trùng tuần ở mức DB nếu chưa implement.
* Cần phase R2 riêng.

---

## 13. Đề xuất lộ trình tiếp theo

### Phase 1 — Post-seed UAT Verification

Mục tiêu:

* Mở browser test thật toàn bộ báo cáo ngày/tuần.
* Kiểm tra UI list/drawer/print.
* Kiểm tra dữ liệu hiển thị có bị `n/a`, label sai, status sai không.
* Kiểm tra mobile.

### Phase 2 — Fix nhỏ dữ liệu UAT demo

Mục tiêu:

* Sửa đơn vị `n/a`.
* Đồng bộ status rejected/revision.
* Bổ sung 1–2 ảnh/file mẫu hợp lệ nếu cần.
* Verify cleanup script xóa sạch.

### Phase 3 — Attachment Real Upload UAT

Mục tiêu:

* Test upload ảnh thật.
* Test upload PDF thật.
* Test preview/download/print.
* Test storage + DB sync.

### Phase 4 — Weekly Source Linkage

Mục tiêu:

* Báo cáo tuần tổng hợp từ báo cáo ngày.
* Chỉ lấy báo cáo ngày đã duyệt.
* Có danh sách báo cáo nguồn.
* Không tạo trùng tuần.
* Có cảnh báo dữ liệu thay đổi.

### Phase 5 — Project-level RBAC

Mục tiêu:

* Chỉ huy trưởng chỉ thấy công trình mình phụ trách.
* Kỹ sư chỉ nhập báo cáo công trình được phân quyền.
* Admin/Giám đốc xem tất cả.
* Server action và UI đồng bộ quyền.

---

## 14. Kết luận

Phân hệ báo cáo ngày và báo cáo tuần hiện đã có nền tảng tương đối đầy đủ để tiếp tục UAT:

* Báo cáo ngày đã có cấu trúc, workflow, drawer, print.
* Báo cáo tuần đã có UI và print để kiểm thử.
* Dữ liệu UAT demo đã đủ để kiểm tra giao diện cơ bản.
* Hệ thống hiện chưa có dữ liệu thật.
* Production chưa được phép GO.

Kết luận cuối:

**Báo cáo ngày:** PASS WITH RISKS — có thể UAT tiếp.
**Báo cáo tuần:** PASS WITH RISKS — chỉ nên test UI/Print, chưa chốt logic tổng hợp chuẩn.
**Attachment ảnh/file:** NOT FULLY VERIFIED.
**Project-level RBAC:** NOT DONE.
**Production:** NO-GO.
**Khuyến nghị:** Tiếp tục Post-seed Browser UAT và hoàn thiện weekly linkage trước khi nhập dữ liệu thật quy mô lớn.
