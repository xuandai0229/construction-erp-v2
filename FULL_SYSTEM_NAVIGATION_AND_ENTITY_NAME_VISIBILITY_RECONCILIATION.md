# Full system navigation and entity-name visibility reconciliation

Ngày: 11/08/2026  
Trạng thái: **PARTIAL / RUNTIME UNVERIFIED**

## 1. Baseline

- Commit baseline: `c68347a318ed122c9301cdfcda6c5069c9a5f629`.
- Worktree đã có thay đổi Materials và các phase trước. Không reset, clean, checkout hàng loạt, seed, migration hoặc thay đổi dữ liệu trong phase này.
- Các file thay đổi trong phase này được giới hạn ở primitive UI, Materials workspace/portfolio overview, Project identity/list, dashboard project status, báo cáo, an toàn, giám sát tuần, phân công nhân sự và phê duyệt.

## 2. Materials diagnosis

Static audit xác định hai root cause:

1. `EnterpriseTabs` chỉ render content tabs. Scope selector lại nằm ở `PageHeader`, tạo hai cụm điều hướng rời nhau, khoảng trống lớn và hierarchy không rõ.
2. `SafeText` luôn gắn `truncate` (`white-space: nowrap`). Những caller thêm `line-clamp-2` cho tên công trình có thể vẫn bị ép một dòng. Portfolio overview còn đặt `max-w-[480px]` cho cột công trình dù metric columns rất hẹp.

Runtime browser đã mở `http://localhost:3000/materials?scope=portfolio&tab=overview`, nhưng được redirect đến `/login`. Vì không có phiên QA được cấp, không thể lấy DOM/bounding box/screenshot cho dữ liệu thật.

## 3. Navigation before/after

| Trước | Sau |
|---|---|
| Tabs và scope nằm ở hai container khác nhau | Một navigation bar có hai vùng semantic |
| Scope trông như control phụ trong header | Scope là data-scope selector ở bên phải navigation |
| Không gian desktop giữa tabs và scope bị chết | `xl` đặt tabs trái, selector phải cùng hàng |
| Mobile có nguy cơ nhét tất cả controls | Scope là hàng đầu, tab tự scroll ở hàng thứ hai |

`EnterpriseTabs` nhận `rightContent` tùy chọn. Không caller hiện hữu nào bị đổi hành vi nếu không truyền vùng này.

## 4. Scope selector architecture

- Chỉ Material workspace truyền `rightContent`.
- Không còn phiên bản selector thứ hai trong header khi user có company scope.
- Scope selector dùng `aria-pressed`, focus ring và visual treatment kiểu segmented control, khác content tabs.
- `updateUrl` hiện bắt đầu từ `searchParams` hiện hữu nên giữ filter/search state. Khi vào project scope từ portfolio, nó tạo `returnTo` nội bộ `/materials?...` với tab/filter hiện thời. Khi trở lại portfolio, `projectId` và `returnTo` được xóa rõ ràng.

## 5. Project-name contract

- Identity-critical project names: tối đa hai dòng trên desktop và mobile card/list nơi name là primary anchor.
- Không cấp fixed `max-w` cho project name nếu parent còn không gian.
- Native `title` hoặc `OverflowTooltipText`/`ProjectName` cung cấp giá trị đầy đủ khi clamp.
- Mã công trình là metadata thứ cấp. Portfolio không render mã cạnh tên.

## 6. Materials reference changes

- Portfolio overview dùng `table-fixed` với cột Công trình 52%; vật tư 8%, thiếu tồn 10%, đề xuất 10%, giao dịch 12%, mức độ 8%.
- Bỏ `max-w-[480px]` của tên công trình.
- Tên công trình ở overview, attention ranking, catalog/stock/transaction portfolio có hai dòng thật qua `SafeText` đã sửa.
- Project header dùng `ProjectName` hai dòng; mã xuất hiện ở hàng metadata nhỏ (`Mã: ...`), không cạnh tranh với tên.
- Tabs trái và scope selector phải từ `xl`; dưới `xl` selector trước, tabs scroll ngang trong chính navigation bar. Không tạo body horizontal overflow.

## 7. Shared component changes

- `SafeText` có prop `lines?: 1 | 2`, tự nhận diện `line-clamp-2`, chuyển sang `whitespace-normal` khi cần và luôn đặt `title`/`aria-label` cho string.
- `ProjectName`/`OverflowTooltipText` tiếp tục là primitive duy nhất cho tên công trình có tooltip chỉ khi overflow.
- `ProjectIdentity` table/header dùng `ProjectName` cho title quan trọng; selector/card/full cũng có native `title` cho tên bị clamp/wrap.

