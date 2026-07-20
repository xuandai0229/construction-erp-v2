# Audit miền dữ liệu nhập Báo cáo kết quả tuần Giám sát

Ngày audit: 20/07/2026. Database chỉ đọc: `construction_erp_v2_qa`, schema `public`, `127.0.0.1:5432`.

## Kết luận chính

Repository không có model Prisma tên `ProjectWorkItem`. Tên “work item” trong code Supervision Weekly chỉ là alias frontend cho `FieldProgressItem` có `itemType = WORK`. Dữ liệu thực tế xác nhận đây là **công tác thi công**, không phải tất cả đều là hạng mục.

Hệ thống có hai cấu trúc phân cấp khác:

- `ProjectLocationNode`: cây vị trí/bộ phận công trình, có `parentId`, `level`, `nodeType` như PROJECT, BUILDING, FLOOR, AREA, ROOM, AXIS. Đây là nguồn đúng cho “Hạng mục/khu vực/bộ phận” khi dữ liệu đã được khai báo.
- `WBSItem`: cây WBS có `parentId`, `code`, `name`, khối lượng và kế hoạch. Đây là cấu trúc phân rã công việc riêng, nhưng hiện Supervision Weekly không truy vấn nguồn này.

`WorkTask` là Nhiệm vụ của module điều phối công việc. Nó không được dùng làm nguồn báo cáo Giám sát và database QA hiện có 0 task. Không được trộn `WorkTask` vào danh sách công tác kiểm tra.

## Bảng thuật ngữ

| Khái niệm | Model nguồn | Ý nghĩa thực tế | Nhãn UI hiện tại | Nhãn UI đúng | Kết luận |
| --- | --- | --- | --- | --- | --- |
| Công trình | `Project` | Dự án/công trình được quản lý, có code, name, status | Công trình | Công trình | Đúng; phải lọc theo scope Giám sát |
| Hạng mục/khu vực/bộ phận | `ProjectLocationNode` | Cây vị trí vật lý theo dự án, ví dụ Khối nhà A > Tầng 1 | Không được dùng | Hạng mục/khu vực | Nguồn phù hợp nhất cho vị trí kiểm tra có cấu trúc |
| Hạng mục WBS | `WBSItem` | Cây phân rã phạm vi/khối lượng và kế hoạch | Không được dùng | Không đưa vào picker lần này | Không đồng nhất với vị trí; cần quyết định nghiệp vụ riêng nếu muốn tích hợp sau |
| Công tác | `FieldProgressItem` với `itemType = WORK` | Công tác thi công có code/workContent, thuộc một GROUP | Bị gọi là Hạng mục | Công tác có sẵn | Phải sửa nhãn; giữ `workItemId` để tương thích schema |
| Nhóm công tác | `FieldProgressItem` với `itemType = GROUP` | Nhóm/giai đoạn như Công tác chuẩn bị, Phần móng, Phần thân | Chỉ hiện gián tiếp qua category | Nhóm công tác/breadcrumb | Dùng để nhóm và tạo breadcrumb, không lưu như một công tác |
| Nhiệm vụ | `WorkTask` | Task điều phối có assignee, lifecycle, review, handover | Không dùng | Nhiệm vụ | Không dùng làm nguồn nhập báo cáo tuần |
| `ProjectWorkItem` | Không tồn tại | Tên gọi nhầm trong mô tả/component cũ | Hạng mục có sẵn | Công tác có sẵn (`FieldProgressItem WORK`) | Không tạo model giả, không tiếp tục gọi là Hạng mục |

## Bằng chứng schema

- `FieldProgressItem`: `parentId`, `level`, `itemType`, `code`, `categoryName`, `workContent`, `sortOrder`; quan hệ `parent/children`.
- `ProjectLocationNode`: `parentId`, `level`, `nodeType`, `code`, `name`; quan hệ `parent/children`.
- `WBSItem`: `parentId`, `code`, `name`, `designQuantity`, ngày kế hoạch; quan hệ `parent/children`.
- `WorkTask`: title/assignee/lifecycle và không có quan hệ với `SupervisionWeeklyEntry`.
- `getSupervisionWeeklyWorkItems()` hiện lọc `FieldProgressItem.itemType = WORK`, nhưng trả thiếu parent breadcrumb và gắn nhãn “Hạng mục”.

## Bằng chứng dữ liệu QA

- 1 project đang hoạt động.
- 34 `FieldProgressItem`: 5 GROUP và 29 WORK.
- Ví dụ GROUP: “Công tác chuẩn bị”, “Phần móng”, “Phần thân tầng 1 đến tầng 5”.
- Ví dụ WORK: “Dọn dẹp mặt bằng, bóc lớp hữu cơ”, “Gia công, lắp dựng cốt thép móng”, “Cốt thép dầm sàn tầng 1”. Đây rõ ràng là công tác.
- 3 `ProjectLocationNode`: Dự án văn phòng điều hành 5 tầng > Khối nhà A > Tầng 1.
- 2 WBS item trong dữ liệu QA; chúng thuộc bộ fixture khác và không phải nguồn hiện tại của Weekly.
- 0 `WorkTask`.

## Quyết định triển khai

1. Picker mới chỉ có hai cách người dùng hiểu được: “Chọn từ hệ thống” và “Nhập trực tiếp”.
2. Trong “Chọn từ hệ thống”: chọn Project; chọn `ProjectLocationNode` nếu có; chọn `FieldProgressItem WORK` và hiển thị GROUP làm breadcrumb; mô tả bổ sung là tùy chọn.
3. Backend tiếp tục dùng `inputMode` để tương thích, nhưng UI tự suy ra mode và không hiển thị enum.
4. Cần migration additive nullable cho `locationId`, `locationNameSnapshot` và `manualLocation` trên các row có nguồn. Lý do: schema hiện tại không thể giữ reference/snapshot vị trí có cấu trúc mà không nhét sai vào `workItemNameSnapshot`.
5. Cần bổ sung metadata khối lượng nullable cho Mục II/III để lưu raw input, unit code và text fallback qua reload. Không backfill suy diễn; dữ liệu cũ tiếp tục dùng các field hiện có.
6. Formatter chung là nguồn duy nhất để ghép Project, vị trí, công tác và mô tả bổ sung cho editor/preview/print.
