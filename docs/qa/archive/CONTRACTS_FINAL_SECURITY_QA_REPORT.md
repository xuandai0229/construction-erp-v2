# Báo cáo Kiểm thử An toàn & Bảo mật Hợp đồng (Contracts Final Security QA Report)

Báo cáo này ghi nhận kết quả kiểm thử an toàn, phân quyền (Project Isolation) và bảo vệ toàn vẹn dữ liệu (PaymentPlan Protection) cho phân hệ **Contracts (Quản lý hợp đồng)**.

---

## 1. Đánh giá Script QA trước khi nâng cấp
Trước đợt audit này, script `scripts/qa-contracts-crud-rbac.ts` rất sơ khai và còn thiếu nhiều hạng mục kiểm thử bảo mật quan trọng:
- **Số lượng test ban đầu**: 3 test cases.
- **Phạm vi kiểm thử**: Chỉ thử nghiệm các hành động CRUD cơ bản (tạo, sửa, xóa mềm) bằng Prisma Client trực tiếp với quyền tối cao (ADMIN).
- **Thiếu sót bảo mật**:
  - Chưa mock session để chạy thử nghiệm các Server Actions thực tế ở tầng ứng dụng.
  - Chưa test trường hợp người dùng không có quyền hoặc có quyền hạn chế (RBAC).
  - Chưa kiểm tra cô lập dữ liệu giữa các công trình (Project Isolation) — lỗ hổng nghiêm trọng cho phép user dự án A can thiệp dự án B.
  - Chưa kiểm thử ràng buộc kế hoạch thanh toán (`PaymentPlan`) để ngăn ngừa mất mát dữ liệu tài chính khi xóa hợp đồng.
  - Chưa dọn dẹp triệt để các dữ liệu test nếu có lỗi phát sinh giữa chừng.

---

## 2. Các Nhóm Test Đã Bổ Súng
Chúng tôi đã viết lại toàn bộ bộ test `scripts/qa-contracts-crud-rbac.ts` với mô hình mock session thực tế của Next.js Server Actions, bổ sung 3 nhóm test lớn:
1. **Nhóm A: Project Isolation & RBAC chéo dự án**:
   - Khởi tạo 2 dự án độc lập `QA-CONTRACT-ISOLATION-A` và `QA-CONTRACT-ISOLATION-B`.
   - Khởi tạo User A thuộc dự án A với vai trò `PROJECT_MANAGER`, không thuộc dự án B.
   - Kiểm định quyền đọc/ghi/xóa của User A chéo sang dự án B và kiểm định quyền tối cao của `ADMIN`.
2. **Nhóm B: PaymentPlan Delete Protection**:
   - Tạo hợp đồng test và liên kết với một `PaymentPlan` mới.
   - Thử nghiệm xóa hợp đồng và kỳ vọng hệ thống chặn thành công để bảo toàn dữ liệu tài chính liên kết.
3. **Nhóm C: Hạn định & Trạng thái Động (getContractDisplayStatus)**:
   - Kiểm thử đơn vị (Unit test) cho helper tính trạng thái hiển thị động dựa trên `endDate` thực tế.

---

## 3. Kết quả Kiểm thử Chi tiết

### 3.1. Cô lập dự án (Project Isolation)
- **Danh sách hợp đồng**: User A gọi `getContractsData()` chỉ nhìn thấy hợp đồng thuộc dự án A của mình; hoàn toàn **không thấy** hợp đồng thuộc dự án B.
- **Cập nhật trái phép**: User A cố tình gọi `updateContract` trên hợp đồng dự án B -> **Bị chặn thành công** với thông báo lỗi: `"Bạn không có quyền sửa hợp đồng này"`.
- **Xóa trái phép**: User A cố tình gọi `deleteContract` trên hợp đồng dự án B -> **Bị chặn thành công** với thông báo lỗi: `"Bạn không có quyền xóa hợp đồng này"`.
- **Tạo trái phép**: User A cố tình gọi `createContract` gắn dự án B -> **Bị chặn thành công** với thông báo lỗi: `"Bạn không có quyền tạo hợp đồng cho công trình này"`.
- **Quyền Admin**: `ADMIN` gọi `getContractsData()` và các Server Actions CRUD đều thành công trên cả dự án A và dự án B, chứng minh ma trận quyền hoạt động hoàn hảo.

