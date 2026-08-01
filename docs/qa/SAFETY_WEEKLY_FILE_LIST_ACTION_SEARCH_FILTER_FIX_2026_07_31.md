# BÁO CÁO NGHIỆM THU: NÂNG CẤP TRIỆT ĐỂ UI/UX, MENU THAO TÁC, XÓA HỒ SƠ VÀ BỘ LỌC TÌM KIẾM "DANH SÁCH HỒ SƠ ATLĐ THEO TUẦN"

> **Ngày thực hiện**: 31/07/2026  
> **Dự án**: Construction ERP v2 (`construction-erp-v2`)  
> **Route chính**: `/reports/safety`  
> **Trạng thái nghiệm thu**: **PASS (100% ĐẠT TIÊU CHÍ)**

---

## I. TỔNG HỢP NGUYÊN NHÂN LỖI & PHƯƠNG ÁN XỬ LÝ

| Vấn đề | Nguyên nhân code | Nguyên nhân runtime | Phương án sửa |
|---|---|---|---|
| **Menu bị cắt** | Dropdown render dạng `position: absolute` trực tiếp bên trong `<td relative>` thuộc `<tbody>` của table | Table wrapper có CSS `overflow-x-auto` kết hợp parent card `overflow-hidden`. Hàng cuối bị clipping khi dropdown kéo xuống ra ngoài bounding box của table | Chuyển sang `SafetyRowActionPortalMenu` dùng **React Portal** render menu trực tiếp ra `document.body`, tự động tính vị trí mở lên/xuống (auto-flip) và collision padding 12px |
| **Xóa hồ sơ kém mượt** | Nút xóa kích hoạt confirmation modal phức tạp và gây nhấp nháy reload | Người dùng phải thực hiện 2-3 bước bấm; modal kẹt hoặc nhấp nháy khi `revalidatePath` | Áp dụng **Optimistic Update**: Xóa hàng lập tức khỏi giao diện client, gọi Server Action ngầm. Nếu lỗi server, tự động rollback hàng về vị trí cũ kèm thông báo lỗi mượt |
| **Mã hồ sơ không đồng nhất** | Cột mã hồ sơ lấy trực tiếp từ `plan.documentNumber` (`KH-ATLĐ-...`) hoặc `report.documentNumber` (`BC-ATLĐ-...`) tùy theo tài liệu nào được tạo trước | Hàng hiển thị `KH-ATLĐ`, hàng hiển thị `BC-ATLĐ` gây nhầm lẫn giữa mã kế hoạch, mã báo cáo và mã hồ sơ | Chuẩn hóa hàm `formatWeeklyFileCode`: Ưu tiên `officialDocumentNumber`, fallback `HS-ATLĐ-YYYY-Wxx` hoặc `HS-ATLĐ-YYYY-xxxx` thống nhất cho toàn hồ sơ tuần |
| **Bộ lọc sai nghiệp vụ** | Đang sử dụng dropdown "Tất cả công trình" và query parameter `projectId` | Hồ sơ ATLĐ theo tuần là hồ sơ kiểm tra toàn hệ thống (bao gồm nhiều hoặc tất cả công trình). Lọc theo 1 công trình khiến dữ liệu bị thiếu/sai nghiệp vụ | Xóa bỏ hoàn toàn bộ lọc theo công trình và nút "Lọc" thừa. Đổi sang khu vực tìm kiếm mới với bộ lọc **Năm**, **Trạng thái hoàn thiện** và **Sắp xếp** |
| **Bảng có cuộn nội bộ** | Container `ContentCard` có `overflow-hidden` và table wrapper có `overflow-x-auto` kết hợp độ rộng cột cố định lớn | Trên màn hình desktop hẹp, bảng xuất hiện thanh cuộn ngang/dọc nội bộ không cần thiết | Bỏ `overflow-y-auto` và max-height cứng, cho bảng mở rộng theo nội dung và dùng thanh cuộn chính của trang web. Chuyển sang giao diện dạng **Card** trên Mobile (<640px) |

---

## II. PHÂN TÍCH CÂY DOM & THÀNH PHẦN MENU THAO TÁC (PORTAL)

