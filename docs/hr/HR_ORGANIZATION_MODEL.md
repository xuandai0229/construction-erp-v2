# HR Organization Model — Mô Hình Cơ Cấu Tổ Chức & Phân Công Lao Động Doanh Nghiệp Xây Dựng

**Phiên bản:** 1.1.0  
**Tác giả:** Chuyên Gia Phân Tích Nghiệp Vụ Xây Dựng  
**Trạng thái Kiểm toán:** VERIFIED CURRENT  

---

## I. ĐẶC THÙ TỔ CHỨC TRONG DOANH NGHIỆP XÂY DỰNG

Doanh nghiệp xây dựng có cơ cấu 2 trục song song:
1. **Trục Hành Chính Cố Định (Administrative Tree):** Khối Văn phòng tổng công ty, các phòng ban chuyên môn (Nhân sự, Tài chính - Kế toán, Kỹ thuật, Kế hoạch, Vật tư, An toàn, Pháp chế). Cơ cấu này ổn định dài hạn.
2. **Trục Điều Động Hiện Trường (Site Project Dispatch):** Các Ban Điều hành dự án / Công trình xây dựng. Đây là các thực thể dự án động có ngày bắt đầu và kết thúc, nhận lực lượng điều động từ trục hành chính.

---

## II. THIẾT KẾ CÂY TỔ CHỨC LINH HOẠT (ORGANIZATION TREE)

Cơ cấu tổ chức được lưu dưới dạng cây n-cấp trong `OrganizationUnit`:

```
TỔNG CÔNG TY XÂY DỰNG
├── Ban Tổng Giám Đốc
├── Khối Văn Phòng
│   ├── Phòng Nhân sự
│   ├── Phòng Tài chính - Kế toán
│   ├── Phòng Kỹ thuật - Công nghệ
│   ├── Phòng Kế hoạch - Đấu thầu
│   ├── Phòng Vật tư - Thiết bị
│   └── Phòng An toàn lao động (HSE)
└── Ban Điều Hành Các Dự Án
```

### Các Quy Tắc Bất Biến Cây Tổ Chức:
1. Một đơn vị con phải tham chiếu `parentId` hợp lệ.
2. Ngăn chặn chu trình trong cây sơ đồ tổ chức (Child không được làm Parent của chính tổ tiên mình).
3. Không cho phép vô hiệu hóa (`isActive = false`) đơn vị khi còn:
   - Các đơn vị con đang `active`.
   - Nhân viên đang có phân công chính đang hiệu lực.
   - Trưởng đơn vị đang có nhiệm kỳ hiệu lực.

---

## III. THIẾT KẾ QUẢN LÝ VỊ TRÍ HẠN ĐỊNH VÀ HIỆN TRƯỜNG

### 1. Danh Mục Chức Danh Hành Chính (`Position`) — VERIFIED CURRENT
- Định nghĩa các vị trí chức danh hành chính trong công ty (`Trưởng phòng`, `Phó phòng`, `Chuyên viên`...).
- Dữ liệu vị trí là danh mục động, cấp bậc (level) từ 1 đến 10.
- Không thể vô hiệu hóa chức danh nếu còn nhân viên đang đảm nhận.

### 2. Danh Mục Vai Trò Công Trình (`ProjectPersonnelRole`) — VERIFIED CURRENT
- Định nghĩa các vị trí thực tế tại hiện trường công trường:
  - `Giám đốc dự án` / `Chỉ huy trưởng`
  - `Chỉ huy phó`
  - `Kỹ sư hiện trường` / `Kỹ sư QS` / `Kỹ sư QA/QC`
  - `Cán bộ An toàn (HSE)` / `Cán bộ Vật tư` / `Thủ kho`
- Danh mục này quản lý bằng cấu hình trong database, không hard-code enum.

---

## IV. QUY TRÌNH ĐIỀU CHUYỂN VÀ QUẢN LÝ THỜI GIAN (EFFECTIVE-DATE)

Tất cả các bản ghi phân công phòng ban (`EmployeeOrganizationAssignment`) và bổ nhiệm quản lý (`OrganizationUnitManagerAssignment`) tuân theo quy tắc thời gian nửa mở:

$$\text{Khoảng hiệu lực} = [\text{startDate}, \text{endDate})$$

### Quy Tắc Chuyển Đổi Tại Ngày D:
1. Bản ghi cũ: Cập nhật `endDate = D`.
2. Bản ghi mới: Tạo mới với `startDate = D` và `endDate = null`.
3. Đảm bảo không tồn tại khoảng thời gian chồng lấn cho cùng một nhân viên hoặc đơn vị.
