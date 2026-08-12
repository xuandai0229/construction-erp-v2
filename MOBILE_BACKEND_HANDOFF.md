# CONSTRUCTION-ERP-V2 — MOBILE BACKEND HANDOFF DOCUMENTATION

Welcome to the backend contract reference for the **Construction ERP V2 Mobile Application** (React Native / Expo).
This document provides everything the Mobile Engineering Team needs to integrate with the backend.

---

## 1. BASE URL STRATEGY
- **Local Dev Server**: `http://localhost:3000/api/v1` (or local IP `http://192.168.x.x:3000/api/v1`)
- **Staging / Production**: `https://<domain>/api/v1`

---

## 2. AUTHENTICATION FLOW & BEARER HEADER

### Login Flow:
1. `POST /api/v1/auth/login`
   ```json
   {
     "email": "engineer@construction.local",
     "password": "your_password"
   }
   ```
2. Store `token` securely in mobile storage (`Expo SecureStore` / `AsyncStorage`).
3. For all subsequent API calls, attach header:
   ```http
   Authorization: Bearer <token>
   ```

### Logout Flow:
- Execute `POST /api/v1/auth/logout` with `Authorization: Bearer <token>`.
- Clear the token locally. The server automatically revokes token validity across all sessions.

---

## 3. PROJECT SCOPE & RBAC
- Mobile clients receive project-scoped data based on the authenticated user's role and assignments.
- If a user is assigned only to Project A, passing `projectId` of Project B will return `403 Forbidden`.

---

## 4. CORE ENDPOINTS SUMMARY

| Capabilities / Feature | Endpoint | Method | Scope / Permission |
| :--- | :--- | :--- | :--- |
| **Authentication** | `/api/v1/auth/login` | `POST` | Public |
| **Logout & Revoke** | `/api/v1/auth/logout` | `POST` | Authenticated |
| **User Profile** | `/api/v1/me` | `GET` | Authenticated |
| **Projects List** | `/api/v1/projects` | `GET` | RBAC Scoped |
| **Project Detail** | `/api/v1/projects/{id}` | `GET` | Project Member |
| **Project Dashboard** | `/api/v1/projects/{id}/dashboard` | `GET` | Project Member |
| **WBS Structure** | `/api/v1/projects/{id}/wbs` | `GET` | Project Member |
| **Daily Progress** | `/api/v1/projects/{id}/progress/daily` | `GET` / `POST` | Site Engineer / PM |
| **Site Reports** | `/api/v1/reports` | `GET` / `POST` | Site Engineer / PM |
| **Report Workflow** | `/api/v1/reports/{id}/submit`, `approve`, `reject` | `POST` | Author / Commander |
| **Material Proposals** | `/api/v1/material-proposals` | `GET` / `POST` | Project Member |
| **Proposal Workflow** | `/api/v1/material-proposals/{id}/approve`, `reject` | `POST` | Authorized Approver |
| **Approvals Center** | `/api/v1/approvals` | `GET` | Approver Role |
| **Notifications** | `/api/v1/notifications` | `GET` / `POST` | Self User |
| **Global Search** | `/api/v1/search?q={keyword}` | `GET` | Authenticated |
| **Supervision Dossiers**| `/api/v1/supervision/weekly` | `GET` | Authenticated |

---

## 5. LEGACY COMPATIBLE ENDPOINTS (MOBILE SUPPORTED)

| Feature | Legacy Endpoint | Method | Notes |
| :--- | :--- | :--- | :--- |
| **Document List** | `/api/documents/load-more?projectId={id}&type=folders\|files` | `GET` | Supports Bearer Token |
| **Download Document**| `/api/documents/{id}/download` | `GET` | Supports Bearer Token |
| **Upload Document** | `/api/documents/upload` | `POST` | Supports Bearer Token (`multipart/form-data`) |
| **Report Attachment**| `/api/reports/attachments/{attachmentId}` | `GET` | Supports Bearer Token |
| **Safety Plans** | `/api/reports/safety/plans` | `GET` / `POST` | Supports Bearer Token |
| **Safety Assessments**| `/api/reports/safety/self-assessments` | `GET` / `POST` | Supports Bearer Token |

---

## 6. PAGINATION & ERROR CONTRACT

### Standard Response Envelope:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'BAD_REQUEST' | 'NOT_FOUND' | 'SERVER_ERROR';
    message: string;
  };
}
```

---

## 7. NEXT STEP FOR MOBILE TEAM
The backend contract is **FROZEN & CERTIFIED**. The Mobile Engineering team can proceed to:
$$\text{MOBILE PHASE 1} \rightarrow \text{React Native + TypeScript Setup: Login} \rightarrow \text{Me} \rightarrow \text{Projects List} \rightarrow \text{Project Context} \rightarrow \text{Logout}$$
