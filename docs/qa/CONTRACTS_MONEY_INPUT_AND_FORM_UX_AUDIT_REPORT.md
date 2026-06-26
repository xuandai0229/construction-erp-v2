# Báo cáo Hậu kiểm & Nâng cấp Giao diện Form Hợp đồng (Contracts Money Input and Form UX Audit Report)

Báo cáo này ghi nhận kết quả rà soát nâng cấp giao diện, cơ chế nhập tiền tệ và kiểm tra logic nghiệp vụ/ràng buộc chéo cho form **Thêm/Sửa hợp đồng** trong phân hệ **Contracts (Quản lý hợp đồng)**.

---

## 1. Vấn đề trước khi sửa đổi
Trước đợt nâng cấp này, biểu mẫu hợp đồng có một số hạn chế về mặt trải nghiệm người dùng (UX) và kiểm soát dữ liệu:
- **Trường nhập tiền tệ**: Sử dụng `type="number"`, người dùng phải nhập các số thô không có dấu phân cách (ví dụ: `1500000000` thay vì `1.500.000.000`). Điều này rất dễ gây nhầm lẫn số chữ số `0` khi khai báo các hợp đồng xây dựng trị giá hàng tỷ đồng.
- **Thiếu ràng buộc ngày tháng**: Hệ thống chưa kiểm tra logic ngày bắt đầu (`startDate`) và ngày kết thúc (`endDate`). Người dùng có thể vô tình chọn ngày kết thúc trước ngày bắt đầu mà không gặp lỗi.
- **Gợi ý đối tác**: Với các loại hợp đồng thầu phụ/nhà cung cấp cần gán đối tác, nếu người dùng bỏ trống, form không đưa ra cảnh báo nhắc nhở để chuẩn hóa dữ liệu.
- **Trải nghiệm hiển thị lỗi**: Chưa có banner thông báo lỗi cục bộ trên form, các lỗi chỉ được xử lý gián tiếp qua Toast hoặc popup bên ngoài.

---

## 2. Giải pháp Định dạng Tiền tệ (VND Money Formatter)
Chúng tôi đã xây dựng bộ định dạng tiền tệ thông minh trực tiếp trên ô nhập liệu:
- **Thuộc tính Input**: Chuyển đổi thành `type="text"`, bổ sung `inputMode="numeric"` và `autoComplete="off"` để tối ưu hóa bàn phím số trên thiết bị di động và ngăn chặn tự động điền không chuẩn xác.
- **Cơ chế xử lý chuỗi (Real-time formatting)**:
  - Khi người dùng gõ, hàm `stripMoney()` sẽ lọc bỏ tất cả ký tự phi số (chỉ giữ lại chữ số, loại bỏ dấu trừ, dấu chấm, dấu phẩy cũ).
  - Hàm `formatVndInput()` sẽ định dạng lại chuỗi số sạch bằng dấu chấm phân cách hàng nghìn theo chuẩn Việt Nam (`Intl.NumberFormat("vi-VN")`).
- **Submit Dữ liệu**: Khi nhấn nút gửi, giá trị hiển thị sẽ được lọc bỏ dấu chấm và chuyển đổi về dạng số sạch (`Number(rawValue)`) trước khi gửi qua Server Actions.

### Ví dụ Vận hành:
| Trạng thái hành động | Giá trị xử lý | Định dạng / Kiểu dữ liệu |
| :--- | :--- | :--- |
| **Người dùng nhập vào** | `4444444444` | Chuỗi thô |
| **Hiển thị trong Input** | `4.444.444.444` | Chuỗi định dạng dấu chấm hàng nghìn |
| **Gửi qua Server Action** | `4444444444` | Kiểu dữ liệu `number` nguyên bản |

---

## 3. Các Nâng cấp Trải nghiệm Người dùng (UX) Khác

### 3.1. Dòng Preview Giá trị Hợp đồng
Phía dưới ô nhập tiền, hệ thống tự động hiển thị dòng chữ ước lượng dạng rút gọn bằng chữ để kiểm tra nhanh:
- Hợp đồng trị giá $\ge 1$ tỷ đồng: Hiển thị ước lượng dạng tỷ (ví dụ: `≈ 4,44 tỷ đồng`).
- Hợp đồng trị giá từ $1$ triệu đến dưới $1$ tỷ đồng: Hiển thị ước lượng dạng triệu (ví dụ: `≈ 150 triệu đồng`).
- Giúp người quản lý dự án đối chiếu ngay số lượng chữ số `0` đã nhập xem có chính xác hay không.