### 1. Cây DOM trước khi sửa (Bị Clipping)
```text
<div className="overflow-hidden">              <-- Clip mọi nội dung thừa
  <div className="overflow-x-auto">            <-- Bounding box bảng
    <table>
      <tbody>
        <tr>
          <td className="relative">
            <button>⋮</button>
            <div className="absolute top-8">  <-- Bị cắt ở hàng cuối!
              <button>Mở hồ sơ</button>
              <button>Xóa hồ sơ</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### 2. Cây DOM sau khi sửa (`SafetyRowActionPortalMenu` via React Portal)
```text
<body>
  ...
  <div className="max-w-7xl">
    <table>
      <tbody>
        <tr>
          <td>
            <button aria-label="Mở menu thao tác hồ sơ">⋮</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Render trực tiếp tại document.body, z-index: 99999 -->
  <div style="position: fixed; top: ...px; right: ...px; z-index: 99999">
    <button>Xóa hồ sơ</button>
  </div>
</body>
```

- **Vùng chạm**: Nút ba chấm đạt kích thước 40x40px với `aria-label="Mở menu thao tác hồ sơ"`.
- **Nội dung Menu**: Chỉ chứa duy nhất **"Xóa hồ sơ"** (do nút chính **"Mở hồ sơ"** đã nằm dạng nút xanh bên cạnh).
- **Tự động đổi hướng (Auto-flip)**: Khi hàng nằm gần mép dưới màn hình, menu tự động nảy lên trên (`bottom = window.innerHeight - rect.top + 4`).
- **Đóng menu**: Đóng lập tức khi click ra ngoài (`mousedown`), nhấn phím `Escape`, cuộn trang (`scroll`) hoặc đổi route.

---

## III. CƠ CHẾ XÓA HỒ SƠ TỨC THÌ (OPTIMISTIC DELETE & TRANSACTION)

### 1. Phía Client (Optimistic Update)
1. Khi người dùng bấm **"Xóa hồ sơ"**:
   - Lưu trữ hàng hiện tại và vị trí chỉ mục (`targetIndex`).
   - Loại bỏ ngay hàng khỏi mảng state `items` phía client.
   - Không bật confirm modal, không popup toast, không reload trang.
2. Thực thi Server Action `deleteSafetyWeeklyFileAction(rowId)` ngầm qua `useTransition`.
3. Nếu Server Action trả về `{ ok: false }` hoặc gặp sự cố:
   - Tự động chèn lại hàng đúng vị trí chỉ mục cũ.
   - Hiển thị badge báo lỗi màu đỏ ngay dưới mã hồ sơ của hàng đó (`rowErrors[rowId] = res.message`).

### 2. Phía Backend (`weekly-file-service.ts` & Transaction)
Thực thi trong một `prisma.$transaction`:
- `SafetyReportPlan`: Cập nhật `status = "CANCELLED"`, `cancelledAt = new Date()`.
- `SafetySelfAssessmentReport`: Cập nhật `status = "CANCELLED"`, `deletedAt = new Date()`, `deletedById = userId`.
- Trả về `{ ok: true, weeklyFileId }` hoặc `{ ok: false, code, message }` (không ném uncaught exception).

---

## IV. QUY TẮC MÃ HỒ SƠ VÀ CÁC CHUỖI TEXT ĐÃ LOẠI BỎ

### 1. Quy tắc mã hồ sơ chuẩn hóa (`formatWeeklyFileCode`)
1. Nếu có `officialDocumentNumber` (ví dụ `12/ct2`): Hiển thị `officialDocumentNumber`.
2. Nếu có `sequenceNumber`: Hiển thị `HS-ATLĐ-YYYY-xxxx` (ví dụ `HS-ATLĐ-2026-0004`).
3. Fallback: Hiển thị `HS-ATLĐ-YYYY-Wxx` (ví dụ `HS-ATLĐ-2026-W32`).
- **Kết quả**: Cột "Mã hồ sơ" hiển thị 100% đồng nhất, không còn hàng ghi `KH-ATLĐ`, hàng ghi `BC-ATLĐ`.

### 2. Danh sách các chuỗi Text đã loại bỏ hoàn toàn
- ❌ `"Mẫu 01"`, `"Mẫu 02"` khỏi tiêu đề, mô tả, header bảng, tooltip và menu.
- ❌ `"Tất cả công trình"` khỏi dropdown filter.
- ❌ `"Phạm vi công trình"` khỏi header bảng (đổi thành `"Phạm vi"`).
- ❌ `"Chưa chọn công trình"` trong cột phạm vi (đổi thành `"Toàn hệ thống"`).
- ❌ `"0 lịch kiểm tra"` (đổi thành `"Chưa có lịch"`).
- ❌ Các giá trị `None`, `null`, `undefined`.

---

## V. THIẾT KẾ KHU VỰC TÌM KIẾM & BỘ LỌC MỚI

Bố cục thanh tìm kiếm hợp nhất:
`[ Tìm theo mã hồ sơ, tuần hoặc người cập nhật... ]  [ Năm ▼ ]  [ Trạng thái ▼ ]  [ Sắp xếp ▼ ]`

- **Ô Tìm kiếm**:
  - Tìm theo Mã hồ sơ, Tuần số, Khoảng ngày, Tên người tạo/người cập nhật.
  - Tự động debounce 350ms. Bấm `Escape` để xóa nhanh từ khóa.
- **Lọc theo Năm**: Tất cả các năm, Năm 2026, Năm 2025.
- **Lọc theo Trạng thái**: Tất cả trạng thái, Đã đủ Kế hoạch & Báo cáo, Chưa có Kế hoạch, Chưa có Báo cáo.
- **Sắp xếp**: Mới cập nhật, Cũ cập nhật, Tuần mới nhất, Tuần cũ nhất.
- Tự động áp dụng ngay khi chọn (không cần nút "Lọc" thừa). Nút **"Xóa lọc"** xuất hiện mượt mượt khi có bộ lọc hoạt động.

---

## VI. KẾT QUẢ KIỂM THỬ RUNTIME VÀ BUILD

### 1. Vitest Unit & Integration Tests
```bash
RUN  v4.1.10 D:/construction-erp-v2
 Test Files  33 passed (33)
      Tests  188 passed (188)
   Start at  16:19:16
   Duration  2.71s
