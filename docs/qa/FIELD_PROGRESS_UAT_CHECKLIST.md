# CHECKLIST UAT NỘI BỘ — FIELD PROGRESS 3 MÀN

Phạm vi test:

1. Bảng khối lượng gốc
2. Nhập khối lượng theo ngày
3. Tổng hợp khối lượng

Không test module khác.

---

## 1. Bảng khối lượng gốc

### Case 1 — Xem danh sách khối lượng gốc

* Mở màn Bảng khối lượng gốc.
* Kiểm tra có đủ hạng mục cha/con.
* Kiểm tra đơn vị, mũi thi công, khối lượng thiết kế.

Kết quả:

* PASS / FAIL
* Ghi chú:

### Case 2 — Thêm công việc mới

* Thêm một công việc WORK mới.
* Nhập tên công việc, đơn vị, khối lượng thiết kế.
* Lưu lại.

Kết quả mong muốn:

* Công việc mới hiển thị ở Bảng gốc.
* Sang màn Nhập ngày cũng thấy công việc mới.
* Sang màn Tổng hợp cũng thấy công việc mới.

Kết quả:

* PASS / FAIL
* Ghi chú:

### Case 3 — Sửa khối lượng thiết kế

* Sửa khối lượng thiết kế của một công việc.
* Kiểm tra Daily và Summary có cập nhật lại không.

Kết quả:

* PASS / FAIL
* Ghi chú:

---

## 2. Nhập khối lượng theo ngày

### Case 4 — Nhập DRAFT

* Chọn ngày hôm nay.
* Nhập khối lượng cho một công việc.
* Bấm Lưu nháp.

Kết quả mong muốn:

* Dữ liệu lưu được.
* Reload lại không mất.
* Summary có thể tổng hợp đúng theo logic hiện tại.

Kết quả:

* PASS / FAIL
* Ghi chú:

### Case 5 — Gửi SUBMITTED

* Nhập khối lượng hợp lệ.
* Bấm Gửi.

Kết quả mong muốn:

* Trạng thái chuyển đúng.
* Không tạo dòng trùng.
* Summary kéo được số liệu.

Kết quả:

* PASS / FAIL
* Ghi chú:

### Case 6 — Nhập vượt khối lượng

* Nhập khối lượng vượt 100%.
* Thử gửi khi không có lý do.

Kết quả mong muốn:

* Hệ thống cảnh báo/chặn đúng.
* Nếu có lý do hợp lệ thì xử lý đúng.

Kết quả:

* PASS / FAIL
* Ghi chú:

### Case 7 — Nhập số âm hoặc số 0

* Thử nhập số âm.
* Thử nhập 0.

Kết quả mong muốn:

* Số âm bị chặn.
* Số 0 không tạo dữ liệu rác.

Kết quả:

* PASS / FAIL
* Ghi chú:

---

## 3. Tổng hợp khối lượng

### Case 8 — Xem tổng hợp theo kỳ

* Chọn khoảng ngày có dữ liệu.
* Kiểm tra phát sinh trong kỳ.
* Kiểm tra lũy kế.
* Kiểm tra tỷ lệ hoàn thành.

Kết quả mong muốn:

* Tổng WORK đúng.
* GROUP cha bằng tổng con.
* Không lệch ngày.
* Không NaN/Infinity.

Kết quả:

* PASS / FAIL
* Ghi chú:

### Case 9 — Đối chiếu Daily với Summary

* Lấy một ngày đã nhập ở Daily.
* So sánh số ngày đó trong Summary.

Kết quả mong muốn:

* Số liệu khớp.

Kết quả:

* PASS / FAIL
* Ghi chú:

---

## 4. Kết luận người test

Người test:

Ngày test:

Thiết bị test:

Các lỗi phát hiện:

1.
2.
3.

Đánh giá chung:

* Dễ dùng / Khó dùng
* Số liệu đúng / Chưa đúng
* Có thể dùng thử ngoài công trường chưa?

Kết luận:

* PASS UAT
* PASS CÓ ĐIỀU KIỆN
* FAIL, cần sửa trước
