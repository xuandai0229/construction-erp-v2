# Daily Progress Cleanup Result 2026-07-04

- Project: CT-TAYHO-2026-001 / Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ
- Mode: APPLY_CLEANUP
- Soft-deleted entries: 0
- Cancelled QA-tag reports: 1
- Soft-deleted QA-tag lines: 2
- Không xóa `FieldProgressItem`, `FieldProgressTemplate`, `Project`, `User`, `Supplier`, `Contract`, `Document`.

| Chỉ số | Trước cleanup | Sau cleanup | Kết quả |
|---|---:|---:|---|
| Active FieldProgressEntry | 0 | 0 | PASS |
| Entry có marker SOURCE | 0 | 0 | PASS |
| Duplicate active project/date/item | 0 | 0 | PASS |
| Item over-design/remaining âm | 0 | 0 | PASS |
| SiteReport QA-tag active | 1 | 0 | PASS |

## Ghi chú xử lý báo cáo cũ

- Report có QA tag được soft-delete/cancel trong scope project test.
- Report không có tag rõ không bị xóa; nếu trước đó có progress entry thì entry đã bị soft-delete nên không còn tham gia tính khối lượng.
- Report cũ không tự sync lại sau cleanup trừ khi có thao tác submit/approve/reject/cancel lại trên chính report đó.