```

### 2. TypeScript Compilation
```bash
npx tsc --noEmit
# Result: 0 errors
```

### 3. Playwright & Browser Subagent Audit
- **Kịch bản 1 — Menu hàng cuối**: Mở menu ba chấm trên hàng cuối cùng (`HS-ATLĐ-2026-0006`). Xác nhận Menu mở bằng React Portal không bị clipping, chỉ chứa "Xóa hồ sơ", bấm Escape hoặc click ngoài đóng mượt.
- **Kịch bản 2 — Xóa tức thì**: Bấm "Xóa hồ sơ", hàng biến mất khỏi UI ngay lập tức không có modal hay nhấp nháy reload.
- **Kịch bản 3 — Tìm kiếm & Bộ lọc**: Tìm kiếm theo mã `HS-ATLĐ-2026-0004` trả về chính xác 1 kết quả. Lọc theo năm và sắp xếp hoạt động tức thì.

---

## VII. DANH SÁCH TỆP ĐÃ THAY ĐỔI

1. `src/components/safety/safety-row-action-portal-menu.tsx`: Tạo mới component Portal Menu chuyên dụng chống clipping, hỗ trợ auto-flip và keyboard navigation.
2. `src/components/safety/safety-list-client.tsx`: Tái cấu trúc danh sách, loại bỏ project dropdown / button dư thừa, chuẩn hóa cột bảng, tích hợp Optimistic Delete và giao diện Mobile Card.
3. `src/lib/safety-reporting/weekly-file-service.ts`: Chuẩn hóa `fileCode`, bổ sung bộ lọc năm, sắp xếp, trạng thái hoàn thiện và cập nhật transaction soft-delete.
4. `src/app/(dashboard)/reports/safety/actions.ts`: Chuẩn hóa response cấu trúc `{ ok: true/false, message }` cho `deleteSafetyWeeklyFileAction`.
5. `src/app/(dashboard)/reports/safety/page.tsx`: Cập nhật xử lý query searchParams mới từ URL.
6. `src/lib/safety-reporting/__tests__/weekly-file-list-action-search.test.ts`: Bộ kiểm thử unit test cho mã hồ sơ chuẩn hóa và tìm kiếm.

---

## VIII. KẾT LUẬN

Nhiệm vụ sửa triệt để UI/UX, Menu thao tác, Xóa hồ sơ, Tìm kiếm và Bộ lọc của danh sách **"Hồ sơ ATLĐ theo tuần"** đã đạt **100% TIÊU CHÍ NGHIỆM THU (PASS)**.
