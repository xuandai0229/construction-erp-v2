# SYSTEM STRUCTURE REORGANIZATION AUDIT

## 1. Kết luận ngắn

* Hệ thống hiện đang phân tán logic nghiệp vụ (actions nằm trong route `src/app`, UI nằm trong `src/components`, core logic nằm trong `src/lib`). Nhìn chung cấu trúc `features-based` này khá ổn nhưng chưa triệt để.
* Thư mục `docs/qa/` đang vô cùng lộn xộn với khoảng 70+ file báo cáo lịch sử.
* Có một số file bị đặt sai vị trí (ví dụ: `src/app/actions/material-request.ts`).
* Rủi ro nếu cấu trúc lại toàn bộ thành mô hình `src/modules/*` là **RẤT CAO (HIGH)** do sẽ phá vỡ toàn bộ import paths và routing. Do đó, chỉ nên thực hiện các thay đổi nhỏ, ít rủi ro (LOW risk) trước.
* Phase này chưa sửa hay thay đổi bất cứ code nào.

## 2. Cấu trúc hiện tại

Cấu trúc hiện đang tuân theo Next.js App Router kết hợp Feature Folders cơ bản:

```text
src/
  app/
    (dashboard)/          # Chứa các trang nghiệp vụ chính (accounting, projects, reports...)
      [module]/actions.ts # Server actions thường đặt luôn trong thư mục route
    api/                  # API routes
    actions/              # Chứa file material-request.ts (đặt sai vị trí)
  components/
    ui/                   # UI components dùng chung (shadcn-like)
    layout/               # Layout components (sidebar, header)
    [module]/             # UI components riêng cho từng nghiệp vụ (reports, projects...)
  lib/                    # Lõi nghiệp vụ
    [module]/             # permissions, business rules, helpers
    auth.ts, rbac.ts      # Core security files nằm rải rác ở root
```

## 3. Vấn đề phát hiện

| STT | Khu vực | Vấn đề | Mức độ | Rủi ro nếu sửa | Đề xuất |
| --: | ------- | ------ | ------ | -------------- | ------- |
| 1 | `docs/qa/` | Hơn 70 file báo cáo QA cũ (`REPORTS_*.md`) gây nhiễu, khó tìm báo cáo mới. | MEDIUM | LOW | Move toàn bộ các báo cáo cũ (Phase 1-6, R1-R6) vào thư mục `docs/qa/archive/`. |
| 2 | `src/app/actions/` | File `material-request.ts` bị vứt lơ lửng ngoài cấu trúc chuẩn. | LOW | MEDIUM | Cần mapping import và move vào `src/app/(dashboard)/projects/[id]/material-requests/actions.ts` hoặc `src/lib/materials/`. (Chưa làm vội). |
| 3 | `src/lib/` (root) | Các file core như `auth.ts`, `rbac.ts`, `session-token.ts`, `audit.ts` nằm rải rác. | LOW | HIGH | Nên gom vào `src/lib/core/` hoặc `src/lib/auth/`. Đòi hỏi sửa import toàn dự án. Cần cẩn thận. |
| 4 | Cấu trúc phân tán | Actions, UI, Business Rules nằm rải rác ở 3 thư mục gốc khác nhau (`app`, `components`, `lib`). | MEDIUM | HIGH | Để nguyên nếu team đã quen. Nếu muốn gộp thành `src/modules/`, cần làm cực kỳ cẩn thận cho từng feature một. |

## 4. Cấu trúc đề xuất

Về lâu dài, cấu trúc module chuyên biệt là tốt nhất:

```text
src/
  app/
    (dashboard)/
    api/

  components/
    ui/
    layout/
    shared/

  lib/
    core/             # Chứa auth, rbac, prisma, audit
    utils/            # Các helpers thuần
    constants/        # Định nghĩa hằng số

  modules/            # Gom TẤT CẢ nghiệp vụ về đây
    projects/
    reports/
    documents/
```

Tuy nhiên, do dự án đang chạy ổn định, việc đập đi xây lại sang `modules/` có thể không cần thiết và rủi ro cao. Chúng ta sẽ ưu tiên giữ nguyên cấu trúc `features-based` hiện tại nhưng làm nó gọn gàng hơn.

## 5. Mapping cũ → mới (Cho các việc Rủi ro thấp)

| STT | Path hiện tại | Path đề xuất | Lý do | Có nên move ngay không | Rủi ro |
| --: | ------------- | ------------ | ----- | ---------------------- | ------ |
| 1 | `docs/qa/REPORTS_*.md` (Các file QA cũ) | `docs/qa/archive/` | Dọn dẹp thư mục QA | CÓ | LOW |
| 2 | `docs/qa/SAFE_*.md`, `docs/qa/SETTINGS_*.md`, ... | `docs/qa/archive/` | Dọn dẹp báo cáo quá khứ | CÓ | LOW |
| 3 | `src/app/actions/material-request.ts` | `src/app/(dashboard)/.../actions.ts` | Đúng chuẩn cấu trúc | KHÔNG (Để làm sau) | MEDIUM |

## 6. Danh sách KHÔNG ĐƯỢC ĐỤNG

Tuyệt đối không được thay đổi, di chuyển hay sửa đổi các khu vực sau trong đợt refactor này:
* `storage/`
* `backups/`
* `prisma/migrations/`
* `.env`
* Bất kỳ dữ liệu upload công trình, ảnh tiến độ, hóa đơn, chứng từ, bản vẽ nào.
* `scripts/` (Các script seed/test chưa audit sâu).

## 7. Kế hoạch refactor an toàn

### Phase A — Archive docs/qa cũ
Chỉ move tài liệu QA cũ (khoảng 70 files) vào `docs/qa/archive/`. Không xóa. (Đây là công việc duy nhất được làm ở Phase 3 ngay bây giờ).

### Phase B — Gom file core (Tương lai)
Gom `auth.ts`, `rbac.ts` vào một nơi. Cần chạy test/build kiểm chứng kỹ.

### Phase C — Di chuyển các file lạc loài
Move `material-request.ts` về đúng chỗ.

### Phase D & E — Tách component và chuẩn hóa module
Để sau khi đã có test tự động đầy đủ.
