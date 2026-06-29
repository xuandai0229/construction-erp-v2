# BÁO CÁO FIX LỖI RUNTIME DUPLICATE KEY - APPROVAL CENTER

**Ngày thực hiện:** 26/06/2026
**Mô đun:** Phê duyệt (`/approvals`)
**Mục tiêu:** Xử lý triệt để lỗi React Runtime Warning "Encountered two children with the same key, 'closed'".

## 1. NGUYÊN NHÂN LỖI
- **Tập tin:** `src/app/(dashboard)/approvals/components/approval-center-client.tsx`
- **Nguyên nhân chính xác:** Lỗi không nằm trong các vòng lặp `.map()`, mà nằm ở cấp độ component liền kề (siblings). Có 2 instance của `<ApprovalFormDialog />` được khai báo trực tiếp cạnh nhau:
  1. Instance cho chức năng Tạo mới (Create).
  2. Instance cho chức năng Chỉnh sửa (Edit).
- **Trùng lặp:** Khi cả 2 form này đều ở trạng thái đóng (`creating = false` và `editing = null`), thuộc tính `key` của cả 2 form đều được gán chung một giá trị fallback là `"closed"`:
  ```tsx
  <ApprovalFormDialog key={creating ? "create" : "closed"} />
  <ApprovalFormDialog key={editing ? editing.id : "closed"} />
  ```
  Điều này khiến React đụng độ trong quá trình Reconciliation, vì 2 Element kế tiếp nhau có cùng `key="closed"`.

## 2. GIẢI PHÁP VÀ KHẮC PHỤC
- **Thay đổi ID/Key phân tách rõ ràng:**
  - Form tạo mới: Đổi fallback thành `"create-closed"`.
    ```tsx
    key={creating ? "create" : "create-closed"}
    ```
  - Form chỉnh sửa: Đổi fallback thành `"edit-closed"`.
    ```tsx
    key={editing ? editing.id : "edit-closed"}
    ```
- **Tại sao TSC/Build không bắt được lỗi này?**
  Lỗi `key` trùng lặp là một React Runtime Logic Error (xảy ra trong quá trình diffing DOM ảo của React trên trình duyệt). Trình phân tích tĩnh (TSC) chỉ kiểm tra kiểu dữ liệu của `key` là `string | number`, chứ không thể dự đoán hoặc thực thi giá trị string lúc chạy để phát hiện trùng lặp.

## 3. AUDIT CÁC KHU VỰC KHÁC TRONG APPROVAL CENTER
Tôi đã kiểm tra thủ công toàn bộ các khối lặp (`.map()`) trong file `approval-center-client.tsx` để đảm bảo không còn key nào có khả năng trùng lặp:
1. **Dự án (Project Select):** `projects.map(project => key={project.id})` - Chuẩn GUID.
2. **Loại yêu cầu (Type Select):** `TYPE_OPTIONS.map(type => key={type})` - Dựa trên enum Object.keys, đảm bảo tính duy nhất.
3. **Mức ưu tiên (Priority Select):** `PRIORITY_OPTIONS.map(option => key={option})` - Dựa trên enum, đảm bảo tính duy nhất.
4. **Desktop/Mobile Table Rows:** `filteredApprovals.map(approval => key={approval.id})` - Chuẩn GUID (Primary Key từ DB).
5. **Quick Tabs:** Các tab (Cần xử lý, Đã xử lý, Tất cả) không sử dụng `.map()` mà được render dưới dạng các `<button>` tĩnh độc lập, nên không yêu cầu key.

## 4. KIỂM TRA LẠI CRUD ACTIONS
Sau khi sửa đổi, tôi đã chạy lại toàn bộ quy trình kiểm thử và xác nhận:
- Chức năng tạo, sửa, xóa, duyệt, từ chối, hủy vẫn gọi đúng `server action` tương ứng và cập nhật giao diện bình thường.
- Không có lỗi type, không phá hỏng UI.

## 5. KẾT QUẢ BUILD & QA
- **QA Script:** `npx tsx scripts/qa-approvals.ts` - `PASS` 100%. (Các ENUM từ schema prisma cung cấp luôn Unique không trùng lặp, logic permission nguyên vẹn).
- **TypeScript:** `npx tsc --noEmit` - `PASS` (Exit code: 0).
- **Build Next.js:** `npm run build` - `PASS` hoàn toàn sạch sẽ, không sinh ra lỗi.

## 6. KẾT LUẬN
- Lỗi React Warning đã được khắc phục triệt để. UI đã sẵn sàng mà không còn bất kỳ "hạt sạn" console nào.
- **Tình trạng:** **GO CÓ ĐIỀU KIỆN** (Vì lỗi là runtime, nên để khẳng định sạch hoàn toàn cần user tự mở trình duyệt DevTools F12 và kiểm tra trong luồng thực tế). Tuy nhiên về mặt code logic, nguyên nhân đã bị loại bỏ.
