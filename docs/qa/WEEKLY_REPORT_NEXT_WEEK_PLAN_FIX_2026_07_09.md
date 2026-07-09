# Báo cáo Cập nhật Nghiệp vụ: Tách biệt Báo cáo Kết quả Tuần và Kế hoạch Tuần sau

## 1. Vấn đề nghiệp vụ đã được giải quyết
Trước đây, hệ thống cho phép chọn "Tuần sau" trong phần Báo cáo kết quả và dùng chung một data structure, gây nhầm lẫn giữa **Khối lượng thực tế đã thi công** và **Khối lượng dự kiến**. 

Tuần tương lai chưa xảy ra, do đó không thể có Daily Reports để tổng hợp thành Báo cáo tuần (Kết quả). Việc nhập nhằng này có nguy cơ làm sai lệch Lũy kế thực tế trên hệ thống.

**Giải pháp:**
- **Tách biệt hoàn toàn:** "Báo cáo tuần" hiện tại chỉ đóng vai trò tổng hợp **Kết quả thực hiện** của tuần hiện tại hoặc tuần đã qua.
- **Kế hoạch tuần tới:** Được tách thành một Section riêng (Bảng riêng) nằm bên dưới báo cáo kết quả.

## 2. Ngăn chặn tạo báo cáo kết quả cho tương lai
- Nút "Tuần sau" trong bộ chọn tuần đã bị loại bỏ.
- Đã bổ sung logic kiểm tra chặn: Nếu `weekStartDate` lớn hơn ngày hiện tại, hệ thống sẽ cảnh báo: *"Tuần này chưa xảy ra, chưa có báo cáo ngày để tổng hợp. Bạn chỉ có thể lập kế hoạch tuần tới."* và không cho phép phát sinh khối lượng thực tế.

## 3. Cấu trúc lưu trữ Kế hoạch tuần sau
Kế hoạch tuần sau không lưu vào `FieldProgressEntry` (để tránh làm tăng lũy kế thực tế) và không lưu vào `SiteReportLine`. 
Thay vào đó, nó được lưu dưới dạng JSON có cấu trúc (`version: 2`) vào trường `SiteReport.generalNote` (hoặc `weeklyNote` ở Frontend):
```json
{
  "version": 2,
  "nextWeekPlan": [
    {
      "fieldProgressItemId": "...",
      "workContent": "Công việc A",
      "unit": "m3",
      "remainingQuantity": 86,
      "plannedQuantityNextWeek": 30,
      "constructionCrew": "Tổ 1",
      "riskNote": "Thời tiết xấu"
    }
  ]
}
```
Phương án JSON này an toàn, không cần đụng chạm cấu trúc DB cốt lõi hiện tại, nhưng vẫn định hình (type-safe) rõ ràng để sau này có thể dễ dàng migrate sang bảng `WeeklyPlanLine` khi cần thiết. Kế hoạch này **TUYỆT ĐỐI KHÔNG** cộng dồn vào lũy kế của dự án.

## 4. UI/UX: Detail Drawer & Print Template
Màn hình chi tiết Drawer và form in PDF (Print Template) đã được cập nhật để hiển thị thành **2 bảng hoàn toàn tách biệt**:
1. **Bảng 1:** Tổng hợp khối lượng tuần (Kết quả thực tế: Thiết kế, Trước, Tuần này, Lũy kế, Còn lại).
2. **Bảng 2:** Kế hoạch thực hiện tuần sau (Công việc, ĐVT, Còn lại HT, KL Tuần tới, Phụ trách, Ghi chú/Rủi ro).

## 5. Kết quả Test (QA Script)
Script `scripts/qa-weekly-report-next-week-plan.ts` đã chạy và xác thực logic Backend:
```text
Setting up DB for Weekly Next Week Plan Test...
Mocking Weekly Progress Summary skipping...
Creating Weekly Report with Next Week Plan...
Verifying balances are NOT affected by Next Week Plan...
✅ Passed all Next Week Plan assertions.
```
- Test đã giả lập tạo khối lượng thực tế là 94, còn lại 86.
- Tạo kế hoạch tuần sau là 30.
- Assert: Lũy kế hệ thống (`balance.approvedQuantity`) vẫn giữ nguyên là 94, không bị đội lên 124. Khối lượng còn lại thực tế (`balance.remainingAtDate`) vẫn là 86.

## 6. Kết luận UAT
Giao diện đã hiển thị đúng nghiệp vụ. 
- (Form Tạo) Có nút tự động trích xuất công việc còn lại (`remainingQuantity > 0`) đưa vào kế hoạch tuần sau.
- (Drawer/Print) Hiển thị tách biệt rõ 2 khối dữ liệu độc lập.

=> **Kết luận: PASS**.
Nghiệp vụ lập kế hoạch tuần sau đã được chốt chặn an toàn, không còn rủi ro làm hỏng dữ liệu khối lượng thực tế của hệ thống.
