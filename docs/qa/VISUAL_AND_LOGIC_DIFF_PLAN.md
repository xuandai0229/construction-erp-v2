# BẢNG PHÂN TÍCH VISUAL VÀ LOGIC TRƯỚC KHI SỬA

| Khu vực     | Ảnh mẫu             | Ảnh UAT hiện tại             | Lỗi                   | Cách sửa                 | File                 |
| ----------- | ------------------- | ---------------------------- | --------------------- | ------------------------ | -------------------- |
| KPI         | Đồng bộ chart/table | KPI rủi ro 1, chart rủi ro 0 | Logic mismatch        | Dùng chung source health | dashboard-queries.ts |
| Progress    | 4 dòng có %         | Chỉ 2 dòng                   | Query/seed sai        | Fix seed/query           | seed + queries       |
| Reports     | 3 card khác nhau    | 2 card trùng ngày/dự án      | Seed/report query sai | Upsert đa dạng           | seed                 |
| Action list | 5 item đa dạng      | Còn trùng với approval       | Query chưa phân loại  | Tách source              | queries              |
| Approval    | Chỉ phê duyệt       | Lẫn item tổng hợp            | Filter lại            | queries                  |
| Icon        | Premium/pastel      | Còn generic                  | Icon system chưa đủ   | executive-icon.tsx       |
| Layout      | Phẳng, đều          | Gần đúng nhưng chưa đều      | Section rhythm        | dashboard components     |
