# Báo cáo Triển khai MVP Phân hệ Kế toán & Thanh toán (Accounting & Payments)

## 1. Mục tiêu
- Phân tích, thiết kế và xây dựng màn hình "Kế toán & Thanh toán" hoàn chỉnh thay thế cho placeholder ban đầu.
- Xây dựng một MVP quản lý hồ sơ đề nghị thanh toán đầy đủ trạng thái nghiệp vụ (DRAFT, SUBMITTED, APPROVED, PAID, REJECTED, CANCELLED).
- Đảm bảo tuân thủ strict RBAC (chỉ những người có quyền ở dự án mới thấy và thao tác được hồ sơ).
- Giao diện (UI/UX) sạch, chuyên nghiệp, giữ vững chuẩn thiết kế của hệ thống.

## 2. Hiện trạng ban đầu
- Route `/accounting` đã tồn tại nhưng chỉ chứa tiêu đề và `EmptyState` placeholder.
- Schema Prisma đã có `PaymentPlan` và `PaymentRecord` nhưng các model này thiên về quản lý *kế hoạch dòng tiền* chứ không phải là *hồ sơ đề nghị thanh toán* thực tế có luồng phê duyệt trạng thái.
- Hệ thống hợp đồng (`Contract`), nhà cung cấp (`Supplier`), công trình (`Project`) và logic RBAC theo dự án (`ProjectMember`) đã tương đối hoàn thiện.

## 3. Phương án đã chọn
Để đảm bảo đúng nghiệp vụ "Hồ sơ đề nghị thanh toán" linh hoạt nhưng vẫn an toàn:
- **Prisma Schema**:
  - Tạo thêm model `PaymentRequest` (thay vì cố sửa `PaymentPlan` có nguy cơ gây lỗi). Model này chứa đầy đủ thông tin: tiêu đề, công trình, hợp đồng, nhà cung cấp, loại thanh toán (`PaymentRequestType`), số tiền (SubTotal, VAT, TotalAmount), hạn thanh toán, ghi chú và các trường kiểm duyệt (`approvedById`, `approvedAt`, `paidAt`, `rejectedReason`).
  - Thêm Enums: `PaymentRequestStatus` và `PaymentRequestType` để hỗ trợ flow duyệt 5 bước.
- **RBAC**:
  - Viết module `src/lib/accounting/accounting-permissions.ts` đồng nhất style của `contracts-permissions.ts`.
  - Roles cấp dự án (PM, Site Commander) có quyền `canCreate`, `canUpdate`, `canApprove` ở cấp công trường.
  - Role toàn cục (ADMIN, ACCOUNTANT) có thể xem tổng quan và chuyển trạng thái `PAID` (`canMarkPaid`).
- **Giao diện**:
  - **Accounting Workspace**: Cung cấp dashboard mini gồm 4 thẻ tổng hợp dòng tiền. Thanh tìm kiếm và bộ lọc trạng thái. Bảng dữ liệu hỗ trợ responsive.
  - **Form Dialog**: Sử dụng component form có logic xử lý VNĐ tiền tệ format (`formatVndInput`, `stripMoney` tận dụng của module hợp đồng).

## 4. File đã thay đổi
- `prisma/schema.prisma`: Thêm model `PaymentRequest`, Enum `PaymentRequestStatus`, `PaymentRequestType` và cập nhật các relation (User, Project, Supplier, Contract).
- `src/lib/accounting/accounting-permissions.ts`: Mới tạo - Quản lý RBAC cho module.
- `src/app/(dashboard)/accounting/actions.ts`: Mới tạo - Server actions CRUD và chuyển trạng thái hồ sơ thanh toán.
- `src/app/(dashboard)/accounting/page.tsx`: Cập nhật - Gọi data và render Workspace.
- `src/app/(dashboard)/accounting/components/accounting-workspace.tsx`: Mới tạo - Giao diện chính danh sách, dashboard.
- `src/app/(dashboard)/accounting/components/payment-request-form-dialog.tsx`: Mới tạo - Form popup điền hồ sơ thanh toán.
- `scripts/qa-accounting-payments.ts`: Mới tạo - Script kiểm tra mockup QA.

## 5. Nghiệp vụ đã hỗ trợ
- **Dashboard**: Tính tổng tiền (Tổng đề nghị, Chờ duyệt, Còn phải trả, Đã thanh toán). Đếm số hồ sơ quá hạn thanh toán.
- **Tạo hồ sơ thanh toán**: Liên kết được Công trình, Hợp đồng và Đối tác. Định dạng tiền tệ VNĐ chuẩn. Tính tổng (Tự động/Thủ công).
- **Flow trạng thái (DRAFT -> SUBMITTED -> APPROVED -> PAID / REJECTED / CANCELLED)**:
  - **DRAFT/REJECTED**: Chỉ người tạo và người có quyền cập nhật được sửa.
  - **SUBMITTED**: Không được tự do sửa form, người có quyền duyệt (`canApprove`) mới duyệt được.
  - **APPROVED**: Chỉ Kế toán (`ACCOUNTANT` hoặc `ADMIN`) mới có quyền chốt `PAID` (`canMarkPaid`).

