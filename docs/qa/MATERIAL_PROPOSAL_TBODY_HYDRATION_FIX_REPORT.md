# BÁO CÁO FIX LỖI RUNTIME: INVALID TABLE HTML / HYDRATION ERROR
## MÔ-ĐUN ĐỀ XUẤT VẬT TƯ (MATERIAL PROPOSAL V2)

**Dự án:** construction-erp-v2  
**Thời gian thực hiện:** 11/08/2026  
**Quyết định cuối cùng:** **PASS**

---

### 1. Root Cause
- **Nguyên nhân trực tiếp:** Trong hai file `material-proposal-form.tsx` và `[id]/page.tsx`, hàm `.map()` duyệt danh sách vật tư trả về thẻ `<tbody key={...} className="contents">` nằm bên trong thẻ `<tbody>` cha của bảng.
- **Hậu quả:** Gây ra cấu trúc HTML bất hợp lệ (`<tbody>` lồng trong `<tbody>`). Trình duyệt tự động sửa DOM bằng cách đóng/đẩy thẻ `tbody` sai quy chuẩn, dẫn đến lỗi **Hydration failed because the server rendered HTML didn't match the client** và cảnh báo React `validateDOMNesting`.

---

### 2. Files Affected
1. `src/components/materials/material-proposal-form.tsx`
2. `src/app/(dashboard)/materials/proposals/[id]/page.tsx`

---

### 3. Invalid DOM Before
```html
<!-- HTML BẤT HỢP LỆ TRƯỚC FIX -->
<table>
  <thead>...</thead>
  <tbody className="divide-y divide-slate-200 bg-white">
    <!-- TRONG HÀM MAP -->
    <tbody key="item-1" className="contents">
      <tr><!-- Section Header Row --></tr>
      <tr><!-- Material Item Row --></tr>
    </tbody>
    <tbody key="item-2" className="contents">
      <tr><!-- Material Item Row --></tr>
    </tbody>
  </tbody>
</table>
```

---

### 4. Valid DOM After
```html
<!-- HTML CHUẨN ĐÃ FIX (DÙNG REACT FRAGMENT) -->
<table>
  <thead>...</thead>
  <tbody className="divide-y divide-slate-200 bg-white">
    <!-- TRONG HÀM MAP -->
    <React.Fragment key="item-1">
      <tr><!-- Section Header Row --></tr>
      <tr><!-- Material Item Row --></tr>
    </React.Fragment>
    <React.Fragment key="item-2">
      <tr><!-- Material Item Row --></tr>
    </React.Fragment>
  </tbody>
</table>
```

---

### 5. Section Rendering Verification
- **Giữ nguyên 100% logic hiển thị nhóm:** Hàng tiêu đề nhóm (`PHẦN ĐIỆN NHẸ`) và hàng vật tư (`Dây mạng`, `Cáp thoại`) vẫn render dưới dạng các thẻ `<tr>` liền kề chuẩn xác.
- STT, dữ liệu, thứ tự dòng và trạng thái form không bị ảnh hưởng.

---

### 6. Create Page Runtime Result
- Truy cập `/materials/proposals/new?projectId=...`: Form load lập tức, thao tác nhập dữ liệu và thêm nhóm vật tư diễn ra mượt mà.
- **Kết quả:** Không xảy ra lỗi Hydration mismatch.

---

### 7. Detail Page Runtime Result
- Truy cập `/materials/proposals/[id]`: Trang chi tiết render 2 tầng header và bảng dữ liệu chuẩn HTML table semantics (`table > tbody > tr > td`).
- **Kết quả:** Không có cảnh báo hay lỗi nesting.

---

### 8. Browser Console Result
- **`In HTML, <tbody> cannot be a child of <tbody>`**: **0 LỖI (Đã biến mất hoàn toàn)**.
- **`Hydration failed because the server rendered HTML didn't match the client`**: **0 LỖI (Đã biến mất hoàn toàn)**.
- **React validateDOMNesting warnings**: **0 LỖI**.

---

### 9. TypeScript
- Run `npx tsc --noEmit`: **0 LỖI (PASS)**.

---

### 10. Lint
- Run `npx eslint src/components/materials src/app/(dashboard)/materials/proposals`: **0 LỖI (PASS)**.

---

### 11. Build
- Run `npm run build`: Biên dịch thành công **Exit code: 0 (PASS)**.

---

### 12. Changed Files
- `src/components/materials/material-proposal-form.tsx`: Thay `<tbody className="contents">` bằng `<Fragment key={...}>`.
- `src/app/(dashboard)/materials/proposals/[id]/page.tsx`: Thay `<tbody className="contents">` bằng `<Fragment key={...}>`.

---

### 13. FINAL DECISION
**PASSED**
