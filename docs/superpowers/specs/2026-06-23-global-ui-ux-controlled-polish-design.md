# Global UI/UX Controlled Professional Polish — Design

## Intent

Tạo một lớp visual system thống nhất cho ERP công trình mà không thay đổi dữ liệu, quyền, workflow hay handler nghiệp vụ.

## Chosen approach

Áp dụng **foundation + surgical polish**:

1. Cố định light enterprise tokens và shared interaction classes.
2. Nâng primitive Button, Card, StatusBadge, EmptyState, ConfirmDialog.
3. Chuẩn hóa layout/container/header.
4. Sửa có chọn lọc Reports, Projects, Documents và Users.
5. Đưa module placeholder về cùng page/empty-state pattern.

Không chọn redesign từng màn độc lập vì sẽ tiếp tục tạo drift. Không chọn refactor component lớn vì tăng rủi ro workflow và vượt phạm vi UI.

## Component boundaries

- `globals.css`: semantic color/surface/focus/field utilities.
- `components/ui/*`: primitive visual contract.
- `components/layout/*`: application frame.
- Module components: chỉ thay class, markup accessibility và dùng primitive; giữ state/action hiện tại.

## Responsive design

- 1440/1366: table và action đầy đủ.
- 768: card hoặc compact table tùy module.
- 390: stack toolbar, form một cột, modal theo `dvh`, action không phụ thuộc hover.

## Verification

- Static contract script chạy trước/sau để bảo vệ các rule UI chính.
- Browser UAT ở các breakpoint nếu có credential hợp lệ.
- Prisma validate/generate, TypeScript, ESLint và production build.

## Constraints

- Không commit/push.
- Không migration/reset/cleanup/hard delete.
- Không thay đổi business logic, RBAC hoặc workflow.
- Production luôn NO-GO trong nhiệm vụ này.
