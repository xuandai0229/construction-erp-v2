# Materials UI/Data Consistency Audit - 2026-07-10

## Phạm vi và nguồn quan sát

Người dùng yêu cầu Phase 0 không code. Báo cáo này chỉ phân tích từ mô tả ảnh trong prompt mới, code hiện tại và truy vấn database read-only.

Trong thread hiện tại không có file ảnh binary để mở bằng tool, nên phần "đọc ảnh" dựa trên lỗi người dùng mô tả từ ảnh:

- KPI Yêu cầu vật tư đang có 7 thẻ, dàn trải.
- Các tab Materials thiếu đồng bộ UI/UX.
- Form tạo đề xuất cần cho chọn từ danh mục và nhập tự do.
- Combobox trong drawer bị khuất/cắt gần sticky footer.
- Tab Nhập/Xuất KPI báo 18 nhưng bảng nhìn thấy khoảng 10 dòng.

## A. Vì sao KPI 7 thẻ hiện tại chưa hợp lý?

`src/components/material-request/material-request-list.tsx` đang render 7 KPI trong grid:

- Tổng phiếu
- Chờ duyệt
- Đang xử lý
- Đã nhận
- Thiếu vật tư
- Quá hạn
- Thiếu tồn

Vấn đề:

- 7 là số lẻ, ở desktop dễ tạo layout dàn trải và thiếu nhịp. Code hiện dùng `xl:grid-cols-7`, mỗi card bị hẹp khi viewport vừa phải.
- 1366px dễ rơi vào cảm giác card bị nén hoặc không đều, trong khi 6 card có thể chia 6 cột hoặc 3+3 rõ hơn.
- "Thiếu vật tư" và "Thiếu tồn" đều là cảnh báo thiếu, làm người dùng khó phân biệt KPI chính với alert phụ.
- KPI chính đang vừa dùng để điều hướng filter, vừa dùng để cảnh báo tồn kho. Alert tồn kho nên nằm gần filter/bảng nơi người dùng hành động, không chiếm một KPI chính.

## B. Thẻ nào nên bỏ khỏi KPI chính?

Nên bỏ khỏi KPI chính: **Thiếu tồn**.

Lý do:

- Đây là cảnh báo tồn kho theo item/request, không phải trạng thái vòng đời chính của phiếu.
- Nếu `stockRisk > 0`, hiển thị thành alert chip/banner nhỏ trong filter bar: `Không đủ tồn: N phiếu`.
- Nếu `stockRisk = 0`, không nên chiếm không gian KPI.

Giữ 6 KPI chính:

- Tổng phiếu
- Chờ duyệt
- Đang xử lý
- Đã nhận
- Thiếu vật tư
- Quá hạn

## C. Vì sao Materials module thiếu đồng bộ giữa các tab?

Các tab đang dùng nhiều pattern khác nhau:

- Yêu cầu vật tư: KPI custom button grid riêng, filter row riêng, table riêng.
- Nhập/Xuất: đã có command center mới nhưng dùng `KpiCard`, `FilterBar`, `EnterpriseTable` theo style khác.
- Tồn kho/Danh mục: có table/card/action riêng, drawer riêng.
- Form/drawer/dialog: có nơi dùng `AppDrawer`, có nơi dùng fixed dialog thủ công; footer/body padding khác nhau.

Cần chuẩn hóa lớp UI chung cho Materials:

- `MaterialKpiRibbon`
- `MaterialFilterBar`
- `MaterialDataTable`
- `MaterialDrawerSection`
- `MaterialEmptyState`
- `MaterialToolbar`

Mục tiêu là cùng density, typography, icon size, border, shadow, sticky header, hover row và empty state trên tất cả tab.

## D. Vì sao combobox bị khuất/cắt?

Nguyên nhân nhiều lớp:

- **Overflow container:** Drawer/body và dialog có các wrapper `overflow-hidden` hoặc `overflow-y-auto`. Dropdown absolute bên trong component sẽ bị clip nếu nằm trong ancestor overflow.
- **Sticky footer:** Form đề xuất có footer sticky bottom. Dropdown ở dòng gần cuối mở xuống sẽ bị footer phủ hoặc bị hết viewport.
- **Z-index:** Dropdown hiện dùng `z-[120]`, cao hơn drawer content, nhưng nếu vẫn nằm trong stacking/overflow context bị clip thì z-index không cứu được.
- **Không có collision detection:** Component hiện mở xuống mặc định, chưa tự đo khoảng trống phía dưới/phía trên.
- **Không portal:** Dropdown content đang render inline dưới trigger; do đó bị ràng buộc bởi parent overflow. Cần portal/fixed positioning hoặc tự tính `getBoundingClientRect`.

