# Đề xuất Phân tích: Thiết kế Subfolder & Smart Organization cho Documents

## 1. Executive Summary
Sau khi hoàn thành Phase B1 (cung cấp Metadata nền tảng, Status, và RBAC), hệ thống Documents hiện tại đang hoạt động theo kiến trúc phẳng (flat architecture) với 8 thư mục gốc cố định. Để giải quyết bài toán quản lý số lượng lớn tài liệu, báo cáo này phân tích 3 phương án: (A) Lọc theo Metadata, (B) Thư mục con vật lý có kiểm soát, và (C) Smart Folder (Virtual Folder tự động nhóm).

**Khuyến nghị chính (Hybrid):** Áp dụng ngay Phương án A (Smart Filter) kết hợp Phương án C (Auto Grouping theo `documentType` và `status`) dựa trên nền tảng B1 vừa xây dựng. Phương án B (Thư mục vật lý) nên lùi lại Phase B1.6 và bị giới hạn độ sâu (Depth = 2) để đảm bảo không phá vỡ cấu trúc RBAC 8 thư mục gốc.

---

## 2. Phân tích Hiện trạng (Current Architecture)
Qua phân tích Codebase hiện tại:
- **Schema**: `DocumentFolder` đã có sẵn field `parentId` và quan hệ `children` (đã hỗ trợ phân cấp dữ liệu ở mức DB).
- **UI Workspace**: `document-workspace.tsx` đã có component `FolderNode` render đệ quy. Tuy nhiên, logic UI hiện tại có lỗi: khi click vào folder con, folder cha mất trạng thái `isSelected`, dẫn đến folder con bị ẩn ngay lập tức.
- **Rules & RBAC**: `getDocumentRule` và các hàm phân quyền trong `permissions.ts` đang **phụ thuộc vào `folder.name`** (tên của 8 thư mục gốc). Nếu tạo folder con có tên khác, toàn bộ logic rules và upload sẽ bị lỗi hoặc không có quyền.
- **Upload Flow**: Đã hỗ trợ truyền metadata (`documentType`, `note`).

---

## 3. Phân tích 3 Phương án Quản lý tổ chức

### PHƯƠNG ÁN A: Không tạo folder con, dùng Filter / Smart View
Thay vì chia folder, thêm bộ lọc mạnh mẽ ở UI (Lọc theo Loại hồ sơ, Trạng thái, Ngày upload).
- **Ưu điểm**: Không cần sửa Schema. Không cần viết lại logic RBAC. Phù hợp ngay với kiến trúc hiện tại. Giữ chuẩn mực lưu trữ tập trung.
- **Nhược điểm**: Khác biệt với thói quen người dùng truyền thống (vốn quen xài Windows Explorer). Khi thư mục có hàng ngàn file, một danh sách phẳng dễ gây ngợp.
- **Đánh giá**: Dễ triển khai nhất, không cần migration. 

### PHƯƠNG ÁN B: Controlled Physical Subfolders (Folder con vật lý)
Cho phép tạo folder con bên trong 8 folder gốc, tối đa 2 cấp (Root -> Subfolder).
- **Ưu điểm**: Giống thói quen người dùng nhất. Cho phép linh hoạt tạo folder theo Hạng mục/Gói thầu.
- **Nhược điểm & Rủi ro**: 
  - Phải viết lại hoàn toàn cơ chế `getDocumentRule` và RBAC để **truy ngược (traverse)** về Root Folder (để biết folder con đó thuộc "04. Nghiệm thu" hay "05. Hóa đơn").
  - Quản lý Tree UI phức tạp (mở rộng/thu gọn độc lập với selection).
  - Phải chặn người dùng đổi tên/xóa 8 thư mục gốc, nhưng cho phép xóa thư mục con.
- **Đánh giá**: Cần code sâu, rủi ro làm vỡ hệ thống nếu không quản lý tốt `path` hoặc `rootId`.

### PHƯƠNG ÁN C: Smart Auto Grouping (Virtual Folders)
Folder hiển thị trên UI là "Thư mục ảo" tự sinh từ Metadata. 
- *Ví dụ:* Bấm vào "05. Hóa đơn VAT", UI tự động vẽ ra các folder ảo tương ứng với từng `Nhà cung cấp` hoặc `Tháng`.
- **Làm được ngay**: Nhóm theo `documentType` (VD: Hợp đồng chính, Phụ lục) hoặc `status` (Chờ duyệt, Đã duyệt).
- **Cần metadata tốt hơn**: Nhóm theo "Nhà cung cấp" hoặc "Hạng mục" (Đòi hỏi người dùng phải chọn đúng lúc upload, hiện tại chưa có list dropdown cho các trường này).

---

## 4. Đề xuất Schema (Nếu làm Phương án B - Subfolders)

Để giải quyết nhược điểm truy vấn RBAC của Phương án B, `DocumentFolder` cần nâng cấp:

