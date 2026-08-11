# BÁO CÁO FIX LỖI ĐỒNG BỘ ĐỊA ĐIỂM CÔNG TRÌNH TRONG EDIT MODE
## MATERIAL PROPOSAL V2 — MICRO FIX 02.1

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Quyết định cuối cùng:** **PASS**

---

### 1. Previous False PASS Analysis
- Trong đợt kiểm thử Round 2 trước đó, kịch bản tạo mới proposal (Create Mode) đã vượt qua kiểm thử auto-fill địa điểm. Tuy nhiên, kịch bản chỉnh sửa proposal có sẵn (Edit Mode: `/materials/proposals/new?edit=...`) bị bỏ sót dẫn tới báo cáo PASS không phản ánh đúng runtime thực tế.

---

### 2. Root Cause
- Nguyên nhân nằm ở hàm `handleSelectProject` trong `src/components/materials/material-proposal-form.tsx`:
  ```tsx
  const handleSelectProject = (p: ProjectOption) => {
    setProjectId(p.id);
    setIsProjectOpen(false);
    if (!isEditing) {
      setProjectLocation(p.location ?? "");
    }
  };
  ```
- Khi mở proposal ở Edit Mode, `isEditing = true` làm điều kiện `!isEditing` nhận giá trị `false`. Khi người dùng click chọn công trình mới trong Combobox, `setProjectId` đổi sang project mới nhưng `setProjectLocation` bị bỏ qua, dẫn tới việc giữ nguyên địa điểm của project cũ.

---

### 3. Edit-mode Handler Fix
- Đã loại bỏ hoàn toàn điều kiện `if (!isEditing)` trong `handleSelectProject`:
  ```tsx
  // Handle Project Selection from Combobox (Both Create & Edit Mode)
  const handleSelectProject = (p: ProjectOption) => {
    setProjectId(p.id);
    setProjectLocation(p.location ?? "");
    setIsProjectOpen(false);
  };
  ```
- **Quy tắc hoạt động chính xác:**
  - **Khi mở trang Edit (Initial Load):** `initialProposal.projectLocationSnapshot` là Source of Truth. Địa điểm được nạp đúng lịch sử snapshot.
  - **Khi người dùng chủ động chọn Project khác trong Combobox (dù Create hay Edit Mode):** Hệ thống lập tức điền `p.location ?? ""` vào ô `ĐỊA ĐIỂM` ngay trong 1 interaction duy nhất.

---

### 4. Project + Location State Consistency
- Trong React 18+ batching, `setProjectId(p.id)` và `setProjectLocation(p.location ?? "")` được cập nhật đồng thời.
- Hàm `performAutoSave` được trigger qua debounce `useEffect` (1000ms) sẽ nhận cặp giá trị đồng bộ `(projectId: p.id, projectLocationSnapshot: p.location ?? "")`.
- Không xảy ra tình trạng lưu tạm dữ liệu lệch giữa Project A và Location B hay ngược lại.

---

### 5. Editable Override
- Ngay sau khi địa điểm được tự động điền (ví dụ: `"Phường Xuân Phương"`), người dùng có toàn quyền click chuột, chỉnh sửa, gõ bổ sung (ví dụ: `"Phường Xuân Phương - ngõ 123"`).
- Giá trị chỉnh sửa tùy chỉnh của người dùng được lưu vào CSDL và bảo toàn tuyệt đối, không bị server ép reset về `project.location` ban đầu.

---

### 6. Clear Location Persistence
- Khi người dùng xóa toàn bộ nội dung ô Địa điểm (chuỗi rỗng `""`):
  - Client gửi `projectLocationSnapshot: ""` tới server.
  - Server lưu `projectLocationSnapshot = null` vào CSDL.
  - Khi reload hoặc mở lại proposal, ô Địa điểm tiếp tục giữ trống (`""`), không bị fallback về địa điểm mặc định của công trình.

---

### 7. Reload Snapshot Test
- Đã kiểm thử nạp proposal có snapshot tùy chỉnh: `"Phường Vĩnh Tuy - ngõ 477 Kim Ngưu"`.
- Kết quả: Khi mở trang chỉnh sửa, ô Địa điểm hiển thị đúng `"Phường Vĩnh Tuy - ngõ 477 Kim Ngưu"`, không bị đè bởi địa điểm mặc định của project.

---

### 8. Project A → B Runtime Test (In Edit Mode)
- **Bắt đầu (Project CT-2026-0011):** Địa điểm hiển thị `"Phường Vĩnh Tuy - ngõ 477 Kim Ngưu"`.
- **Thao tác 1 (Chọn CT-2026-0015):** Ô Địa điểm chuyển ngay lập tức thành `"Phường Xuân Phương"`.
- **Thao tác 2 (Chọn CT-2026-0013):** Ô Địa điểm chuyển ngay lập tức thành `"Phường Láng"`.
- **Thao tác 3 (Sửa tùy chỉnh):** Nhập `"Phường Láng - vị trí thi công ngõ 718"`. Đợi Auto-save báo "Đã lưu" -> Reload (F5) -> Giữ nguyên `"Phường Láng - vị trí thi công ngõ 718"`.
- **Thao tác 4 (Xóa sạch):** Clear ô Địa điểm -> Đợi Auto-save -> Reload (F5) -> Ô Địa điểm giữ rỗng 100%.

---

### 9. Browser Console
- Console hoàn toàn sạch:
  - 0 Errors.
  - 0 Warnings.
  - 0 Mismatch/Hydration errors.

---

### 10. TypeScript
- Run `npx tsc --noEmit`: **0 LỖI (PASS)**.

---

### 11. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.

---

### 12. FINAL DECISION
**PASSED**
