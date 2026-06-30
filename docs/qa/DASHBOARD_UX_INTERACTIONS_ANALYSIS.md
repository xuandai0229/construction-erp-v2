# Phân tích Tương tác và UX Executive Dashboard

| Khu vực | Lỗi UAT | Nguyên nhân | File cần sửa | Tiêu chí nghiệm thu |
| :--- | :--- | :--- | :--- | :--- |
| **Global Project Switcher** | Tối ưu hiển thị danh sách dài, icon/chip status chưa map chuẩn. | Dropdown hiện tại chưa chia nhóm, icon chưa map chuẩn với tính chất project. | `global-project-context-switcher.tsx` | Nhóm danh sách, thêm icon chuẩn (CheckCircle2, HardHat, TriangleAlert). Đóng dropdown khi click ngoài. |
| **Search Icon Topbar** | Bấm không có tác dụng. | Chưa có handler. | `header.tsx` | Tạm ẩn hoặc Disabled kèm tooltip "Tính năng tìm kiếm toàn hệ thống đang phát triển". |
| **Help Icon Topbar** | Bấm không có tác dụng. | Icon rỗng. | `header.tsx` | Mở một Popover nhỏ "Hướng dẫn nhanh". |
| **Notification Bell** | Href click đi tới route chung chung. | URL tĩnh chưa có đủ param như `projectId`, `requestId`. | `project-context.ts`, `global-notification-bell.tsx` | URL chứa query `projectId=...`. Hover item rõ ràng. |
| **Header Chips** | 3 chip báo cáo không click được. | Dùng `div` text tĩnh. | `executive-header.tsx` | Đổi thành thẻ `<Link>` scroll `#anchor`. Có empty state. |
| **Dashboard Data/KPI** | Finance trả về 0, icon chưa chuẩn. | KPI query thiếu filter hoặc trống data thực. Icon dùng sai ngữ cảnh. | `dashboard-queries.ts`, `executive-finance-panel.tsx` | Nếu 0 thực sự do trống data, thêm text hướng dẫn. Đổi icon `HardHat` cho Đang thi công. |

*Lưu ý: Đã đọc và bám sát các nguyên tắc từ `SKILL.md`*
