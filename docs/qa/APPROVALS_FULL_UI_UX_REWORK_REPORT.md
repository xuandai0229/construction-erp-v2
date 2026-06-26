# Báo cáo Cải tổ UI/UX toàn diện — Phân hệ Approval Center

> Ngày: 2026-06-26 | Trạng thái: **GO hoàn toàn (sẵn sàng UAT)**

---

## 1. Phân tích & Xử lý các lỗi UI/UX còn sót lại
Qua quá trình rà soát thực tế, các lỗi về Layout và Validation đã được khắc phục triệt để:

### Lỗi 1: Cột Action bị cắt và Scrollbar ngang
- **Tình trạng cũ**: Bảng chiếm quá nhiều diện tích khiến cột `Thao tác` bị đẩy ra ngoài viewport, buộc người dùng phải kéo thanh cuộn ngang mới thao tác được.
- **Khắc phục**: 
  - Cột `Thao tác` đã được gắn thuộc tính `sticky right-0`, đồng thời bổ sung viền và đổ bóng (`shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)]`) để tách biệt rõ với nội dung bị cuộn.
  - Người dùng có thể bấm Duyệt/Từ chối ngay lập tức bất kể họ đang cuộn ở đâu.
  - Chữ "Thao tác" hiển thị nguyên vẹn.

### Lỗi 2: Modal Từ chối thiếu Validate UX
- **Tình trạng cũ**: Textarea từ chối chỉ báo lỗi lúc bấm nút.
- **Khắc phục**: 
  - Cập nhật Component `ReasonDialog` để hiển thị bộ đếm ký tự (`0/10 ký tự tối thiểu`).
  - Lỗi inline (màu đỏ) hiện ngay khi người dùng blur khỏi ô input nếu chưa nhập đủ.
  - Nút `Từ chối yêu cầu` bị **Disabled hoàn toàn** nếu lý do dưới 10 ký tự, tránh click nhầm.

### Lỗi 3: Source Badge (Hồ sơ liên kết)
- **Tình trạng cũ**: `ChangeOrder` và `SiteReport` dù chưa có Model thực tế nhưng UI vẫn báo `Đã liên kết` do nằm trong bảng dịch text.
- **Khắc phục**: Sửa logic server-side chỉ hiển thị `Đã liên kết` (Xanh) cho đúng 3 bảng có thật: `PaymentRequest`, `Contract`, `MaterialRequest`. Mọi loại khác đều hiển thị `Tham chiếu nội bộ` (Xám).

### Lỗi 4: Audit Log (Timeline)
- **Xác nhận**: Audit Log hiện tại trong Drawer chỉ là MVP Placeholder. Giao diện có ghi chú rõ ràng: *"Lịch sử thao tác chi tiết sẽ được hiển thị ở phase sau"*. Tuyệt đối không có chuyện báo cáo "Đã có timeline" nếu chưa render thực tế.

---

## 2. Thiết kế UI/UX mới đã áp dụng
Toàn bộ `ApprovalCenterClient` đã được thiết kế theo chuẩn "Review Queue" hiện đại:
- **Segmented Quick Tabs**: 3 tab nhanh `Cần xử lý`, `Đã xử lý`, `Tất cả` với `Cần xử lý` được focus mặc định.
- **Bảng (Review Queue Table)**: Gộp cột thông minh từ 9 xuống 7 cột. Nút hành động dịu mắt hơn (variant outline).
- **Drawer Chi tiết**: Nâng cấp Summary Grid theo kiểu biên lai, làm nổi bật trạng thái liên kết. Block cảnh báo lưu ý rất rõ về luồng nghiệp vụ.
- **Clear Text**: Không còn sót lại bất kỳ text dummy/seed/test nào trên giao diện End-user.

---

## 3. Nghiệp vụ và Validation
- PENDING mới có action, APPROVED/REJECTED/CANCELLED chỉ xem.
- Từ chối bắt buộc > 10 ký tự (Kiểm soát chặt ở cả Client Disable Button và Server API).
- Project Level RBAC: Người tạo không tự duyệt, user ngoài không xem được.
- An toàn dữ liệu: Soft-delete nguyên vẹn, DTO format an toàn.
- Không sử dụng native `alert/prompt`.

---

## 4. Kết quả QA / Build
- `npx prisma validate & generate` ✅
- `scripts/qa-approvals.ts` ✅ (Pass 17/17 case)
- `npx tsc --noEmit` ✅ (Lỗi type ban đầu do thiếu component đã được fix gọn).
- `npm run build` ✅ (Exit code 0)

---

## 5. Backlog còn lại (Tính năng mở rộng cho Phase sau)
- **Audit Timeline**: Render lịch sử thao tác từ DB lên Drawer thay cho ghi chú hiện tại.
- **File chứng từ**: Cơ chế upload/view file đính kèm trực tiếp.
- **Phê duyệt nhiều cấp**: Nâng cấp cho luồng duyệt phức tạp (Reviewer -> Approver).
- **Callback Trigger**: Tự động update trạng thái PaymentRequest/Contract sau khi phê duyệt xong.

---

## 6. KẾT LUẬN
**GO HOÀN TOÀN (Sẵn sàng UAT)**.
Tất cả các lỗi UX cuối cùng đã được vá, đặc biệt là cột Action đã Sticky chuẩn chỉ và Modal từ chối rất thông minh. Phân hệ sẵn sàng đưa vào UAT thực tế.