Kết luận kỹ thuật: phải sửa `EnterpriseCombobox` theo hướng fixed/portal-like, đo trigger rect, set width khớp trigger, tự chọn mở lên/xuống, có collision padding và max-height theo viewport.

## E. Với “Tên vật tư” nhập tự do

Schema hiện tại:

`MaterialRequestItem` có:

- `materialCode String?`
- `materialName String`
- `unit String`
- `requestedQuantity Decimal`
- `issuedQuantity Decimal`
- `receivedQuantity Decimal`
- `remainingQuantity Decimal`

Không thấy `materialItemId` trên `MaterialRequestItem`.

Kết luận:

- Có thể lưu vật tư ngoài danh mục bằng snapshot `materialName`, `materialCode` optional và `unit`.
- Không nên tự động tạo master `MaterialItem`, vì schema/action hiện tại không thể hiện confirm nghiệp vụ hoặc trace rằng request item sinh ra master item.
- Nếu muốn tạo master, cần UI explicit: checkbox/nút “Thêm vào danh mục vật tư”, confirm rõ code/unit/group/min stock, và server action transaction riêng. Không làm âm thầm.

## F. Với “Công việc liên quan” nhập tự do

Schema hiện tại:

`MaterialRequestItem` có:

- `wbsItemId String?`
- `fieldProgressItemId String?`
- `workItemNameSnapshot String?`
- `note String?`

Kết luận:

- Nếu chọn WBS/FieldProgressItem có sẵn: lưu đúng `wbsItemId` hoặc `fieldProgressItemId`.
- Nếu nhập mô tả tự do: có thể lưu an toàn vào `workItemNameSnapshot`.
- Nếu luồng hiện tại chưa map field này đầy đủ ở action, fallback an toàn là append vào note dòng vật tư theo format `Công việc liên quan: <text>`, nhưng schema đã có `workItemNameSnapshot`, nên nên dùng field này trước.
- Không tạo WBS item mới âm thầm.

## G. Với “Tổng giao dịch 18”

### Count lấy từ đâu?

Trong code hiện tại:

- Page gọi `getRecentTransactions(projectIdToLoad)`.
- `getRecentTransactions` query `prisma.materialMovement.findMany({ where: { projectId }, take: 50, orderBy: movementDate desc })`.
- Tab Nhập/Xuất tính KPI `Tổng giao dịch` bằng `filteredTransactions.length`.

### Database thật

Truy vấn read-only bằng Prisma trực tiếp:

```json
{
  "project": "CT-TAYHO-2026-001",
  "movementTotal": 18,
  "recentActionPayloadCount": 18,
  "materialTotal": 10,
  "requestTotal": 4
}
```

Kết luận DB:

- DB có đúng 18 `MaterialMovement` cho project hiện tại.
- Server action `take: 50` trả đủ 18 record.
- Schema `MaterialMovement` không có `deletedAt`, nên không có soft-delete movement bị tính thừa.

### Table render bao nhiêu record?

Trong `materials-transactions.tsx`, table render:

- Desktop: `filteredTransactions.map(...)`
- Mobile: `filteredTransactions.map(...)`
- Không có `.slice(0, 10)`.
- Không có pagination.
- Không có virtualized list.

### Vì sao người dùng chỉ thấy khoảng 10 dòng?

Nguyên nhân khả dĩ nhất: table nằm trong scroll container:

```tsx
<EnterpriseTable className="hidden md:block max-h-[min(640px,calc(100vh-260px))]">
```

Vì vậy chỉ nhìn thấy khoảng 10 dòng trong viewport, các dòng còn lại nằm trong scroll nội bộ. UI chưa nói rõ `18 giao dịch · đang hiển thị trong bảng cuộn`, nên người dùng hiểu là table chỉ có 10.

### Filter có làm KPI/table lệch nhau không?

Hiện KPI `Tổng giao dịch` và table cùng dùng `filteredTransactions`, nên filter không làm lệch count/table trong client. Tuy nhiên label `Nhập trong kỳ`/`Xuất trong kỳ` mơ hồ khi chưa có date range; nên đổi thành `Tổng nhập`/`Tổng xuất` nếu không có date range.

## Phase 0 kết luận

Chưa code trong phase này theo yêu cầu. Các việc cần làm tiếp:

- Chuẩn hóa Materials design system component.
- KPI Yêu cầu vật tư còn 6 thẻ, chuyển `Thiếu tồn` thành alert chip.
- Combobox creatable cho vật tư và công việc.
- Sửa `EnterpriseCombobox` tránh clip bằng fixed positioning/collision detection.
- Thêm script QA count consistency.
- Sửa UX Nhập/Xuất để diễn đạt rõ 18 record đang nằm trong scroll/pagination hoặc thêm pagination/load more.
