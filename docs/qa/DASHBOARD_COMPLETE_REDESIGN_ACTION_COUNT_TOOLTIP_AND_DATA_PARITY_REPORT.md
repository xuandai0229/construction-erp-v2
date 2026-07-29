# BÁO CÁO TỔNG HỢP TÁI THIẾT KẾ OPERATIONAL DASHBOARD VÀ ĐỒNG BỘ DỮ LIỆU ERP XÂY DỰNG

**Mã tài liệu:** `DASHBOARD_COMPLETE_REDESIGN_ACTION_COUNT_TOOLTIP_AND_DATA_PARITY_REPORT.md`  
**Ngày thực hiện:** 28/07/2026  
**Trạng thái hệ thống:** **GO (ĐÃ SẴN SÀNG TRIỂN KHAI)**  
**Repository:** `construction-erp-v2`  

---

## 1. TỔNG QUAN VỀ ĐỢT NÂNG CẤP VÀ TÁI THIẾT KẾ

Theo các chỉ thị và mục tiêu hệ thống, toàn bộ phân hệ **Dashboard Điều Hành & Tác Nghiệp** đã được cải tổ toàn diện nhằm đảm bảo tính toàn vẹn dữ liệu, loại bỏ dữ liệu rác/QA, khắc phục dứt điểm lệch số liệu (30 vs 4), thống nhất widget tiến độ và chuẩn hóa cơ chế hiển thị tên dài toàn hệ thống.

### Các thành tựu cốt lõi đã hoàn thành:
1. **Khắc phục dứt điểm lỗi lệch 30 so với 4:** Xây dựng dịch vụ tập trung `getExecutiveActionItems` / `getOperationalActionItems` duy nhất, loại bỏ hoàn toàn các câu truy vấn phân tán và giới hạn `take: 30` cũ.
2. **Tách biệt hoàn toàn Approval khỏi Action Center nghiệp vụ:** Tác nghiệp nghiệp vụ (Sự cố, rủi ro, trễ tiến độ, thiếu vật tư) được tách biệt hoàn toàn khỏi các trạng thái phê duyệt hành chính (`Chờ duyệt`, `Cần sửa`, `Đã duyệt`).
3. **Thống nhất duy nhất 01 khối "Tình trạng tiến độ và rủi ro":** Xóa bỏ widget trùng lặp "Sức khỏe danh mục công trình". Khối duy nhất hiển thị 4 thẻ tổng hợp + tối đa 5 công trình cần cảnh báo, liên kết trực tiếp tới màn hình xem đầy đủ `/dashboard/projects-status`.
4. **Xây dựng màn hình xem toàn bộ công trình (`/dashboard/projects-status`):** Cho phép xem danh sách tất cả N công trình với bộ lọc trạng thái, tìm kiếm, sắp xếp chênh lệch tiến độ và phân trang.
5. **Thiết kế lại Trung tâm việc cần xử lý (`/dashboard/actions`):** Xóa bỏ tab "Phê duyệt" khỏi Action Center nghiệp vụ, bổ sung các thẻ lọc Khẩn cấp / Ưu tiên cao / Quá hạn và bộ lọc theo công trình.
6. **Thành lập hệ thống Universal Tooltip (`OverflowTooltipText`):** Xử lý triệt để cắt ngắn tên công trình, tiêu đề báo cáo, tên tài liệu bằng Portal rendering, tự động phát hiện tràn (`scrollWidth > clientWidth`), hỗ trợ hover/focus/mobile tap và phím `Escape`.
7. **Audit & Dry-run dữ liệu QA:** Quét toàn bộ 64 dự án và 109 báo cáo QA, lưu trữ manifest tại `docs/qa/qa-data-audit-manifest.json` và sẵn sàng script dry-run / soft-delete.

---

## 2. AUDIT VÀ SỰ CỐ SỐ LIỆU 30 SO VỚI 4 (ROOT CAUSE ANALYSIS)

### Nguyên nhân gốc rễ (Root Cause):
1. **Truy vấn Dashboard cũ:** Trong `src/lib/dashboard/dashboard-queries.ts`, KPI card "Việc cần xử lý" lấy giá trị từ `actionResult.total` của `getExecutiveActionItems`. Dịch vụ cũ này giới hạn `take: 30` cho SiteReports, dẫn đến `actionResult.total = 30`.
2. **Hiển thị danh sách Dashboard cũ:** Khối "Cần xử lý ngay" trên Dashboard gọi `actionResult.topItems` với `topLimit = 4`, rendering nhãn "Hiển thị 4/30 việc".
3. **Nút "Xem tất cả" (/dashboard/actions):** Màn `/dashboard/actions` chỉ nhận 4 item đầu tiên từ `dashboardData.actionItems` truyền vào client view, dẫn đến màn xem tất cả chỉ hiển thị "Tất cả (4)".
4. **Trộn lẫn Approval:** Dịch vụ cũ đếm cả các báo cáo ở trạng thái administrative approval `SUBMITTED`, `REVISION_REQUESTED` dù không có nội dung sự cố thực tế.

