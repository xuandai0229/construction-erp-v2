# CONSTRUCTION-ERP-V2 — AI AGENT TOOL CANDIDATES & REST V1 BINDINGS

## OVERVIEW
This document maps the **REST API V1** surface of `construction-erp-v2` into structured candidate functions for **AI Agents** (LLM Tool Calling, Auto-GPT, LangChain, Model Context Protocol tools).

### Architectural Policy:
1. **Delegated Security Context**: AI Agents operate using a delegated session or service token context. Storing or handling raw user passwords by AI Agents (`login_agent`) is **STRICTLY DISCOURAGED / NOT RECOMMENDED**.
2. **No Direct Prisma Access**: Autonomous AI tools must interface strictly through REST API V1 or Service layer guards (`AI Tool → REST V1 / Service → RBAC → Prisma`). Direct database query access is strictly prohibited.

---

## 1. AGENT TOOL CLASSIFICATION & CATALOG

### 🟢 Category A: READ TOOL READY (Autonomous Agent Execution Allowed)

#### Tool 1: `get_agent_profile`
- **Description**: Returns authenticated agent identity and list of accessible projects with RBAC roles.
- **HTTP**: `GET /api/v1/me`
- **Classification**: `READ TOOL READY`

#### Tool 2: `list_scoped_projects`
- **Description**: Searches and lists construction projects accessible to the agent context.
- **HTTP**: `GET /api/v1/projects?search={search}`
- **Classification**: `READ TOOL READY`

#### Tool 3: `get_project_dashboard`
- **Description**: Retrieves aggregated real-time operational metrics for a specific construction project.
- **HTTP**: `GET /api/v1/projects/{projectId}/dashboard`
- **Classification**: `READ TOOL READY`

#### Tool 4: `get_project_wbs`
- **Description**: Fetches the Work Breakdown Structure (WBS) task tree for a project.
- **HTTP**: `GET /api/v1/projects/{projectId}/wbs`
- **Classification**: `READ TOOL READY`

#### Tool 5: `search_system_entities`
- **Description**: Performs a global RBAC-filtered keyword search across projects, site reports, and material proposals.
- **HTTP**: `GET /api/v1/search?q={query}`
- **Classification**: `READ TOOL READY`

#### Tool 6: `get_global_dashboard`
- **Description**: Retrieves company-wide operational metrics and recent field reports.
- **HTTP**: `GET /api/v1/dashboard`
- **Classification**: `READ TOOL READY`

---

### 🟡 Category B: WRITE TOOL REQUIRES CONFIRMATION (Human-In-The-Loop Approval Required)

#### Tool 7: `submit_daily_progress`
- **Description**: Submits a field daily progress entry for a specific WBS item.
- **HTTP**: `POST /api/v1/projects/{projectId}/progress/daily`
- **Classification**: `WRITE TOOL REQUIRES CONFIRMATION`

#### Tool 8: `create_site_report`
- **Description**: Generates a new daily or weekly site report for a project.
- **HTTP**: `POST /api/v1/reports`
- **Classification**: `WRITE TOOL REQUIRES CONFIRMATION`

#### Tool 9: `transition_site_report`
- **Description**: Advances site report approval workflow state (submit, approve, reject).
- **HTTP**: `POST /api/v1/reports/{reportId}/submit` (or `/approve`, `/reject`)
- **Classification**: `WRITE TOOL REQUIRES CONFIRMATION`

#### Tool 10: `create_material_proposal`
- **Description**: Creates a material purchase proposal with requested items.
- **HTTP**: `POST /api/v1/material-proposals`
- **Classification**: `WRITE TOOL REQUIRES CONFIRMATION`

#### Tool 11: `approve_material_proposal`
- **Description**: Executes technical or financial approval step on a material proposal.
- **HTTP**: `POST /api/v1/material-proposals/{id}/approve`
- **Classification**: `WRITE TOOL REQUIRES CONFIRMATION`

---

### 🔴 Category C: DEPRECATED / NOT RECOMMENDED

#### Tool 0: `login_agent(email, password)`
- **Status**: **DEPRECATED / DISCOURAGED**
- **Rationale**: Agents should receive a delegated Bearer token from the secure environment runtime rather than holding user plaintext passwords.