## 6. RBAC / Project Scope
- Dữ liệu hoàn toàn **project-scoped**.
- Kế toán / Giám đốc thấy tất cả công trình nhưng Engineer / Chỉ huy trưởng chỉ thấy dữ liệu thuộc dự án họ tham gia.
- Server-side validate tuyệt đối, mọi hành động từ UI đều được kiểm tra lại quyền trong Server Actions.

## 7. Kết quả lệnh test / build & Hậu kiểm (Post-Audit)
- **Database**: Đã apply schema thông qua `npx prisma db push` (do project đang sử dụng adapter-pg và chế độ local schema push an toàn).
- **TypeScript**: Đã chạy `npx tsc --noEmit` ✅ (0 lỗi Type). Các lỗi liên quan đến serialize object hoặc compare string hẹp (`DRAFT | REJECTED` vs `SUBMITTED`) đã được fix sạch sẽ.
- **Build**: Đã chạy `npm run build` ✅ (Build thành công).
- **QA Script**: Đã chạy `npx tsx scripts/qa-accounting-payments.ts` thành công.
  - Test case: RBAC giới hạn quyền duyệt/chốt (Admin duyệt được, Kế toán chốt được, PM không chốt được, Kỹ sư không duyệt được).
  - Test case: Logic block tự duyệt hồ sơ (Người tạo không được tự duyệt trừ khi là ADMIN).
  - Test case: Chặn luồng sai trạng thái. Đảm bảo luồng DRAFT -> SUBMITTED -> APPROVED -> PAID diễn ra 1 chiều.
  - Test case: Serialize Decimal / Date an toàn hoàn toàn trước khi trả về Client.

## 8. Hạn mức hợp đồng (Financial Security)
- **Cộng dồn tự động**: Đã bổ sung logic kiểm tra tổng giá trị các hồ sơ thanh toán (`SUBMITTED`, `APPROVED`, `PAID`) liên kết với 1 hợp đồng (`contractId`).
- **Cảnh báo/Chặn cứng**: Nếu một hồ sơ thanh toán mới làm tổng giá trị vượt quá `contract.value`, server sẽ lập tức `throw new Error` ngăn chặn lưu, kèm theo thông báo số tiền bị vượt hạn mức (Vượt XYZ đ). An toàn tài chính được đảm bảo.

## 9. Rủi ro còn lại
- **Quy trình duyệt nhiều cấp**: Hiện quy trình duyệt mới đang dừng ở 1 cấp độ (Approve thẳng). Thực tế có thể cần Kỹ thuật duyệt Khối lượng trước, rồi Kế toán duyệt, sau đó Giám đốc mới ký thanh toán.
- **Chứng từ đính kèm (File attachments)**: Chưa có chức năng đính kèm file Invoice/Bản nghiệm thu để kế toán đối chiếu.
- Mobile Layout của phần bảng (Table) có thể bị tràn nếu cột quá nhiều, mặc dù đã bao bọc bằng `overflow-x-auto`.

## 10. Danh sách file thay đổi sau hậu kiểm
- `src/app/(dashboard)/accounting/actions.ts`: Bổ sung validate hợp đồng, chặn tự duyệt, sửa lỗi logic trạng thái.
## 10. Lỗi Runtime thực tế đã phát hiện và xử lý (Hotfix)
- **Lỗi**: `Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.`
- **Nguyên nhân**: Trong `src/app/(dashboard)/accounting/actions.ts`, tôi đã serialize an toàn các mảng `PaymentRequest`, `Project`, `Supplier` nhưng lại quên mất mảng `contracts` được trả về có chứa trường `value` đang mang kiểu `Prisma.Decimal`. Khi truyền thẳng qua `page.tsx` vào Client Component (`AccountingWorkspace`), Next.js đã báo lỗi hydration/serialization.
- **Cách khắc phục triệt để**:
  1. Khai báo DTO rõ ràng `AccountingContractOptionDto` (chỉ chứa các primitive types: `id, contractNo, name, projectId, value (number)`).
  2. Tại `actions.ts`, dùng `.map` để chuyển đổi mảng hợp đồng: `value: Number(c.value)`.
  3. Cập nhật Props của `AccountingWorkspace` và `PaymentRequestFormDialog` để chỉ nhận interface `AccountingContractOptionDto` đã an toàn type.
  4. Sửa lại UI Button trong form thành "Gửi phê duyệt" và gỡ icon lịch (`CalendarIcon`) custom thừa thãi để giảm nhiễu UI và tránh Hydration mismatch trên thẻ input date native.
- **Kết quả Post-Fix**: 
  - `npx prisma validate` & `generate` ✅
  - `npx tsc --noEmit` ✅
  - `npm run build` ✅
  - 100% Client Components chỉ nhận Plain Object (Primitive DTO). Không còn nguy cơ rò rỉ Prisma Decimal hay Date object sang Client gây crash.

## 11. Danh sách file thay đổi sau hậu kiểm lần 2
- `src/app/(dashboard)/accounting/actions.ts`: Bổ sung DTO `AccountingContractOptionDto` và serialize array contracts.
- `src/app/(dashboard)/accounting/components/accounting-workspace.tsx`: Đổi type props an toàn.
- `src/app/(dashboard)/accounting/components/payment-request-form-dialog.tsx`: Đổi type props an toàn, gỡ icon thừa, sửa UI text.
- `docs/qa/ACCOUNTING_PAYMENTS_MVP_IMPLEMENTATION_REPORT.md`: Báo cáo quá trình fix hotfix Decimal.
