# Audit: Nguồn dữ liệu Hạng mục / Công việc cho Giám sát Tuần

**Ngày**: 2026-07-20  
**Mục đích**: Xác định chính xác nguồn dữ liệu Hạng mục chính để hiển thị trong dropdown báo cáo Giám sát Tuần.

## 1. Model cơ sở dữ liệu

| Field | Model | Giải thích |
|-------|-------|------------|
| `FieldProgressItem` | `prisma/schema.prisma:895` | Chứa cả Hạng mục chính (GROUP) và Công việc con (WORK) |
| `itemType` | enum `FieldProgressItemType` | `GROUP` = Hạng mục chính, `WORK` = Công việc con |
| `parentId` | string? | NULL = root hoặc level 0, có giá trị = con của item khác |
| `categoryName` | string? | Tên hạng mục (dùng cho GROUP) |
| `workContent` | string? | Nội dung công việc (dùng cho WORK) |
| `level` | int | Cấp trong hierarchy |

## 2. Phân loại node

| Dữ liệu | Ví dụ | Model | Điều kiện nhận diện | Được chọn trong báo cáo |
|----------|-------|-------|---------------------|------------------------|
| Project root | Dự án văn phòng... | `Project` | Model riêng | ❌ Không |
| Hạng mục chính | Công tác chuẩn bị | `FieldProgressItem` | `itemType = GROUP` | ✅ **Có** |
| Hạng mục chính | Phần móng | `FieldProgressItem` | `itemType = GROUP` | ✅ **Có** |
| Hạng mục chính | Phần thân | `FieldProgressItem` | `itemType = GROUP` | ✅ **Có** |
| Hạng mục chính | Hoàn thiện | `FieldProgressItem` | `itemType = GROUP` | ✅ **Có** |
| Công việc con | Dọn dẹp mặt bằng | `FieldProgressItem` | `itemType = WORK` | ❌ Không |
| Công việc con | Đào đất hố móng | `FieldProgressItem` | `itemType = WORK` | ❌ Không |
| Công việc con | Đổ bê tông lót móng | `FieldProgressItem` | `itemType = WORK` | ❌ Không |
| Task/Nhiệm vụ | - | `Task` (Work Management) | Model riêng | ❌ Không |

## 3. Trước khi sửa

- Query `getSupervisionWeeklySourceOptions()` fetch cả `GROUP` và `WORK`
- Nhưng filter chỉ return `WORK` items → Sai ngược: hiển thị Công việc con thay vì Hạng mục chính

## 4. Sau khi sửa

- Query chỉ fetch `itemType = "GROUP"` → Chỉ Hạng mục chính
- Server validation kiểm tra `workItemId` phải thuộc item có `itemType = "GROUP"`
- Từ chối request nếu `workItemId` trỏ tới Công việc con (`WORK`)

## 5. Tương thích dữ liệu cũ

- Hồ sơ cũ đã lưu `workItemId` trỏ tới WORK item:
  - **Không xóa** dữ liệu cũ
  - Hiển thị snapshot cũ (`workItemNameSnapshot`) cho mục đọc
  - Khi sửa row, dropdown mới chỉ cho chọn GROUP
  - Server validation **chỉ áp dụng khi lưu mới**, không block đọc dữ liệu cũ

## 6. Người dùng vẫn có thể

- Chọn Hạng mục từ dropdown (chỉ GROUP)
- Nhập Hạng mục khác bằng tay (ô "Hoặc nhập hạng mục khác")
- Nhập cả Công trình và Hạng mục bằng tay
- Không buộc hạng mục phải tồn tại trong danh mục