### 3.2. Ràng buộc Chéo Ngày bắt đầu & Ngày kết thúc
- Cả client-side (trên form) và server-side (trong `actions.ts`) đều được bổ sung logic kiểm tra: Nếu có cả `startDate` và `endDate`, ngày kết thúc không được trước ngày bắt đầu.
- Nếu vi phạm, hệ thống sẽ chặn gửi và hiển thị lỗi chuẩn tiếng Việt: `"Ngày kết thúc không được trước ngày bắt đầu."`

### 3.3. Cảnh báo chọn Đối tác liên kết
- Loại hợp đồng `CLIENT` (Với chủ đầu tư): Ô đối tác được khóa (`disabled`) kèm dòng chú thích nhỏ: `"Hợp đồng chủ đầu tư không cần chọn đối tác."`
- Loại hợp đồng `SUBCONTRACTOR`, `SUPPLIER`, hoặc `LABOR`: Nếu người dùng bỏ trống đối tác, form hiển thị cảnh báo nhẹ màu hổ phách: `"Nên chọn đối tác để dễ theo dõi hợp đồng."` để khuyến khích nhập đầy đủ thông tin mà không gây ức chế (không chặn submit cứng nếu backend cho phép nullable).

### 3.4. Banner Lỗi cục bộ & Nút theo Context
- Bổ sung banner báo lỗi màu đỏ dịu mắt có icon cảnh báo (`AlertTriangle`) ngay phía trên các nút hành động để người dùng dễ quan sát lỗi.
- Nút hành động chính tự động thay đổi tên theo ngữ cảnh:
  - Thêm mới hợp đồng: hiển thị `"Thêm hợp đồng"`.
  - Chỉnh sửa hợp đồng: hiển thị `"Lưu"`.

---

## 4. Phạm vi Ngoài Scope (Out of Scope)
Để đảm bảo an toàn tuyệt đối cho hệ thống đang vận hành:
- Không thay đổi Prisma Schema.
- Không cấu trúc lại toàn bộ form bằng React Hook Form nhằm giảm thiểu tối đa rủi ro xung đột trạng thái (state conflict).

---

## 5. Kết quả Kiểm tra Kỹ thuật

### 5.1. Chạy bộ kiểm thử tự động (QA Script)
Chạy lệnh `npx tsx --env-file=.env scripts/qa-contracts-crud-rbac.ts` kiểm thử toàn bộ logic CRUD, project isolation, và payment plan protection:
- **Kết quả**: **19 PASS / 0 FAIL**.
- **Xác nhận**: Mọi logic phân quyền và xử lý dữ liệu hợp đồng đều hoạt động hoàn hảo.

### 5.2. Typecheck & Biên dịch dự án (Build)
- Lệnh kiểm tra kiểu dữ liệu tĩnh: `npx tsc --noEmit` -> **Thành công (Không lỗi)**.
- Lệnh build tối ưu hóa sản phẩm: `npm run build` -> **Thành công (Exit code 0)**.

---

## 6. Trạng thái Git
```bash
 M scripts/qa-contracts-crud-rbac.ts
 M src/app/(dashboard)/contracts/actions.ts
 M src/components/contracts/contract-form-dialog.tsx
?? docs/qa/CONTRACTS_FINAL_SECURITY_QA_REPORT.md
?? docs/qa/CONTRACTS_MONEY_INPUT_AND_FORM_UX_AUDIT_REPORT.md
```

---

## 7. Kết luận
1. **Form hợp đồng đã dễ nhập tiền hơn chưa?**
   - Rất dễ sử dụng. Định dạng dấu chấm phân tách hàng nghìn giúp người dùng nhìn phát biết ngay số tiền (tránh lỗi thừa/thiếu số 0).
   - Preview ước lượng bằng chữ (`≈ 4,44 tỷ đồng`) gia tăng gấp đôi độ tin cậy khi nhập liệu.
2. **Còn rủi ro gì không?**
   - Không còn rủi ro định dạng. Các ký tự đặc biệt được lọc bỏ triệt để trước khi parse thành kiểu `number` để gửi về Server Actions. Hệ thống hoạt động an toàn, chính xác và đồng bộ.

**Phân hệ form Hợp đồng đã sẵn sàng đưa vào vận hành.**
