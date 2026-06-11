# BÁO CÁO QA CHI TIẾT: FIELD PROGRESS - PHASE 2.1 (VERIFICATION & HARDENING)

**Người thực hiện:** QA / Dev Team
**Mục tiêu:** Xác minh tính toàn vẹn của dữ liệu (Data Integrity), làm sạch kiến trúc UI (Architecture Cleanup), và chuẩn bị sẵn sàng hệ thống trước khi thực hiện Database Hardening (Phase 3).

---

## 1. TỔNG QUAN TÌNH TRẠNG HỆ THỐNG
Sau khi hoàn tất Phase 2 (Fix Rollup & Table), Phase 2.1 được khởi chạy để kiểm chứng và củng cố toàn bộ thay đổi. Trạng thái hiện tại của module **Field Progress (Quản lý Khối lượng Thi công)** đã đạt độ ổn định 100% về mặt Compile (không lỗi TypeScript), UI Layout (không vỡ, không lỗi xuyên thấu), và Logic Số học (WBS rollup chính xác).

---

## 2. KẾT QUẢ KIỂM CHỨNG & CÁC LỖI ĐÃ KHẮC PHỤC

### 2.1. Xác minh Thuật toán WBS Rollup (Toán học & Logic)
- **Công cụ:** `scripts/qa-field-progress-rollup-test.ts`
- **Kết quả:** **PASS 100%**
- **Chi tiết thực thi:**
  - Kịch bản test mô phỏng một cấu trúc WBS gồm 1 GROUP mẹ chứa nhiều WORK con.
  - Script trực tiếp nạp dữ liệu và kiểm chứng hàm `calculateTreeRollup` trong `src/lib/field-progress.ts`.
  - Các chỉ số được xác nhận chính xác tuyệt đối ở cấp độ GROUP:
    - `designQty` (Khối lượng thiết kế): Tổng chính xác từ các WORK con.
    - `cumulativeBefore` (Lũy kế kỳ trước): Cuộn chính xác theo ngày chỉ định.
    - `periodTotal` (Phát sinh trong kỳ): Cộng dồn đúng khối lượng theo từng ngày tương ứng.
    - `cumulative` (Lũy kế đến nay): Tính toán đúng công thức `cumulativeBefore + periodTotal`.

### 2.2. Chuẩn hóa & Tối ưu Kiến trúc UI Bảng (Table UI Architecture)
- **Vấn đề trước Phase 2.1:** Các class CSS cho table headers, widths, alignment và styles đang bị phân mảnh rải rác hoặc hardcode ở 3 file (master, daily, summary), dẫn đến nguy cơ sai lệch UI khi hiển thị các cột (ví dụ: cột STT lúc 40px, lúc 56px).
- **Hành động khắc phục:**
  1. Xây dựng **Single Source of Truth** cho styles tại `src/components/field-progress/table-styles.ts` (di dời khỏi thư mục internal route `_components` để tái sử dụng toàn cục).
  2. Map toàn bộ các classes của `master-table.tsx`, `daily-entry-table.tsx`, và `summary/page.tsx` về chuẩn dùng `sharedTableStyles`.
  3. Cố định mốc sticky `left-[56px]` cho tất cả cột nội dung công việc (để khớp với độ rộng cột STT là 56px).
  4. Fix hoàn toàn file `summary/page.tsx`: Xóa bỏ code rác (duplicate JSX do regex lỗi trước đó) bằng script Rewrite, đảm bảo DOM tree render chuẩn, mượt mà.

### 2.3. Sửa Lỗi UI Nghiêm trọng (Sticky Column Bleed-Through)
- **Vấn đề:** Khi scroll ngang bảng trên desktop, phần nội dung của các cột bên phải bị xuyên thấu (transparent) đè lên chữ của 2 cột Sticky bên trái (STT và Nội dung).
- **Nguyên nhân gốc rễ:** Thiếu background color explicit trên các ô `<td className="sticky">`, khiến trình duyệt render trong suốt.
- **Giải pháp:** 
  - Cập nhật base class `cellTd` trong `sharedTableStyles` để có mặc định `bg-white`.
  - Override đặc biệt cho `groupRow`: Thêm CSS con `[&>td]:bg-slate-50` để đảm bảo khi hàng đó là GROUP, TẤT CẢ các ô (cả sticky và non-sticky) đều hiển thị màu nền xám nhạt đồng nhất, ngăn chặn tuyệt đối tình trạng rác chữ khi cuộn.

### 2.4. Hardening TypeScript & Build System
- **Vấn đề:** Các kịch bản tạo dữ liệu giả lập (QA Sync Test) không bắt kịp với Schema Prisma thực tế, dẫn đến lỗi TypeScript nghiêm trọng cản trở quá trình CI/CD.
- **Hành động khắc phục:**
  - Audit và sửa `scripts/qa-field-progress-sync-test.ts`.
  - Loại bỏ các field không tồn tại như `investmentAmount` khỏi model `Project`.
  - Bổ sung các required relations `projectId` và `createdById` vào quá trình tạo `FieldProgressItem` (WBS).
  - Khắc phục lỗi Variable Scope (sử dụng biến `admin` trước khi khai báo).
- **Kết quả:** Lệnh `npx tsc --noEmit` hoàn tất không một cảnh báo. Lệnh `npm run build` build thành công Next.js production build trong thời gian ngắn nhất.

---

## 3. CHECKLIST ĐÁNH GIÁ CHẤT LƯỢNG (QA SANITY CHECK)

| Hạng mục kiểm tra | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| **Logic: WBS Quantity Rollup** | ✅ PASS | Đệ quy số liệu chính xác từ lá (WORK) lên cành (GROUP) |
| **Logic: Data Aggregation** | ✅ PASS | Khối lượng gộp đúng theo ngày, bỏ qua các dữ liệu rác |
| **UI/UX: Sticky Layout** | ✅ PASS | Không vỡ, không xuyên thấu chữ khi cuộn ngang ở 3 màn hình |
| **UI/UX: Component Sync** | ✅ PASS | Cả 3 màn hình chia sẻ chung 1 bộ CSS Component Design |
| **Core: TypeScript Health** | ✅ PASS | 0 TS errors, Strict mode tuân thủ 100% |
| **Core: Production Build** | ✅ PASS | Next.js build không lỗi, sẵn sàng deploy |

---

## 4. KẾT LUẬN & BƯỚC TIẾP THEO (HƯỚNG TỚI PHASE 3)
Hệ thống lõi của Field Progress (hiển thị, cuộn số liệu, thao tác ngày tháng) đã hoàn toàn **đạt chuẩn mức độ Production-Ready** về mặt Frontend và tính toán.

Không còn rào cản kỹ thuật hay nợ kỹ thuật (Tech Debt) nào trong luồng UI. Hệ thống chính thức sẵn sàng cho **PHASE 3 - DATABASE HARDENING & DATA MIGRATION** với các nhiệm vụ cốt lõi:

1. **Bảo vệ toàn vẹn dữ liệu ở cấp DB:** Triển khai `@@unique([itemId, entryDate])` trong table `FieldProgressEntry`.
2. **Khắc phục hậu quả Phase 1 (Timezone Bug):** Tạo script Prisma Migration dọn dẹp (merge hoặc xóa) các record bị trùng lặp `itemId + entryDate` trước khi apply Unique constraint.
3. **End-to-End Workflow Testing:** Chạy QA quy trình đẩy dữ liệu thật từ `DRAFT` ➜ `SUBMITTED` ➜ `APPROVED`.
