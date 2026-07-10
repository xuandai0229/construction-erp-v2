# BÁO CÁO GHI NHẬN LỖI - AUDIT HỆ THỐNG GIAO DỊCH VẬT TƯ & TOÀN CỤC (10/07/2026)

Dựa trên phân tích hiện trạng hệ thống và yêu cầu nâng cấp, dưới đây là danh sách các lỗi và điểm cần cải thiện trước khi tiến hành code:

## A. Form tạo đề xuất vật tư (Material Request Form)
- **Lỗi hiển thị Dropdown:** Dropdown "Công việc liên quan" bị bung quá cao/quá dài, vượt khỏi drawer và gần như tràn ra ngoài màn hình, gây khó khăn cho thao tác.
- **Dữ liệu không rõ ràng:** Các option dạng `FP-G01 -` bị thiếu tên công việc sau dấu gạch ngang, gây khó hiểu cho người dùng.
- **Sai thành phần UI:** Đang sử dụng native `<select>` hoặc component không có search nội bộ, không phù hợp với danh sách dài như WBS/công việc hoặc danh mục vật tư. Cần chuyển sang Combobox (EnterpriseCombobox) có hỗ trợ tìm kiếm.

## B. Tab Nhập/Xuất (Material Transactions)
- **Giao diện thô sơ:** Giao diện đang là một log table thô, thiếu Command Center (bảng điều khiển trung tâm).
- **Thiếu KPI:** Không có các chỉ số tổng quan như: tổng nhập/tổng xuất/số giao dịch hôm nay/vật tư xuất nhiều/cảnh báo xuất âm.
- **Hiển thị dữ liệu kém:** Cột ghi chú (Note) đang hiển thị chuỗi seed/test dài, phá vỡ layout, không thân thiện.
- **Thiếu tính năng:** 
  - Chưa có drawer chi tiết giao dịch để xem kỹ thông tin.
  - Chưa có bộ lọc (filter) theo loại nhập/xuất, vật tư, khoảng ngày, người tạo.
  - Chưa có liên kết nghiệp vụ với phiếu yêu cầu vật tư đã duyệt.
- **Lỗi Date:** Hiển thị ngày tháng chưa thống nhất chuẩn định dạng.

## C. Modal Nhập kho/Xuất kho (Transaction Form)
- **Lỗi định dạng Date-time:** Date-time đang hiển thị kiểu không chuẩn Việt Nam (ví dụ `10/7/2026 07:24 SA`), cần chuẩn hóa lại.
- **UI không đồng bộ:** Modal chưa đồng bộ với hệ thống overlay/drawer chuẩn hiện tại của toàn hệ thống (lạc tone).
- **Thiếu thông tin quan trọng:** Form thiếu các thông tin như tồn kho hiện tại, đơn vị tính, tồn sau giao dịch.
- **Thiếu ràng buộc (Guard):** Xuất kho cần chặn/cảnh báo không cho xuất quá tồn kho (trừ khi hệ thống có cấu hình cho phép âm kho).
- **Thiếu liên kết chứng từ:** Thiếu liên kết với phiếu yêu cầu vật tư nếu giao dịch xuất kho phát sinh từ yêu cầu đã được duyệt.

---
**Kết luận Phase 0:** Đã ghi nhận đầy đủ các vấn đề về overflow của dropdown, lỗi hiển thị datetime và các thiếu sót nghiêm trọng trong luồng nghiệp vụ Nhập/Xuất vật tư. Các Phase tiếp theo sẽ giải quyết triệt để từng vấn đề này.
