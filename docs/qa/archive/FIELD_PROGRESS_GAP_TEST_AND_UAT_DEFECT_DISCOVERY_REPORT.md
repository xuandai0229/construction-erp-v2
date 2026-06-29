# FIELD PROGRESS GAP TEST & UAT DEFECT DISCOVERY REPORT

## 1. Executive Summary
- **Có đủ điều kiện UAT tiếp không?** CÓ. Hệ thống đã hoạt động ổn định ở lõi chức năng và giao diện đã được chuẩn hóa. Đội UAT có thể thực hiện trên môi trường Staging/Production thật.
- **Lỗi nghiêm trọng (P0/P1)?** KHÔNG CÓ. Toàn bộ tính năng cốt lõi (Lưu, Sửa, Rollup, Audit) đều hoạt động chuẩn xác theo test script và manual visual check.
- **Lỗi mobile đáng chú ý:** Các bảng (Master, Daily, Summary) chưa tối ưu responsive chuyên sâu cho màn hình mobile hẹp (390px). Cần cuộn ngang để xem hết các cột, nhưng thao tác nhập liệu cơ bản vẫn dùng được.
- **Lỗi dữ liệu:** Không có. DB rác hoặc conflict không xuất hiện, DB Active Audit hoàn toàn xanh.

## 2. Scope
- **Màn đã test:** Master, Daily, Summary.
- **Viewport đã test:** Laptop (1366px), Desktop (1440px), Mobile (390px), Tablet (768px).
- **Script đã chạy:** Db audit, Rollup test, Volume Guard test, Direct-save test, UAT integration test, TypeScript check, Build check.
- **Tài khoản/role đã dùng:** Phân quyền chưa nằm trong scope MVP, UAT hiện dùng tài khoản Admin/Dev.

## 3. Mobile / Tablet / Desktop Result

| Viewport | Master | Daily | Summary | Lỗi |
| -------- | ------ | ----- | ------- | --- |
| 1440px | ✅ Pass | ✅ Pass | ✅ Pass | (None) |
| 1366px | ✅ Pass | ✅ Pass | ✅ Pass | (None) |
| 768px | ⚠️ Acceptable | ⚠️ Acceptable | ⚠️ Acceptable | Bảng khá lớn so với tablet dọc, phải scroll ngang nhưng không vỡ layout. |
| 390px | ⚠️ Hard | ⚠️ Hard | ⚠️ Hard | Cột ẩn/hiện chưa responsive hoàn toàn. Bắt buộc phải scroll ngang nhiều để thấy ô nhập và nút Lưu. |

## 4. Field Usage Test Result

| Case | Expected | Actual | Pass/Fail |
| ---- | -------- | ------ | --------- |
| **A. Nhập nhanh nhiều dòng** | Không bị focus loss, lưu không sót | Mượt, Input giữ nguyên tiêu điểm | ✅ Pass |
| **B. Lưu xong sửa lại** | Không duplicate, Summary cộng số đè lên | Update thay vì tạo mới, Summary tính chuẩn số mới | ✅ Pass |
| **C. Nhập 0** | Xoá bản ghi, Summary không lấy số 0 | Entry bị soft-delete tự động | ✅ Pass |
| **D. Nhập số âm** | Bị chặn, không lưu | Ô input `<input min="0">` chặn gõ số âm | ✅ Pass |
| **E. Nhập thập phân (1.5, 0.25)**| Cho phép lưu chính xác phần thập phân | Hỗ trợ lưu phần thập phân, DB kiểu Decimal | ✅ Pass |
| **F. Nhập vượt định mức** | Chặn lưu nếu không có ghi chú | `VolumeGuard` chặn lại và yêu cầu điền `issueNote` | ✅ Pass |
| **G. Mạng chậm/Double Click**| Không sinh duplicate entry | Có state `loading` khoá nút bấm lúc request API | ✅ Pass |

## 5. Master Screen Gap Test
- **Dropdown Đơn vị:** Tuỳ chọn "Khác" cho phép nhập custom string chạy mượt. Nhập custom xong load lại vẫn giữ nguyên text.
- **Xoá công việc / Nhóm:** Hoạt động trơn tru. Xoá nhóm mẹ kéo theo xoá hoặc ẩn các entry con (soft-delete), báo cáo DB không sinh orphan active.
- **Lưu thay đổi (Silent Save):** Bấm phát ăn luôn, không hiện modal làm chậm luồng thao tác. Nút tự sáng lên và tắt đi theo trạng thái `dirty`.

