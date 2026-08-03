# Settings refactor baseline

Thời điểm: 2026-08-03 (Asia/Bangkok)

## Repository và môi trường

- Branch/commit: `main` / `e55ff3c0c502fe02c5db2187799f64c9f9d0b04f`.
- Worktree trước refactor code: chỉ có thư mục `docs/audit/` chưa được theo dõi, được tạo bởi phiên audit Settings hiện tại. Không có file mã nguồn, staged file hoặc thay đổi ngoài phạm vi Settings do phiên này phát hiện.
- Node/npm: `v24.15.0` / `11.12.1`; Next `16.2.7`; Prisma client/package `7.8.0` theo `package.json`.
- Database: PostgreSQL local QA, `127.0.0.1:5432/construction_erp_v2_qa`; không ghi chuỗi kết nối, người dùng hay mật khẩu.
- Biến bắt buộc có trong `.env`: `DATABASE_URL`, `QA_DATABASE_URL`, `AUTH_SECRET`, `QA_SUPERVISION_E2E_PASSWORD` (chỉ ghi trạng thái có, không ghi giá trị).

## Runtime baseline

- Port 3000 ban đầu thuộc `next dev` do phiên kiểm tra trước khởi động. Tất cả `/`, `/login`, `/dashboard`, `/settings`, và một API route đều timeout 20 giây.
- Next trace cho thấy đây không riêng Settings: nhiều route dashboard compile/render đồng thời; process Next dev lên khoảng 2.2GB RSS và request Settings bị đánh dấu `failed`.
- Sau khi dừng đúng process dev treo và chạy `next start` từ build hiện có, `/login` trả 200 (47ms), `/`, `/dashboard`, `/settings` trả redirect 307 đến `/login` trong 11–110ms. Root cause tạm thời: Next dev/Turbopack process quá tải hoặc kẹt, không phải route Settings hay query database đã được chứng minh ở trạng thái chưa đăng nhập.
- Cần kiểm thử bằng session thật sau thay đổi để đóng gate hoàn toàn; không được coi redirect chưa đăng nhập là runtime PASS của Settings.

## Hiện trạng Settings và rủi ro cần xử lý

- Route đọc Settings hiện tự tạo `SystemSetting` nếu chưa có row và dùng default doanh nghiệp hard-code; vi phạm read-only read path.
- Save gửi toàn bộ profile, chưa tách section và chưa dùng optimistic concurrency mặc dù model có `version`.
- Route guard/action dùng `canManageUsers`, không phải permission Settings chuyên biệt.
- UI còn 7 section; 5 section chứa placeholder/disabled controls, KPI hard-code và reset toàn bộ.
- `maxUploadSizeMb` có trong Prisma nhưng thiếu validation/registry/UI; upload hiện không thực thi giới hạn kích thước trong policy.
- Company fields chưa có provider dùng chung cho output Word/PDF/report; thấy nguồn hard-code trong mẫu an toàn và default Supervision Weekly.

## File dự kiến thay đổi

- Settings: page, actions, workspace, validation, registry, system-settings.
- RBAC: permission types/registry và policy navigation cho `/settings`.
- Documents: upload validation và upload route; test liên quan.
- Company profile: service dùng chung; chỉ thay output có thể chứng minh an toàn trong phạm vi này.
- Tests, docs architecture/audit, package script dev nếu chứng minh fallback Webpack cần thiết.

## Giới hạn an toàn

- Không migration, không drop column, không reset DB, không xóa dữ liệu hay data test.
- Không chạy mutation test trước khi snapshot/cleanup an toàn; database đã xác nhận QA cục bộ.
- Không ghi secret hoặc dữ liệu doanh nghiệp nhạy cảm vào báo cáo.