```prisma
model DocumentFolder {
  id          String           @id @default(cuid())
  projectId   String
  parentId    String?
  rootId      String?          // TRƯỜNG MỚI: Trỏ thẳng về ID của 1 trong 8 thư mục gốc để check Rule & RBAC O(1)
  name        String
  sortOrder   Int              @default(0) // TRƯỜNG MỚI: Dùng cho UI kéo thả hoặc sắp xếp
  isSystem    Boolean          @default(false) // TRƯỜNG MỚI: True cho 8 thư mục gốc (không được phép xóa)
  
  parent      DocumentFolder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children    DocumentFolder[] @relation("FolderHierarchy")
  root        DocumentFolder?  @relation("FolderRoot", fields: [rootId], references: [id]) // Phục vụ truy xuất
  documents   Document[]
}
```
*Backward Compatibility*: Cần viết script migrate đánh dấu 8 folder hiện tại là `isSystem = true`, và `rootId = null`. Các folder con tạo sau sẽ copy `rootId` từ cha.

---

## 5. Đề xuất UI/UX cho Folder con
- **Sidebar**: Chuyển thành TreeView chuẩn (có icon Chevron để mở rộng/thu gọn, độc lập với việc bôi đen Folder).
- **Breadcrumb**: Thêm ở Header của Viewer: `Tài liệu > 04. Nghiệm thu > Tòa A > Đợt 1`.
- **Search**: Mặc định tìm kiếm trong thư mục hiện tại + thư mục con. 
- **Count Badge**: Hiển thị tổng file trực tiếp + file của con.
- **Di chuyển (Move)**: Thêm chức năng `Move to...` cho Document để sắp xếp lại vào các subfolder.

---

## 6. Đề xuất Folder Templates & Smart Suggestions

### Templates Gợi ý (Nên dùng Smart View thay vì Folder thật)
1. **01. Hợp đồng**: Phân loại theo `documentType` (HĐ Chính, Phụ lục, Bảo lãnh).
2. **02. Bản vẽ**: Phân loại theo `documentType` (Thiết kế, Shopdrawing, Hoàn công).
3. **04. Nghiệm thu**: Chỗ này **nên dùng Folder thật (Physical)** vì cấu trúc phân đợt/tầng rất khó lường.
4. **05. Hóa đơn**: Phân loại theo `Tháng` (Smart View).
5. **07. Hình ảnh**: Nhóm theo `Ngày chụp` (Smart View).

### Smart Suggestions
- **Nhận diện Thiếu Metadata**: File upload lên không có `documentType` -> Đưa vào nhóm "Chưa phân loại" (Cảnh báo vàng).
- **Gợi ý Gom nhóm**: Khi folder có > 50 file, UI tự hiển thị thanh thông báo: *"Thư mục đang có quá nhiều tài liệu, bạn có muốn bật chế độ tự động nhóm theo Loại hồ sơ?"*
- **Xử lý Hash trùng**: Khi `fileHash` trùng, gợi ý người dùng *"File này đã tồn tại ở [Thư mục X]. Bạn có muốn tạo một lối tắt (Shortcut) thay vì tải lại?"* (Phase nâng cao).

---

## 7. Đánh giá RBAC cho Thư mục con
- **Tính Kế thừa (Inheritance)**: Thư mục con **bắt buộc** kế thừa quyền của Thư mục gốc (`rootId`). Không làm Custom Permission per Subfolder ở giai đoạn này để tránh overload logic.
- Kỹ thuật viên có quyền upload vào Root 04 -> Sẽ có quyền upload vào mọi subfolder của Root 04.
- Việc Tạo/Sửa/Xóa subfolder: Chỉ dành cho `FULL_ACCESS` hoặc `MANAGER/CHIEF_COMMANDER`. Kỹ thuật viên không được tự ý tạo folder cấu trúc.
- 8 Thư mục gốc (`isSystem = true`) hoàn toàn không được đổi tên hoặc xóa.

---

## 8. Lộ trình triển khai (Roadmap)

- **Phase B1.5 (Hiện tại)**: Hoàn tất phân tích thiết kế, chốt phương án. Không code, không đụng vào repo.
- **Phase B2 (Smart Views & Filters - Ưu tiên làm trước)**:
  - Cập nhật UI Document Workspace.
  - Thêm thanh Filter (Status, DocumentType).
  - Thêm tính năng "Nhóm theo" (Group by) trực quan trên danh sách file, không làm đổi schema.
- **Phase B1.6 (Controlled Subfolders - Bổ sung sau)**:
  - Thêm `rootId`, `isSystem` vào DB. Migrate 8 folder.
  - Sửa đổi UI Tree, làm hàm "Tạo thư mục con".
  - Sửa đổi `getDocumentRule` và `permissions.ts` để đọc thông tin từ `rootFolder`.
- **Phase B3 (Advanced Organization)**:
  - Smart suggestions, Cảnh báo Hash trùng, Di chuyển file (Move).

**Quyết định cuối cùng (Final Recommendation):**
Tạm thời **KHÔNG** code Folder con vật lý ngay lập tức vì sẽ tốn rất nhiều thời gian sửa lại RBAC và Rules. Khuyến nghị bắt tay vào **Phase B2 (Smart View)**: cho phép người dùng gom nhóm danh sách file theo Loại hồ sơ / Trạng thái đã làm ở B1. Việc này đáp ứng được 80% nhu cầu "muốn xem file gọn gàng hơn" mà không làm phát sinh rủi ro kỹ thuật.
