# Báo cáo audit tiếng Việt trước khi sửa

Ngày audit: 13/07/2026 (ICT)

## Phạm vi và phương pháp

- Đã liệt kê **1.423** tệp văn bản thuộc các đuôi được yêu cầu trong repository, bỏ qua `node_modules`, `.next`, lockfile, báo cáo sinh tự động và thư mục build/test output.
- Trọng tâm mã chạy gồm **264** tệp dưới `src`, **20** tệp Prisma và **542** script; phần còn lại là tài liệu, cấu hình và dữ liệu QA.
- Quét bằng `rg` theo từ khóa không dấu, cụm tiếng Anh UI, thông báo API/toast/error, accessibility và mapping enum. Sau đó đọc ngữ cảnh từng kết quả trước khi xếp loại.
- Ứng dụng dùng Next.js App Router và hard-code chuỗi UI; không phát hiện thư viện locale/i18n riêng. Các formatter hiện có đã dùng `vi-VN` ở nhiều màn hình.

## Kết quả baseline đã phân loại

| Nhóm lỗi | Số vấn đề logic | Phạm vi chính |
| --- | ---: | --- |
| Tiếng Việt không dấu | 34 | Sidebar, thông báo permission, toast, test tên tệp |
| Tiếng Anh có thể trả về người dùng | 60 | Server actions, API route, validation ngày tháng |
| Viết tắt UI khó hiểu | 14 | CĐT, KL, BC, TT/QT trong một số bảng/label |
| Chính tả/dấu | 0 | Không thấy lỗi rõ ràng trong chuỗi UI đã duyệt thủ công |
| Thuật ngữ không thống nhất | 2 | “Dự án” thay cho “Công trình” tại fallback UI; “Duyệt”/“Phê duyệt” trong chuỗi trạng thái |

Con số là số vấn đề logic sau khi gộp các bản sao cùng thông báo, không phải số lần khớp regex.

## Module có nhiều vấn đề nhất

1. `components/layout/sidebar.tsx` — toàn bộ điều hướng và thương hiệu không dấu.
2. `lib/reports/report-transition-service.ts` — thông báo workflow không dấu.
3. API/server action của báo cáo, vật tư và khối lượng — mã lỗi tiếng Anh có thể được hiển thị qua toast hoặc response.
4. Bảng công việc/phiếu vật tư — vài toast không dấu và viết tắt độc lập.

## Nội dung không sửa tự động

- Enum Prisma, mã trạng thái, mã phiếu (`APPROVED`, `VT-*`, `TT-*`), model, route, query parameter, header HTTP và các keyword dùng để so khớp thư mục sau khi normalize: là hợp đồng kỹ thuật hoặc dữ liệu có thể đã phát hành.
- Script migration dữ liệu không dấu hiện hữu chỉ được xem là công cụ kỹ thuật; không chạy script và không thay dữ liệu database.
- Tài liệu lịch sử/archived QA chứa ví dụ cũ không phải nội dung runtime. Chúng được ghi nhận, không sửa để tránh làm sai bằng chứng lịch sử.
- Viết tắt `CĐT`, `KL`, `BC`, `TT/QT` trong bảng hẹp và mã/tên cột cần xem theo ngữ cảnh; các vị trí độc lập trên UI sẽ được viết đầy đủ, còn mã nghiệp vụ giữ nguyên.

## Rủi ro và danh sách sửa dự kiến

- Chỉ sửa literal hiển thị hoặc lỗi trực tiếp trả về client; không sửa cấu trúc dữ liệu hay enum.
- Các response API xác thực sẽ đổi sang tiếng Việt nhưng giữ nguyên status code và payload shape.
- Dữ liệu tên tệp trong test được cập nhật đồng thời input/expected để vẫn kiểm tra đúng hành vi.
- Dự kiến sửa `sidebar`, permission/service errors, API routes, field-progress actions, material request actions, date validators, toast và các báo cáo audit bắt buộc.
