# BÁO CÁO NGHIỆM THU: NGHỆM THU CHỨC NĂNG XÓA HỒ SƠ ATLĐ THEO TUẦN

**Ngày thực hiện:** 31/07/2026  
**Phân hệ:** Quản lý Hồ sơ An toàn Lao động (Safety Reporting)  
**Trạng thái:** **PASSED & PRODUCTION READY**  

---

## I. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

Sau khi chạy kịch bản kiểm tra trực tiếp cơ sở dữ liệu (`investigate_deletion.ts`), chúng tôi đã phát hiện 3 nguyên nhân cốt lõi khiến thao tác "Xóa hồ sơ" trước đây thất bại hoặc để lại dữ liệu mộc/bóng ma:

1. **Thiếu Thực Thể Hồ Sơ Cha (`SafetyWeeklyFile`)**:
   - Trước đây hệ thống không có bảng `SafetyWeeklyFile` trong database. Danh sách hồ sơ tuần được **tự tổng hợp động (pseudo-aggregation)** bằng cách gom bất kỳ `SafetyReportPlan` và `SafetySelfAssessmentReport` nào có cùng cặp `(createdById, periodStart)`.
   - Khi thực hiện xóa, service chỉ cập nhật bản ghi đầu tiên tìm được. Nếu trong cùng 1 tuần người dùng có nhiều bản ghi cũ, thuật toán tổng hợp sẽ lập tức nhặt bản ghi kế tiếp của cùng tuần đó và hiển thị lại lên UI. Do đó, dòng hồ sơ **không bao giờ biến mất** khỏi màn hình người dùng.

2. **Bất Đồng Bộ Giữa Kế Hoạch (Plan) và Báo Cáo Tự Đánh Giá (Assessment)**:
   - Bản ghi `SafetyReportPlan` dùng trạng thái `status = 'CANCELLED'`.
   - Bản ghi `SafetySelfAssessmentReport` dùng cờ `deletedAt != null`.
   - Khi xóa Báo cáo tự đánh giá, hàm `getWeeklyFileDetail` tra cứu Plan không có `status = 'CANCELLED'` dẫn tới `planId` bị trả về `null`. Kết quả là giao dịch xóa chỉ tác động vào Báo cáo tự đánh giá mà **bỏ quên Kế hoạch** (hoặc ngược lại).

3. **Thiếu Phân Quyền Hợp Lệ (RBAC Enforcement)**:
   - Server Action không truyền actor/userRole vào service để kiểm tra quyền xóa.
   - Chưa đăng ký các permission chuẩn `safety.weekly_file.delete_any` và `safety.weekly_file.delete_own`.

---

## II. GIẢI PHÁP KIẾN TRÚC VÀ CẢI TIẾN THỰC THI

### 1. Bổ Sung Bảng Cha `SafetyWeeklyFile` Vào Prisma Schema
Đã cập nhật `prisma/schema.prisma` và đẩy thành công vào database qua `prisma db push` & `prisma generate`:
- Model `SafetyWeeklyFile` có ID chính thức (`id`), `fileCode`, `periodStart`, `periodEnd`, `createdById`, `deletedAt`, `deletedById`.
- Bổ sung quan hệ `weeklyFileId` trong cả `SafetyReportPlan` và `SafetySelfAssessmentReport`.
- Chạy script backfill liên kết toàn bộ dữ liệu lịch sử thành công.

### 2. Giao Dịch Xóa Bất Biến (Atomic Transactional Soft-Delete)
Hàm `SafetyWeeklyFileService.deleteWeeklyFile(actor, weeklyFileId)` thực hiện xóa đồng thời trong một DB transaction:
```ts
await prisma.$transaction(async (tx) => {
  // 1. Soft-delete Hồ sơ tuần cha
  await tx.safetyWeeklyFile.update({
    where: { id: wf.id },
    data: { deletedAt: now, deletedById: actor.id },
  });

  // 2. Soft-delete toàn bộ Kế hoạch liên quan
  await tx.safetyReportPlan.updateMany({
    where: { OR: [{ weeklyFileId: wf.id }, { periodStart: wf.periodStart, createdById: wf.createdById }] },
    data: { deletedAt: now, deletedById: actor.id, status: "CANCELLED", cancelledAt: now },
  });

  // 3. Soft-delete toàn bộ Báo cáo tự đánh giá liên quan
  await tx.safetySelfAssessmentReport.updateMany({
    where: { OR: [{ weeklyFileId: wf.id }, { periodStart: wf.periodStart, createdById: wf.createdById }] },
    data: { deletedAt: now, deletedById: actor.id, status: "CANCELLED", cancelledAt: now },
  });

  // 4. Ghi Nhật ký Hệ thống (Audit Log)
  await tx.safetyReportAuditLog.create({
    data: {
      reportType: "WEEKLY_FILE",
      reportId: wf.id,
      action: "DELETE",
      actorId: actor.id,
      correlationId: `del_${wf.id}_${now.getTime()}`,
      beforeData: { fileCode: wf.fileCode, createdById: wf.createdById },
      afterData: { deletedAt: now, deletedById: actor.id },
    },
  });
});
```

### 3. Phân Quyền RBAC Đúng Chuẩn
Đã đăng ký permissions:
- `safety.weekly_file.delete_any`: Cho phép Quản trị viên (`ADMIN`), Giám đốc (`DIRECTOR`), Phó giám đốc (`DEPUTY_DIRECTOR`) xóa mọi hồ sơ.
- `safety.weekly_file.delete_own`: Cho phép người tạo xóa hồ sơ của chính mình (`createdById === actor.id`).
- Selector server-side `canDeleteWeeklyFile({ actor, weeklyFile })` tính toán cờ `canDelete` và gửi cho Client. Client ẩn nút bấm "Xóa hồ sơ" đối me với người dùng không có quyền.

---

## III. KẾT QUẢ KIỂM TRA THỰC TẾ (VERIFICATION RESULTS)

1. **Kịch bản DB Verification Trực Tiếp (`test_create_and_delete.ts`)**:
   - **Tạo mới hồ sơ**: Đã khởi tạo hồ sơ tuần cha `cms8qxmly0000m4k5iitppy33` đi kèm Plan và Assessment.
   - **Kiểm tra quyền người lạ (Stranger)**: `canDelete: false`. Thực thi xóa trả về `{ ok: false, code: "FORBIDDEN", message: "Bạn không có quyền xóa hồ sơ này." }`.
   - **Kiểm tra quyền người tạo/Admin**: `canDelete: true`. Thực thi xóa trả về `{ ok: true, weeklyFileId: "..." }`.
   - **Kiểm tra DB sau khi xóa**: `deletedAt` được gắn đồng bộ trên cả `SafetyWeeklyFile`, `SafetyReportPlan` và `SafetySelfAssessmentReport`. Số lượng hồ sơ hoạt động giảm về 0 ngay lập tức. Nhật ký Audit Log được lưu thành công.

2. **Bộ Kiểm Thử Tự Động Vitest (`npx vitest run src/lib/safety-reporting/__tests__/`)**:
   - **Passed 13/13 test files (60/60 tests)**.

3. **Biên Dịch Dự Án (`npx next build`)**:
   - **Build thành công 100% (Exit code: 0)**.
