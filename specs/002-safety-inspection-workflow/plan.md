# Kế hoạch triển khai: Quản lý kiểm tra ATLĐ, PCCC, VSMT

**Nhánh**: chưa tạo | **Ngày**: 2026-07-30 | **Đặc tả**: [spec.md](spec.md)

## Tóm tắt

Xây dựng phân hệ additive, project-scoped cho vòng đời Kế hoạch tuần → lịch → kiểm tra hiện trường → tồn tại/khắc phục/kiểm tra lại → báo cáo tự đánh giá → phê duyệt → Word/PDF. Dữ liệu thực tế của session là nguồn duy nhất cho báo cáo và tài liệu xuất; mẫu công ty là nguồn định dạng bất biến.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2.7, React 19, Prisma 7.8.0.

**Primary Dependencies**: Zod, date-fns, docx, Vitest, Playwright; Microsoft Word/WPS chỉ là công cụ tương thích/QA tài liệu, không phải nguồn dữ liệu.

**Storage**: PostgreSQL hiện hữu; `Document`/document storage hiện hữu cho evidence/template/export; local encrypted browser store + outbox idempotent cho draft offline.

**Testing**: Vitest (domain/policy/mapping), integration với database cô lập, Playwright/axe (responsive/RBAC), golden document render/diff.

**Target Platform**: Next web desktop/tablet/mobile; máy chủ Windows QA có Microsoft Word để kiểm tra fidelity; xác nhận mở WPS như một cổng phát hành.

**Constraints**: Không sửa entity legacy, không dữ liệu giả, server-side project scope, UI tiếng Việt, no silent history rewrite, template fidelity chỉ PASS sau render/đối chiếu.

**Scale/Scope**: Nhiều công trình/buổi; 7 ngày × 3 buổi; mỗi buổi nhiều lịch/session; nhiều evidence/finding; một report có nhiều entry cùng ngày/buổi.

## Constitution Check

Constitution hiện chỉ là template chưa được project ratify, nên không thể coi là gate thực chất. Gating thay thế bắt buộc từ yêu cầu người dùng và `AGENTS.md`:

- PASS: additive schema/migration-only, project scope server-side, reuse assets an toàn.
- PASS có điều kiện: Next.js code chỉ được viết sau khi đọc guide đúng phiên bản trong `node_modules/next/dist/docs/`.
- BLOCK trước code: cần quyết định chủ hệ thống cho lỗi mẫu; cần baseline golden có dữ liệu thật/cô lập; cần xác nhận policy lưu GPS/ghi âm/transcription.

## Permission matrix

| Hành động | Cán bộ ATLĐ | BCH/chỉ huy trưởng | Phòng kỹ thuật/trưởng bộ phận | Ban giám đốc | Quản trị viên |
|---|---:|---:|---:|---:|---:|
| Lập/sửa kế hoạch nháp trong scope | Có | Không | Rà soát | Xem | Không tự có |
| Bắt đầu/hoàn tất kiểm tra | Có | Không | Xem | Xem | Không tự có |
| Tạo/giao tồn tại | Có | Không | Xem/rà soát | Xem | Không tự có |
| Gửi khắc phục | Không | Chỉ project được giao | Không | Không | Không tự có |
| Kiểm tra lại/quyết định completion | Có, độc lập policy | Không | Rà soát theo scope | Xem | Không tự có |
| Lập/sửa report draft | Có | Không | Rà soát | Xem | Không tự có |
| Yêu cầu sửa/duyệt/khóa | Không | Không | Theo scope được cấu hình | Có | Theo policy hiện tại, không mặc định |
| Quản lý template/checklist | Không | Không | Không | Không | Có, nhưng không sửa dữ liệu nghiệp vụ nếu policy cấm |
| Xem/tải evidence | Scope tương ứng | Scope project được giao | Scope được giao | Toàn công ty | Theo policy, không vượt scope mặc định |

Mọi ô `Có` vẫn yêu cầu session + phạm vi `projectId`; role toàn công ty chỉ áp dụng nếu policy hiện hữu thật sự cấp quyền đó.

## Wireframe chức năng

```text
Điện thoại — Phiên kiểm tra
┌──────────────────────────────────┐
│ ← CT A · Thứ 3 / Sáng      Đã lưu │
│ Tiến độ 08/20  ███████░░░░        │
│ [Tất cả] [Chưa KT] [Chưa đạt]     │
│                                  │
│ A. Bảo hộ                         │
│ Dây đai, mũ, lưới, điểm neo       │
│ [ Đạt ] [ Chưa đạt ] [ Không AD ] │
│                                  │
│             [ Hoàn thành kiểm tra ]│
└──────────────────────────────────┘

Desktop — Điều phối tuần
┌──────────────────────────────────────────────────────────┐
│ Kế hoạch tuần 31 · 28/07—03/08  [Lưu] [Trình duyệt]       │
│ Thứ 2  Sáng: CT A + CT B  Chiều: Huấn luyện  Tối: —       │
│ Thứ 3  Sáng: CT C          Chiều: Kiểm tra lại #AT-17     │
│ ...                                                      │
│ [Tồn tại mở] [Quá hạn] [Chờ kiểm tra lại] [So kế hoạch/thực]│
└──────────────────────────────────────────────────────────┘
```

