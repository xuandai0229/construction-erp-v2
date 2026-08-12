# CONSTRUCTION-ERP-V2 — API V1 FROZEN CONTRACT SPECIFICATION

- **API Version**: `v1`
- **Status**: **FROZEN FOR MOBILE DEVELOPMENT**
- **Freeze Date**: August 12, 2026
- **Target Mobile Framework**: React Native / Expo (TypeScript)

---

## 1. GLOBAL CONTRACT RULES & CONVENTIONS

### 1.1 Base URL & Environment Strategy
- **Development**: `http://localhost:3000/api/v1`
- **Staging / Production**: `https://<domain>/api/v1`

### 1.2 Authentication Scheme
- **Scheme**: `Authorization: Bearer <TOKEN>`
- **Token Acquisition**: Via `POST /api/v1/auth/login`.
- **Token Invalidation**: `POST /api/v1/auth/logout` or user password update invalidates active tokens instantly.
- **Web Cookie Fallback**: Server supports `HttpOnly` cookie `auth_session` for Web browsers seamlessly.

### 1.3 Universal JSON Response Wrapper
All V1 API endpoints strictly return the following JSON structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  },
  "error": null
}
```

On Failure:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED | FORBIDDEN | BAD_REQUEST | NOT_FOUND | SERVER_ERROR",
    "message": "Chi tiết lỗi bằng tiếng Việt"
  }
}
```

---

## 2. FROZEN ENDPOINTS CONTRACT CATALOG

### 2.1 Auth Module

#### `POST /api/v1/auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "user@construction.local",
    "password": "user_password"
  }
  ```
- **Response `data`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cuid...",
      "name": "Nguyen Van A",
      "email": "user@construction.local",
      "role": "ADMIN | PROJECT_MANAGER | SITE_COMMANDER | ENGINEER | STAFF"
    }
  }
  ```

#### `POST /api/v1/auth/logout`
- **Auth**: Bearer / Cookie
- **Response `data`**: `{ "message": "Đã đăng xuất thành công." }`

#### `GET /api/v1/me`
- **Auth**: Bearer / Cookie
- **Response `data`**: User profile with scoped project assignments.

---

### 2.2 Projects Module

#### `GET /api/v1/projects`
- **Auth**: Bearer / Cookie (RBAC Filtered)
- **Params**: `page`, `pageSize`, `search`
- **Response `data`**: Array of accessible project summary objects.

#### `GET /api/v1/projects/{projectId}`
- **Auth**: Bearer / Cookie (Requires Project Scope)
- **Response `data`**: Complete project detail object.

#### `GET /api/v1/projects/{projectId}/dashboard`
- **Auth**: Bearer / Cookie (Requires Project Scope)
- **Response `data`**: Project-specific operational metrics and progress summaries.

#### `GET /api/v1/projects/{projectId}/wbs`
- **Auth**: Bearer / Cookie (Requires Project Scope)
- **Response `data`**: Hierarchical Work Breakdown Structure task tree.

#### `GET /api/v1/projects/{projectId}/progress/daily`
- **Auth**: Bearer / Cookie (Requires Project Scope)
- **Params**: `page`, `pageSize`, `date`
- **Response `data`**: Daily field progress logs.

#### `POST /api/v1/projects/{projectId}/progress/daily`
- **Auth**: Bearer / Cookie (Project Member)
- **Request Body**:
  ```json
  {
    "wbsItemId": "cuid...",
    "workDate": "2026-08-12",
    "completedQuantity": 150.5,
    "note": "Hoàn thành công tác đổ bê tông dầm sàn"
  }
  ```

---

### 2.3 Site Reports Module

#### `GET /api/v1/reports`
- **Auth**: Bearer / Cookie (RBAC Scoped)
- **Params**: `projectId`, `page`, `pageSize`, `status`
- **Response `data`**: Array of site reports.

#### `POST /api/v1/reports`
- **Auth**: Bearer / Cookie (Project Member)
- **Request Body**:
  ```json
  {
    "projectId": "cuid...",
    "reportDate": "2026-08-12",
    "title": "Báo cáo nhật ký thi công ngày 12/08",
    "weather": "Nắng nhẹ",
    "temperature": 32,
    "laborCount": 45,
    "workSummary": "Thi công cốt thép cột tầng 3"
  }
  ```

#### `POST /api/v1/reports/{id}/submit`
- **Auth**: Bearer / Cookie (Report Author)
- **Action**: Transitions report state from `DRAFT` to `SUBMITTED`.

#### `POST /api/v1/reports/{id}/approve`
- **Auth**: Bearer / Cookie (Site Commander / PM)
- **Action**: Transitions report state to `APPROVED`.

#### `POST /api/v1/reports/{id}/reject`
- **Auth**: Bearer / Cookie (Site Commander / PM)
- **Request Body**: `{ "reason": "Thiếu ảnh chụp nghiệm thu cốt thép" }`

---

### 2.4 Material Proposals Module

#### `GET /api/v1/material-proposals`
- **Auth**: Bearer / Cookie (RBAC Scoped)
- **Params**: `projectId`, `page`, `pageSize`, `status`

#### `POST /api/v1/material-proposals`
- **Auth**: Bearer / Cookie (Project Member)
- **Request Body**:
  ```json
  {
    "projectId": "cuid...",
    "title": "Đề xuất vật tư thép D18 đợt 2",
    "items": [
      {
        "materialName": "Thép D18 Hòa Phát",
        "unit": "Tấn",
        "requestedQuantity": 12.5,
        "note": "Dùng cho dầm D1"
      }
    ]
  }
  ```

#### `POST /api/v1/material-proposals/{id}/approve`
- **Auth**: Bearer / Cookie (Authorized Approver)

#### `POST /api/v1/material-proposals/{id}/reject`
- **Auth**: Bearer / Cookie (Authorized Approver)
- **Request Body**: `{ "reason": "Khối lượng đề xuất vượt dự toán" }`

---

### 2.5 Approvals & Notifications

#### `GET /api/v1/approvals`
- **Auth**: Bearer / Cookie (RBAC Scoped Pending Actions)

#### `GET /api/v1/notifications`
- **Auth**: Bearer / Cookie (Self User Scoped)

#### `POST /api/v1/notifications/read-all`
- **Auth**: Bearer / Cookie

---

### 2.6 Global Utilities & Search

#### `GET /api/v1/search`
- **Auth**: Bearer / Cookie
- **Params**: `q` (minimum 2 characters)
- **Response `data`**: Filtered search results across projects, reports, and proposals.

#### `GET /api/v1/users`
- **Auth**: Bearer / Cookie
- **Use Case**: Dropdown selection (Approvers, Members).
- **Guaranteed Fields**: `id`, `name`, `email`, `role`, `phone`. Sensitive credentials/secrets are **0% EXPOSED**.

---

### 2.7 Legacy Mobile Compatible Endpoints

- **Documents**: `GET /api/documents/load-more?projectId={id}&type=folders|files` (Bearer Allowed)
- **Document Download**: `GET /api/documents/{documentId}/download` (Bearer Allowed)
- **Document Upload**: `POST /api/documents/upload` (Bearer Allowed)
- **Report Attachment Download**: `GET /api/reports/attachments/{attachmentId}` (Bearer Allowed)
- **Safety Plans**: `GET /api/reports/safety/plans` (Bearer Allowed)
- **Safety Assessments**: `GET /api/reports/safety/self-assessments` (Bearer Allowed)