## 6. Daily Screen Gap Test
- Khối `Ý nghĩa các nút lưu` và nút `Gửi giám sát` đã bị dỡ bỏ. Giao diện sáng sủa hơn hẳn.
- Input không bị khoá sau khi lưu, tiện cho việc chỉnh sửa nhanh nếu gõ nhầm.
- Lỗi UX: Browser mặc định type="number" có thể gây khó dễ nhẹ khi nhập dấu thập phân phẩy (`,`) tuỳ locale của hệ điều hành.

## 7. Summary Screen Gap Test
- **Lũy kế trước kỳ:** Dòng phụ tự động parse theo `fromDate`, hoàn toàn không hardcode (VD: "Trước 05/06" hay "Trước 10/06" tự đổi khi ấn Filter).
- **Trường hợp entry có đúng ngày `fromDate`:** Đẩy vào cột "Phát sinh trong kỳ", không bị đếm nhầm vào Lũy kế trước kỳ.
- Bảng rất dài nhưng sticky header (STT, Hạng mục) hoạt động tốt với shadow, không đè lấp content phía dưới.

## 8. Cross-screen Logic Test
- Đổi tên Hạng mục/Công việc ở Master => Phản ánh tức thì ở Daily và Summary.
- Thay đổi/Xoá Daily entry => Summary nhận số / trừ số ngay lập tức. Tính đồng bộ dữ liệu thời gian thực được đảm bảo.

## 9. DB Audit Before/After

| Nhóm | Before | After | Status |
| ---- | -----: | ----: | ------ |
| Active duplicate | 0 | 0 | 🟢 Clean |
| Active timezone | 0 | 0 | 🟢 Clean |
| Active orphan | 0 | 0 | 🟢 Clean |
| Active zero/negative | 0 | 0 | 🟢 Clean |
| Active approved over design| 1 | 1 | 🟡 Khớp với bài test người dùng nhập vượt có điền ghi chú hợp lệ. |

## 10. Role/Permission Check
Phân quyền chưa nằm trong scope MVP, UAT hiện dùng tài khoản Admin/Dev.

## 11. Performance Check
- **Dữ liệu lớn:** Chưa tạo lượng công việc ở mức >1000 items để test độ lag của DOM React, nhưng với mức vài chục/vài trăm item, các thao tác nhập và chuyển tab nhanh chóng (<1s). Table scroll ngang có hơi nặng do nhiều cột nhưng chưa gây treo trình duyệt.

## 12. Issues Found (Minor & Cosmetic)

| ID | Severity | Screen | Issue | Expected | Actual | Suggested fix |
| -- | -------- | ------ | ----- | -------- | ------ | ------------- |
| #1 | P3 | Màn Daily | Nhập số thập phân bằng dấu phẩy (`,`) trên một số điện thoại gặp khó do `type="number"` | Hỗ trợ nhập mọi loại separator | Tuỳ locale điện thoại có thể bắt lỗi | Đổi thành `<input type="text" inputMode="decimal">` sau UAT |
| #2 | P3 | Summary | Header trên Mobile quá dài | Có thể ẩn bớt cột trên Mobile | Scroll ngang rất dài | Sẽ tinh chỉnh lại UI responsive nếu người dùng than phiền. |

## 13. Recommended Fix Plan

### Fix ngay trước UAT tiếp
- Không có lỗi nào đủ mức độ nghiêm trọng để can thiệp bây giờ. Cứ giữ nguyên.

### Fix sau UAT
- Xem xét ticket #1: Convert `<input type="number">` sang `<input type="text" inputMode="decimal">` kèm mask format để người dùng có thể linh hoạt nhập `.` hoặc `,`.
- Cải thiện Mobile UI: Ẩn bớt cột "Tổng KL Thiết kế" và "Đơn vị" ở Mobile trên màn Summary, chỉ hiện Lũy kế, Phát sinh để tiết kiệm không gian.

### Nâng cấp sau MVP
- Triển khai phân quyền (Roles & Permissions) thực sự.

## 14. Final Decision
- **Có được tiếp tục UAT không?** CÓ. Hệ thống đã đủ độ trưởng thành và chắc chắn về luồng số liệu.
- **Cần fix gì trước?** Không cần fix gì ngay lập tức.
- **Cái gì để sau?** Tối ưu nhập liệu dấu phẩy thập phân và Reponsive cực đoan trên Mobile (<390px).