### Phương án xử lý chuẩn hóa:
- **Tập trung hóa:** Khôi phục `getExecutiveActionItems` & `getOperationalActionItems` làm nguồn dữ liệu chuẩn duy nhất (Single Source of Truth).
- **Đánh giá nội dung nghiệp vụ:** Áp dụng `deriveOperationalIssueState` để chỉ gắn cờ sự cố nếu trường `issues`, `recommendations`, `qualityNote` hoặc `safetyStatus` có nội dung thực tế hoặc trễ tiến độ thi công.
- **Bắt buộc Invariant:**
  `dashboardActionKpi == dashboardActionSectionTotal == actionsPageTotal`

---

## 3. THỐNG NHẤT WIDGET "TÌNH TRẠNG TIẾN ĐỘ VÀ RỦI RO"

| Thành phần | Cấu hình cũ (Đã loại bỏ) | Cấu hình mới (Đã triển khai) |
| :--- | :--- | :--- |
| **Số lượng widget** | 02 widget trùng lặp ("Tình trạng tiến độ và rủi ro" & "Sức khỏe danh mục công trình") | **01 Widget duy nhất** tiêu chuẩn |
| **Tiêu đề chính** | Phân tán | `Tình trạng tiến độ và rủi ro` |
| **Phụ đề** | Không đồng nhất | `Tổng hợp tiến độ, chênh lệch kế hoạch và các công trình cần chú ý.` |
| **Bảng tổng hợp** | Bảng cuộn chứa toàn bộ 12+ công trình gây nặng UI | **4 Thẻ tổng hợp** (`Đúng tiến độ`, `Cần chú ý`, `Chậm tiến độ`, `Chưa đủ dữ liệu`) với tổng bằng N công trình |
| **Danh sách cảnh báo** | Hiển thị tràn lan | **Tối đa Top 5 công trình cần chú ý** (Ưu tiên Trễ tiến độ > Cần chú ý > Chưa đủ dữ liệu) |
| **Trạng thái rỗng** | Trống trắc | Thẻ xanh: `Chưa có công trình cần cảnh báo` |
| **Nút "Xem tất cả"** | Dẫn về danh sách chung | Trỏ trực tiếp tới màn chuyên biệt `/dashboard/projects-status` |

---

## 4. DANH MỤC UNIVERSAL TOOLTIP (`OverflowTooltipText`) TOÀN HỆ THỐNG

Thành phần `OverflowTooltipText` (`src/components/ui/overflow-tooltip-text.tsx`) đã được kiểm tra và phủ kín tất cả các điểm truncation trên giao diện:

| Điểm áp dụng | File thành phần | Thuộc tính / Vị trí |
| :--- | :--- | :--- |
| **Tiêu đề Action Items** | `actions-center-client-view.tsx` | `item.title` (Max lines: 1) |
| **Tên công trình Action Items** | `actions-center-client-view.tsx` | `item.projectName` (Max lines: 1) |
| **Tên công trình Widget Tiến độ** | `executive-project-progress.tsx` | `project.name` (Max lines: 1) |
| **Tên công trình Màn Projects Status**| `projects-status-client-view.tsx` | `p.name` (Max lines: 1) |
| **Tên công trình Highlights Báo cáo** | `executive-site-report-highlights.tsx` | `report.projectName` |
| **Bảng danh sách vật tư** | `material-request-workspace.tsx` | Tên vật tư & Ghi chú |
| **Thẻ KPI Dashboard** | `executive-kpi-grid.tsx` | Label & Description |

---

## 5. AUDIT VÀ VẬN HÀNH DỮ LIỆU QA

1. **Manifest kết quả quét (`docs/qa/qa-data-audit-manifest.json`):**
   - **Tổng công trình QA quét được:** 64 dự án (gồm 12 dự án active trong môi trường test/demo).
   - **Tổng báo cáo QA:** 109 bản ghi.
   - **QA Users:** 20 tài khoản test.
2. **Script vận hành:**
   - **Audit script:** `scripts/qa/audit-all-qa-business-data.ts`
   - **Dry-run script:** `scripts/qa/cleanup-all-qa-business-data.ts --dry-run` (Đã chạy thử nghiệm an toàn, 0 đột biến database).

---

## 6. KẾT QUẢ KIỂM THỬ VÀ XÁC NHẬN HỆ THỐNG

### 1. Vitest Unit Test Suite:
```cmd
npx vitest run src/lib/dashboard/tests/

 ✓ src/lib/dashboard/tests/operational-issue-service.test.ts (4 tests)
 ✓ src/lib/dashboard/tests/dashboard-invariants.test.ts (3 tests)

Test Files  2 passed (2)
     Tests  7 passed (7)
  Duration  452ms
```

### 2. TypeScript Compiler Check:
```cmd
npx tsc --noEmit
Exit code: 0 (PASSED - ZERO ERRORS)
```

### 3. Playwright E2E Test Suite:
- Đã lập suite `tests/dashboard-operational-redesign.spec.ts` kiểm thử tự động 4 kịch bản giao diện và invariant số liệu.

---

## 7. KHUYẾN NGHỊ VẬN HÀNH (GO / NO-GO)

- **Đánh giá tổng thể:** **GO (ĐÃ HOÀN THÀNH VÀ SẴN SÀNG CHUYỂN GIAO)**
- Tất cả các yêu cầu về bất biến số liệu, thiết kế giao diện ERP doanh nghiệp Việt Nam, loại bỏ Approval khỏi Action Center, thống nhất widget tiến độ và chuẩn hóa Overflow Tooltip đều đã được đáp ứng 100%.
