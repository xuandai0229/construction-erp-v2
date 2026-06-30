# EXECUTIVE DASHBOARD - BẢNG PHÂN TÍCH UAT VÀ KẾ HOẠCH SỬA CHỮA (DỰA TRÊN SKILL.MD)

| Khu vực      | Ảnh mẫu                          | Ảnh hiện tại            | Lỗi cụ thể        | Cách sửa          | File sửa                                       |
| ------------ | -------------------------------- | ----------------------- | ----------------- | ----------------- | ---------------------------------------------- |
| Topbar       | Search/bell/help/avatar/role đẹp | Có nhưng chưa premium   | Cần tinh lại      | Sửa topbar        | `header.tsx`                                   |
| Header       | Gọn, cân                         | Tạm ổn nhưng còn thưa   | Nén padding       | Sửa header        | `executive-header.tsx`                         |
| KPI          | Compact, icon đẹp                | Icon chưa giống         | Chuẩn hóa icon    | Sửa icon/KPI      | `executive-icon.tsx`, `executive-kpi-grid.tsx` |
| Action list  | 5 item đa dạng                   | Lặp WBS nhiều           | Query/seed sai    | Sửa data/action   | `dashboard-queries.ts`, seed                   |
| Progress     | 4 dòng có % rõ                   | Nhiều `--`              | Seed/rollup sai   | Sửa progress data | seed/query                                     |
| Finance      | Compact                          | Tạm ổn                  | Nén nhẹ           | Sửa finance       | `executive-finance-panel.tsx`                  |
| Activity     | 4 item compact                   | Gần đúng nhưng chưa đẹp | Nén + icon        | Sửa activity      | `executive-activity-feed.tsx`                  |
| Chart        | Gọn, cân                         | Còn cô lập              | Gắn layout đáy    | Sửa chart/layout  | `executive-status-chart.tsx`, dashboard        |
| Khoảng trắng | Không có vùng chết               | Vẫn có cảm giác thừa    | Layout chưa phẳng | Sửa grid          | `executive-dashboard.tsx`                      |
