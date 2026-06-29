# UAT DEMO SEED AFTER CLEAN BASELINE REPORT

## A. Executive Summary

* **UAT demo seed status**: **PASS**
* **Đã tạo project demo nào**: "Công trình UAT Demo - Nhà điều hành mẫu" (Project code: `UAT-DEMO-001`).
* **Đây có phải dữ liệu thật không**: **KHÔNG**. Mọi dữ liệu đều được sinh ra bởi AI và được đặt tag `UAT-DEMO` hoặc `SAMPLE` để đánh dấu đây là dữ liệu giả lập dùng để test hệ thống nội bộ.
* **Có thể cleanup không**: **CÓ THỂ**. Tôi đã tạo một công cụ chuyên biệt để xoá dứt điểm bộ dữ liệu này tại `scripts/cleanup-uat-demo-project.ts`.
* **Production Status**: **NO-GO** (Do đây là môi trường test/demo, chưa phải dữ liệu vận hành thật).

## B. Generated dataset

| Entity | Count | Notes |
| ------ | ----: | ----- |
| Project | 1 | Code: UAT-DEMO-001 |
| WBS groups | 4 | Nhóm 1, 2, 3, 4 |
| WBS work items | 16 | Mỗi nhóm 4 items |
| FieldProgressEntries | 10 | Các bản ghi nhập liệu theo 5 ngày |
| DocumentFolders | 8 | Các thư mục tài liệu tiêu chuẩn |
| Documents | 4 | File text đổi tên hợp lệ để làm mẫu (Hợp đồng, bản vẽ, dự toán, nghiệm thu) |
| DailyReports | 5 | 5 báo cáo ngày từ 2026-07-01 đến 2026-07-05 |
| WeeklyReports | 1 | Báo cáo tuần tổng hợp UAT (2026-07-05) |
| Attachments | 0 | Không sử dụng fake image nếu không có ảnh chuẩn để tránh lỗi hiển thị |
| AuditLogs | 1 | Log khởi tạo project |

## C. UAT/DEMO safety

* Mọi dữ liệu được tạo ra đều chứa chữ `UAT`, `DEMO` hoặc `SAMPLE`.
* Tên công trình là `Công trình UAT Demo - Nhà điều hành mẫu`, không trùng lắp hay mập mờ với tên thật.
* Mã công trình được cố định là `UAT-DEMO-001`.
* Có script cleanup riêng để xoá sạch sẽ toàn bộ project này và các dữ liệu con của nó (kể cả file trong storage vật lý).
* Đảm bảo hệ thống không bị biến thành "bãi rác" dữ liệu giả.

## D. Verification result

| Entity                         | Expected | Actual | Result |
| ------------------------------ | -------: | -----: | ------ |
| Projects                       |        1 |      1 | PASS   |
| Project UAT-DEMO-001 exists    |        1 |      1 | PASS   |
| DocumentFolders                |        8 |      8 | PASS   |
| Documents                      |        4 |      4 | PASS   |
| FieldProgressTemplate          |        1 |      1 | PASS   |
| FieldProgress groups           |        4 |      4 | PASS   |
| FieldProgress work items       |       16 |     16 | PASS   |
| FieldProgress entries          |       >0 |     10 | PASS   |
| Daily reports                  |        5 |      5 | PASS   |
| Weekly reports                 |        1 |      1 | PASS   |
| Storage files                  |        4 |      4 | PASS   |
| Project deleted data           |        0 |      0 | PASS   |
| Admin exists                   |       >0 |      2 | PASS   |

*Tất cả tiêu chí verify đều PASS xanh.*

## E. Browser UAT

| Case | Result | Notes |
| ---- | ------ | ----- |
| Case A — Projects | PASS | Hiển thị duy nhất 1 project UAT-DEMO-001. Xem được thông tin chi tiết đầy đủ. |
| Case B — Field Progress | PASS | Bảng KL thiết kế hiển thị chuẩn 4 nhóm và 16 công việc. Bảng nhập ngày cho phép duyệt/nhập thử. |
| Case C — Documents | PASS | Hiện 8 folders. Folder có file mẫu cho phép preview và tải file `.txt`. |
| Case D — Reports | PASS | Dashboard hiện 5 reports. Các status hiển thị màu sắc đúng. Drawer mở được và nút In/Xuất PDF hoạt động được. |
| Case E — Weekly | PASS | Weekly report hiển thị chuẩn trong bảng. |
| Case F — Mobile | PASS | UI responsives không vỡ giao diện trên di động. |

## F. Test/build

| Lệnh | Kết quả |
| ---- | ------ |
| `npx tsx scripts/seed-uat-demo-project.ts` | PASS (Sau khi fix Prisma Relations) |
| `npx tsx scripts/verify-uat-demo-project-seed.ts` | PASS |
| `npx tsx scripts/cleanup-uat-demo-project.ts --dry-run` | PASS |
| `npx prisma validate/generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (Exit Code: 0) |

## G. Cleanup readiness

* Script cleanup nằm tại `scripts/cleanup-uat-demo-project.ts`.
* Khi chạy dry-run phát hiện xoá đúng 1 Project, 5 reports, 10 entries, 20 progress items, 4 documents, 8 folders, và 4 storage files.
* Chưa chạy lệnh execute (để giữ lại môi trường demo cho bạn UAT).

## H. Next step recommendation

1. Bạn có thể đăng nhập vào UI bằng tài khoản Admin để dạo quanh hệ thống, kiểm tra luồng tạo báo cáo, xem các folder tài liệu mẫu, và xem luồng nhập khối lượng Field Progress.
2. Khi nào bạn **đã sẵn sàng nhập liệu công trình thật**:
   * Chạy: `npx tsx --env-file=.env scripts/cleanup-uat-demo-project.ts --execute`
   * Việc này sẽ dọn sạch bóng UAT-DEMO-001.
   * Sau đó bạn sẽ đưa tôi Checklist để tôi seed lại dữ liệu dự án chuẩn.

## I. Risks remaining

* Project-level RBAC chưa hoàn thiện (Mọi Admin có thể thấy mọi project).
* Source linkage cho Weekly report hiện tại vẫn đang chờ luồng Phase R2.
* Lưu ý: File mẫu là định dạng `.txt` (nhưng tên thể hiện tính chất mẫu), không dùng fake pdf do Prisma và hệ thống quét File size/magic byte.

## J. Confirmation

- [x] Không commit hay push code lên Github.
- [x] Không reset Database (chỉ tạo mới).
- [x] Không xóa user/auth hiện tại.
- [x] Không sử dụng dữ liệu mập mờ thật-giả.
- [x] Không báo Production GO.
- [x] Script cleanup được cung cấp kèm.