## 8. System-wide scan counts and inventory

Static scan toàn `src/app`, `src/components`, `src/lib`:

| Token | Số file có dùng |
|---|---:|
| `truncate` | 56 |
| `line-clamp` | 36 |
| `whitespace-nowrap` | 41 |
| `overflow-x-auto` | 36 |
| `table-fixed` | 8 |
| `overflow-hidden` | 72 |
| `max-w-` | 132 |
| `w-[` | 99 |
| `projectName`/`project.name`/`ProjectName`/`ProjectIdentity` | 76 |

Classification:

| Bề mặt | Entity identity | Kết quả source audit |
|---|---|---|
| Materials portfolio/project | Công trình, vật tư | Đã sửa reference pattern |
| Projects list/detail/selector | Công trình | Đã tăng width list và chuẩn hóa header/table |
| Dashboard project status | Công trình | Đã dùng hai dòng |
| Reports | Công trình | Đã dùng `ProjectName` hai dòng |
| Safety | Công trình | Đã dùng `ProjectName` hai dòng |
| Supervision weekly | Công trình | Đã dùng `ProjectName` hai dòng |
| HR project assignments | Công trình | Đã dùng `ProjectName` hai dòng; code secondary |
| Approvals | Công trình | Đã bỏ code-prefix trong tên, dùng hai dòng + code metadata |
| Documents breadcrumb, global search/notification, small dashboard metadata | Metadata trong không gian hẹp | Còn compact by design, cần runtime review với tên dài |
| Print/PDF/Excel/preview | Tài liệu pháp lý | Không áp line-clamp web pattern |

## 9. Table and header hierarchy fixes

- `ProjectsListClient`: Công trình 42%, địa điểm/phụ trách 24%, actions cố định 100px.
- `MaterialsPortfolioOverview`: project name 52% và metrics compact/right-aligned.
- `ProjectAssignmentTable`: tên công trình hai dòng, code hàng metadata phụ trên mobile và desktop.
- `ApprovalCenter`: project name hai dòng, code không còn cùng chuỗi với tên.

## 10. Responsive and navigation evidence

Source contract:

| Viewport | Navigation behavior |
|---|---|
| >=1280 | tabs trái, scope selector phải, một hàng |
| 1024-1279 | scope có thể lên hàng riêng có kiểm soát, tabs vẫn scroll độc lập |
| 768 | scope luôn thấy, tabs horizontal scroll nội bộ |
| 390 | scope hàng 1, tabs hàng 2, không ép bảy controls một dòng |

Chưa thể xác minh bằng runtime screenshot/bounding box vì browser không có session đăng nhập.

## 11. Navigation-state evidence

Đã đọc source và sửa URL update để giữ `searchParams` thay vì dựng query mới. Luồng `portfolio -> project` tạo `returnTo` nội bộ và giữ tab/filter. Luồng `project -> portfolio` loại `projectId`/`returnTo`. Runtime click-through, preview/edit return và back navigation vẫn **UNVERIFIED**.

## 12. Console/network and quality

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` sau thay đổi | PASS |
| `npm run lint` toàn repository | PASS |
| Targeted ESLint các file thay đổi | PASS |
| `git diff --check` | PASS |
| Browser console/network | UNVERIFIED - bị chặn ở login |
| `npm run build` sau thay đổi navigation | PASS, exit code 0 |

## 13. Remaining defects and next runtime gate

Không thể tuyên bố full-system PASS trước khi có phiên QA. Cần runtime test:

1. Materials portfolio/project đủ 5 tabs tại 1920, 1024, 768 và 390.
2. Project name dài thực tế ở Materials, Projects, Reports, Safety, Supervision, HR Assignments và Approvals.
3. Scope/tab/filter/returnTo sau click project, proposal preview/edit và quay lại.
4. Console không React/hydration/ARIA warning, network không 404/500.
5. Review compact metadata ở Documents, Global Search, Notification bell và Dashboard để quyết định có cần hai dòng hay vẫn đúng hierarchy.

## 14. Final verdict

**PARTIAL / RUNTIME UNVERIFIED.** Materials reference pattern và các identity-critical surface ưu tiên cao đã được sửa ở source, nhưng browser runtime, screenshot matrix, full lint/build và toàn bộ compact metadata chưa được chứng minh thực tế. Không có kết luận 10/10 hay full-system PASS.
