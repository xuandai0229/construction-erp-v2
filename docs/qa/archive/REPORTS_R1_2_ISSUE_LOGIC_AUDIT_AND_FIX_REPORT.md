# R1.2 Issue Logic Audit & Fix Report

## A. Executive Summary
- **R1.2 Phase Status**: PASS
- **Lỗi logic cũ**: Report được coi là "Có vấn đề" (hasIssues) chỉ dựa vào việc trường `issues` không rỗng, kể cả khi giá trị của nó là "Không có phát sinh...". Điều này khiến 16/16 report đều hiện "Có vấn đề" gây báo động sai. Ngoài ra, việc đếm tỷ lệ duyệt cũng đang gộp chung với Draft.
- **Đã sửa logic nào**:
  - `Có phát sinh` (hasIssues): Chỉ tính nếu `issues` khác rỗng VÀ KHÔNG bắt đầu bằng "Không" / "không có". Hoặc nếu có line nào đó chứa `issueNote` khác rỗng.
  - `Có ghi chú` (hasNotes): Chỉ tính nếu có chứa `note`, `summary` hợp lệ, hoặc `recommendations`.
  - `Vấn đề nghiêm trọng` (isSevereIssue): Chỉ báo động đỏ nếu nội dung có các từ khóa mức độ cao như "nguy hiểm", "tai nạn", "dừng thi công", "chậm tiến độ", v.v.
  - Tỷ lệ duyệt (Approval rate): Sửa thành chỉ đếm trên các báo cáo KHÔNG PHẢI LÀ DRAFT để phản ánh chính xác tỷ lệ hoàn thành hồ sơ đã gửi.
- **Có sửa dữ liệu không**: KHÔNG. Database không bị sửa đổi. Mọi logic đều được xử lý mapping ở code frontend và backend filter.
- **Production Status**: NO-GO (Chờ hoàn thành R2, R3b, R4).

## B. Issue logic audit

| Logic | Cũ | Mới | Ghi chú |
| ----- | -- | --- | ------- |
| **Có phát sinh** | `!!issues && issues !== ""` | `issues` tồn tại + không chứa chữ "Không có" / "Không" HOẶC có `issueNote` ở công việc | Loại trừ các báo cáo ghi mặc định "Không có phát sinh". |
| **Có ghi chú** | Không phân biệt với `Có phát sinh` | Có `note`, `summary`, hoặc `recommendations` | Hiển thị nhẹ nhàng, không tính vào KPI phát sinh. |
| **Vấn đề nghiêm trọng** | Không có | Lọc theo keywords (nguy hiểm, tai nạn, sạt lở...) | Highlight đỏ gắt để cảnh báo sếp. |
| **Tab Filter `issues`**| `issues != null` | Dùng `OR`, `AND`, `NOT` để loại bỏ "Không có" và thêm search `issueNote` | Trả về đúng số lượng report có phát sinh thật. |

## C. Data result

| Chỉ số | Trước | Sau | Ghi chú |
| ------ | ----: | --: | ------- |
| Total reports | 16 | 16 | Không đổi |
| Có phát sinh | 16 | 2 | Đúng thực tế (loại trừ các bản ghi "Không có") |
| Vấn đề nghiêm trọng | - | 0 | Do chưa có report nào có keyword nghiêm trọng |
| Có ghi chú | 0 | 14 | Các bản ghi không phát sinh nhưng có ghi chú hoặc đề xuất |
| Pending | 3 | 3 | Không đổi |
| Rejected | 1 | 1 | Không đổi |
| Draft | 1 | 1 | Không đổi |
| Approval rate | 68% (11/16) | 73% (11/15) | Đã loại trừ report DRAFT khỏi công thức |

## D. UI changes
- **Card dashboard**: Sửa nhãn "Có vấn đề" (màu đỏ) thành "Có phát sinh" và update logic đếm chính xác (từ 16 xuống 2).
- **Tab Có phát sinh**: Trả về chính xác 2 dòng, sync 1-1 với Card dashboard.
- **Badge table**:
  - Không còn báo đỏ toàn bộ.
  - 14/16 báo cáo hiển thị icon Alert cam nhạt + text "Có ghi chú".
  - 2/16 báo cáo hiển thị badge "Có phát sinh" (cam đậm).
- **Drawer**: Logic filter/hiển thị đã chuẩn hóa.
- **Mobile**: Giao diện KPI phản ánh chính xác số liệu mới trên màn nhỏ.

## E. Test/build
| Command | Result |
| :--- | :--- |
| `audit-reports-issue-logic.ts` | Hoàn thành - in ra log chi tiết 16 bản ghi |
| `test-reports-r1-2-issue-logic.ts`| Exit 0 (PASS - Đã match 100% logic với DB Tab filter) |
| `npx prisma validate` | Exit 0 |
| `npx tsc --noEmit` | Exit 0 |
| `npx eslint ...` | Exit 0 (Fix xong 5 errors cuối cùng của strict mode) |
| `npm run build` | Exit 0 (Thành công mượt mà) |

## F. Risks remaining
- R2 Weekly source linkage chưa làm
- R3b Edit/Delete/Withdraw/Cancel chưa làm
- R4 Project-level RBAC chưa làm
- R5 cleanup storage chưa làm
- Việc parse text "Không có" tuy đang hoạt động ổn nhưng mang tính hardcode. Tương lai cần thêm field boolean `hasIssues` hoặc `severity` ở tầng Database.
- Dữ liệu "Có phát sinh" (2) hiện do người dùng nhập test, có thể thay đổi sau này. FieldProgress new-entry auto APPROVED chưa update flow.

## G. Kết luận
- **Có được sang R2 không**: CÓ. Logic đã cứng cáp, UI sạch sẽ.
- **Có cần chỉnh seed data không**: KHÔNG CẦN, data tự nhiên với chữ "Không có" đang là test case hoàn hảo cho logic này.
- **Production GO/NO-GO**: NO-GO.

## H. Xác nhận
- Không commit.
- Không push.
- Không reset DB.
- Không xóa dữ liệu thật.
- Không cleanup storage.
- Không tạo migration.