### 3.2. Bảo vệ Kế hoạch Thanh toán (PaymentPlan Delete Protection)
- **Tình huống**: Thử xóa hợp đồng đã được gắn kết với một `PaymentPlan`.
- **Kết quả**: 
  - Server Action `deleteContract` ném lỗi và chặn xóa thành công.
  - Thông báo lỗi trả về chuẩn xác: `"Không thể xóa hợp đồng đã có kế hoạch thanh toán"`.
  - Hợp đồng vẫn giữ nguyên trạng thái active (`deletedAt: null`).
  - Kế hoạch thanh toán (`PaymentPlan`) vẫn được bảo toàn nguyên vẹn trong DB, tránh hiện tượng mồ côi dữ liệu tài chính (orphaned records).

### 3.3. Trạng thái Động (Deadline & Status Helper)
Kết quả chạy helper `getContractDisplayStatus` khớp 100% với ma trận nghiệp vụ thực tế:
- `ACTIVE` + ngày kết thúc đã qua (hôm qua) $\rightarrow$ **`OVERDUE`** (Quá hạn).
- `ACTIVE` + ngày kết thúc sắp đến (trong 20 ngày) $\rightarrow$ **`EXPIRING`** (Sắp hết hạn).
- `ACTIVE` + ngày kết thúc còn xa (90 ngày) $\rightarrow$ **`ACTIVE`** (Đang thực hiện).
- `DRAFT` $\rightarrow$ **`DRAFT`** (Nháp).
- `COMPLETED` $\rightarrow$ **`COMPLETED`** (Đã hoàn thành).
- `TERMINATED` $\rightarrow$ **`TERMINATED`** (Chấm dứt).

---

## 4. Tổng kết Bộ Kiểm thử QA
- **Tổng số test cases**: 19
- **Số test PASS**: 19
- **Số test FAIL**: 0

### Dọn dẹp dữ liệu test (Cleanup):
Toàn bộ dữ liệu sinh ra trong quá trình chạy test (bao gồm 3 Project test, 3 User test, 3 Contract test, và 1 PaymentPlan test) đều được đưa vào block `try/finally` của script. Chúng được xóa cứng (hard delete) sạch sẽ khỏi cơ sở dữ liệu ngay sau khi bộ test hoàn thành (kể cả khi test gặp lỗi giữa chừng), không để lại bất kỳ dữ liệu rác nào.

---

## 5. Kết quả Typecheck & Build
- **TypeScript Compilation**: `npx tsc --noEmit` thực hiện thành công, không phát hiện bất kỳ lỗi khai báo kiểu dữ liệu nào.
- **Next.js Production Build**: `npm run build` thực hiện thành công, tạo ra bản build tối ưu hóa sạch sẽ mà không gặp lỗi.

---

## 6. Rủi ro còn lại & Khuyến nghị
Dù phân hệ Contracts đã đạt tiêu chuẩn nghiệp vụ và bảo mật cao cho phiên bản hiện tại, dự án vẫn còn một số rủi ro/hạn chế cần cải tiến trong các phiên bản tương lai:
1. **Chưa có UI chi tiết cho Payment**: Hiện tại hệ thống chặn xóa dựa trên liên kết DB, nhưng giao diện hiển thị danh sách đợt thanh toán chi tiết của hợp đồng vẫn chưa được xây dựng hoàn thiện trên giao diện Contracts.
2. **Chưa hỗ trợ đính kèm tài liệu**: Chưa có tính năng upload và lưu trữ file scan/PDF của hợp đồng vật lý.
3. **Chưa có thông báo tự động**: Chưa có dịch vụ chạy ngầm để gửi email/notification khi hợp đồng rơi vào trạng thái `Quá hạn` hoặc `Sắp hết hạn`.
4. **Thiếu Audit Log chi tiết**: Các hành động thay đổi giá trị hợp đồng hoặc đổi trạng thái chưa được ghi nhận vào bảng lịch sử hoạt động chi tiết (chỉ có cập nhật `updatedAt` mặc định).

---

## 7. Kết luận
Bộ mã nguồn phân hệ Contracts hiện tại đảm bảo tính an toàn dữ liệu, chống thất thoát tài chính và phân tách đặc quyền dự án đúng chuẩn.

**Có thể chốt tạm phân hệ Contracts trong phạm vi MVP hiện tại.**