Không hiển thị trang Word để nhập liệu. Chỉ preview/in dùng layout template, lặp header bảng nếu bảng thực tế qua trang (khác với mẫu trống khi cần tránh mất ngữ cảnh).

## Chiến lược template Word/PDF và golden document

1. Copy hai mẫu vào kho template có version/SHA-256 và record `SafetyDocumentTemplate`; template gốc chỉ đọc.
2. Lập manifest mapping token/range/table: header, số văn bản, ngày, căn cứ, checklist source text, rows kế hoạch/báo cáo, narrative, nơi nhận, chữ ký và footer field.
3. Fill bản sao template, giữ `sectPr`, margins, direct formatting, geometry, border, signatures và field page number. Không tạo DOCX hoàn toàn mới “na ná”.
4. Render Word → PDF → PNG với Microsoft Word để test baseline; render output từ dataset golden giống hệt quy tắc đó. So sánh page count, kích thước, bounding box key regions và image diff từng trang.
5. Golden report liệt kê chênh lệch theo trang; PASS chỉ khi chênh lệch được giải thích/duyệt. Kiểm tra mở lại bằng Word và WPS trước release.

## File-by-file plan (không tạo ở bước discovery)

| Lát | Tệp tạo/sửa dự kiến | Lý do | Bằng chứng yêu cầu |
|---|---|---|---|
| 0. Guardrail | `node_modules/next/dist/docs/...` (đọc), `docs/qa/...` | Xác nhận convention Next 16 và baseline | Ghi log guide đã đọc, no-code review |
| 1. Schema | `prisma/schema.prisma`, `prisma/migrations/<timestamp>_add_safety_inspection/*` | Chỉ thêm enum/model/index/relation | `prisma validate`, migration trên DB QA, rollback note |
| 1. Domain | `src/lib/safety-inspection/{types,week,status,permissions,findings,report-aggregate}.ts` + unit tests | Logic tuần/status/overdue/projection/scope | Vitest |
| 2. Data access | `src/app/api/safety-inspection/**/route.ts` hoặc server action feature-local | Transaction, optimistic/idempotent mutation, audit/event | Integration + direct API RBAC |
| 2. Evidence | `src/lib/safety-inspection/evidence.ts`, protected download/upload routes | Reuse Document with ownership guard | File cross-project test |
| 3. Plan UI | `src/app/(dashboard)/safety-inspection/plans/**`, components feature-local | Calendar/grid desktop, auto-save, warnings | desktop/tablet Playwright |
| 4. Field UI | `src/app/(dashboard)/safety-inspection/sessions/[id]/**`, PWA/offline module | Large one-hand controls, drafts/sync | mobile/offline/refresh E2E |
| 5. Findings | `.../findings/**`, action components | Corrective lifecycle/reinspection | role + overdue tests |
| 6. Report/approval | `.../reports/**`, policy adapter/notification mapping | Projection and approval/lock | aggregate/lock/RBAC tests |
| 7. Documents | `src/lib/safety-inspection/document-export/**`, `tests/golden-documents/**` | Template fill, Word/PDF, render diff | artifact DOCX/PDF and diff report |
| 8. QA | `tests/safety-inspection/**`, `scripts/qa/safety-inspection-*` | Regression matrix and runtime captures | runtime images + cleanup manifest |

## Risk register

| Rủi ro | Mức | Giảm thiểu / cổng chặn |
|---|---|---|
| Tuyên bố “100% giống” không có bằng chứng | Rất cao | Golden render/diff, Word/WPS QA, chỉ PASS khi có report |
| Câu chữ mẫu bị thay đổi | Cao | SourceText immutable + correction registry chờ duyệt |
| Rò rỉ ảnh/evidence qua Document chung | Rất cao | Resource guard riêng, negative direct-download tests |
| Offline tạo trùng/ghi đè | Cao | idempotency key, version, append audit, conflict UI |
| Bảng dài vỡ trang | Cao | template fill + repeated headers + multi-page golden fixtures |
| Coupling legacy supervision | Cao | Namespace Safety riêng, không migrate/rewrite legacy |
| GPS/ghi âm lộ dữ liệu cá nhân | Cao | opt-in permission, minimal metadata, retention/access review trước build |

## Project structure

```text
specs/002-safety-inspection-workflow/
├── spec.md
├── research.md
├── data-model.md
├── contracts/safety-inspection-api.md
├── quickstart.md
├── plan.md
└── tasks.md                 # chỉ tạo sau khi design được phê duyệt

src/
├── app/(dashboard)/safety-inspection/
├── app/api/safety-inspection/
├── components/safety-inspection/
└── lib/safety-inspection/

prisma/migrations/<timestamp>_add_safety_inspection/
tests/safety-inspection/
scripts/qa/safety-inspection-*.ts
```

**Structure Decision**: Tách feature-local để tránh lan truyền coupling vào reports/supervision legacy; adapter tới documents/notifications/approvals chỉ qua contract hẹp và policy server-side.

## Trạng thái quyết định

Thiết kế **chưa cho phép code**. Điều kiện để chuyển sang task/implementation: chủ hệ thống xác nhận xử lý các lỗi mẫu; chấp thuận policy evidence/GPS/ghi âm; snapshot template có hash; và xác nhận bộ quyền mapping với vai trò hiện hữu.
