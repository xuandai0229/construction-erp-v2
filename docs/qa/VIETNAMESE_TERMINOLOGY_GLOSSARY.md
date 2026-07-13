# Từ điển thuật ngữ tiếng Việt

Nguồn chuẩn cho các nội dung hiển thị trong `construction-erp-v2`. Từ điển chỉ áp dụng cho giao diện, thông báo, dữ liệu mẫu, tài liệu xuất và nội dung trợ năng; không đổi tên model, enum, route, API hay mã nghiệp vụ.

| Khái niệm kỹ thuật | Cách hiển thị chuẩn | Không nên dùng | Ghi chú |
| --- | --- | --- | --- |
| Project | Công trình | Dự án, CT | Dùng trong UI quản lý thi công. |
| Material | Vật tư | Vật tự, VT | Theo nghiệp vụ công trường. |
| Material request | Phiếu đề xuất vật tư | YC vật tư | Viết đầy đủ ở label và thông báo. |
| Site report | Báo cáo hiện trường | Báo cáo công trường | Bao gồm báo cáo ngày và tuần. |
| Daily report | Báo cáo ngày | BC ngày | Dùng cho báo cáo theo ngày. |
| Weekly report | Báo cáo tuần | BC tuần | Dùng cho báo cáo theo tuần. |
| Approval | Phê duyệt | Duyệt, Approve | Dùng cho luồng phê duyệt. |
| Rejection | Từ chối | Không duyệt, Reject | Dùng cho kết quả phê duyệt. |
| Payment request | Đề nghị thanh toán | ĐNTT | Viết đầy đủ khi đứng độc lập. |
| Supplier | Nhà cung cấp | NCC | Viết đầy đủ trên giao diện. |
| Contract | Hợp đồng | HĐ | Dùng cho hợp đồng thi công/cung ứng. |
| Document | Tài liệu | Hồ sơ, văn bản | Dùng cho mô-đun quản lý tệp; giữ “hồ sơ” khi nghĩa nghiệp vụ cụ thể. |
| Quantity / volume | Khối lượng | KL | Dùng cho khối lượng công việc thi công. |
| Site manager | Chỉ huy trưởng | CHT | Có thể giữ CHT trong mã định danh đã phát hành. |
| Investor | Chủ đầu tư | CĐT | Viết đầy đủ trên UI; mã dự án có thể dùng CĐT nếu đã cố định. |
| Supervision consultant | Tư vấn giám sát | TVGS | Viết đầy đủ trên UI. |
| Pending | Chờ xử lý | Pending | Áp dụng khi chưa có hành động xử lý; “Chờ duyệt” khi chờ phê duyệt. |
| Draft | Bản nháp | Draft | Dùng cho dữ liệu chưa gửi. |
| Submitted | Đã gửi | Submitted | Dùng khi đã gửi vào luồng phê duyệt. |
| Approved | Đã phê duyệt | Approved | Không đổi enum `APPROVED`. |
| Rejected | Đã từ chối | Rejected | Không đổi enum `REJECTED`. |

## Quy ước định dạng

- Ngày hiển thị: `dd/MM/yyyy` hoặc `dd/MM/yyyy HH:mm`.
- Số và tiền tệ: dùng locale `vi-VN`; giữ mã đơn vị và enum trong dữ liệu.
- Đơn vị hiển thị ưu tiên: `m`, `m²`, `m³`, `kg`, `tấn`, `cái`, `bộ`, `lít`, `ngày công`, `giờ công`.
