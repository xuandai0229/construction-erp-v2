# Full System Database & Autosave/Offline Audit Report

**Repository:** `construction-erp-v2`  
**Audit Date:** 2026-07-31  
**Environment:** QA Environment (`construction_erp_v2_qa` @ `127.0.0.1:5432`)  
**Database Guard Status:** **PASSED** (Non-production database confirmed)

---

## 1. Executive Summary

This audit establishes a complete map of data persistence, form saving pipelines, version locking, and database integrity across the **Construction ERP v2** platform. Currently, while certain forms (such as Weekly Safety Plans and Self-Assessments) implement debounced in-memory auto-saving via Server Actions, the system **lacks a durable local persistence layer (IndexedDB)**. 

If a network disconnection, browser crash, tab closure, or power outage occurs prior to server transaction completion, uncommitted user input in form state is lost. This report details the full inventory of forms, current data flow pipelines, database integrity scan findings, and the transition plan to a robust 3-Tier Offline-Safe Architecture.

---

## 2. Form & Save Pipeline Inventory

| Module | Route / Component | Form / Sub-Form | Save Mode | Current Autosave | Offline Local Draft | Version Lock | Idempotency | Transaction Atomicity | Identified Risks |
|---|---|---|---|---|---|---|---|---|---|
| **Safety Reporting** | `/reports/safety/weekly-files/[id]?tab=plan` | Weekly Safety Inspection Plan Editor (Mẫu 02) | Autosave + Manual (Ctrl+S) | 1000ms Debounce (Server Action) | **None (React Memory Only)** | Yes (`version Int`) | Partial (Session Lock) | Yes (Prisma `$transaction`) | Data lost if offline during typing or tab closed before debounce timer fires. |
| **Safety Reporting** | `/reports/safety/weekly-files/[id]?tab=assessment` | Weekly Self-Assessment Report Editor (Mẫu 01) | Autosave + Manual (Ctrl+S) | 1000ms Debounce (Server Action) | **None (React Memory Only)** | Yes (`version Int`) | Partial (Session Lock) | Yes (Prisma `$transaction`) | Data lost if offline during typing or tab closed before debounce timer fires. |
| **Safety Reporting** | `/reports/safety` | Create Weekly Dossier Modal | Manual Button Click | None | **None** | No | Unique Period Lock | Yes (`$transaction`) | Rapid double clicks can trigger race conditions if client button isn't disabled. |
| **Supervision Module** | `/supervision/weekly/[id]` | Supervision Weekly Report Editor | Manual Button Click | None | **None** | Yes (`version Int`) | None | Yes (`$transaction`) | Large form with multi-section inputs; high data loss risk on browser drop. |
| **Field Site Reporting** | `/reports/field` | Site Daily Report Form (Work, Material, Labor, Weather, Photos) | Manual Button Click | None | **None** | No | None | Partial | Photo uploads and nested line items lose progress on connection drops. |
| **Project Management** | `/projects/new`, `/projects/[id]/edit` | Project General Info & Scope Form | Manual Button Click | None | **None** | No | Unique Code Constraint | Single Query | No version locking; potential concurrent edit overwrites. |
| **Material Management** | `/materials` | Material Request & Stock Transfer Form | Manual Button Click | None | **None** | No | None | Partial | Nested items require multi-step creation; lost on interruption. |
| **Work Tasks** | `/tasks` | Task Assignment & Daily Progress Log | Manual Button Click | None | **None** | No | None | Single Query | Fast status toggles can outstrip slow network responses. |
| **Document Management** | `/documents` | Document Upload & Metadata Classification | Manual Upload Button | None | **None** | No | File Checksum (Partial) | Single Query | Large file uploads fail completely on network drops without chunk resumability. |

---

## 3. Data Flow Pipeline Analysis (Current vs Target)

### 3.1 Current Data Flow Pipeline (Fragile)
```
[User Typing Input] 
       │
       ▼
[React Component State] ──(1000ms Debounce)──► [Server Action / API Call]
                                                      │
                                                      ▼
                                           [Prisma Transaction]
                                                      │
                                                      ▼
                                            [PostgreSQL Commit]
```
* **Vulnerability:** Network drops, browser refresh, tab closure, or power loss between user typing and PostgreSQL commit result in 100% loss of uncommitted local state.

### 3.2 Target 3-Tier Offline-Durable Pipeline
```
[User Typing Input]
       │
       ├───────────────────────────────────────────────────────┐
       ▼                                                       ▼
[Tier 1: Immediate React Form State]        [Tier 2: Durable IndexedDB Draft]
  - 0ms latency UI update                     - 300ms Debounce Local Write
  - Smooth cursor & input                     - Retained across F5 / Crash / Offline
                                                               │
                                                               ▼
                                                  [Offline Sync Queue]
                                                               │ (When Online)
                                                               ▼
                                               [Tier 3: Server Sync Action]
                                                 - Idempotency Key
                                                 - Optimistic Version Lock
                                                 - Transactional DB Commit
                                                               │
                                                               ▼
                                                  [PostgreSQL DB Commit]
```

---

## 4. Current Client Storage & Dependency Audit

- **`localStorage` Usage:** 0 calls in `src/` (Clean baseline).
- **`sessionStorage` Usage:** 0 calls in `src/` (Clean baseline).
- **`IndexedDB` Usage:** Not yet initialized in `src/`.
- **Background Sync / Service Worker:** Not yet configured for offline queueing.

---

## 5. Phase 1 Risk Matrix & Mitigation Recommendations

| Risk Item | Severity | Mitigation Strategy |
|---|---|---|
| In-memory auto-save lost on network drop | **CRITICAL** | Implement Tier-2 IndexedDB local persistence repository with background sync queue. |
| Orphaned legacy Safety Plans / Assessments (`weeklyFileId = null`) | **HIGH** | Run safe backfill migration script to link orphaned records to parent Weekly Files. |
| Concurrent edit overwrites without versioning in secondary forms | **MEDIUM** | Standardize `version Int @default(1)` optimistic locking across all core entity models. |
| Duplicate API calls on client retry | **HIGH** | Implement `IdempotencyRecord` table and server middleware header checking. |
| Unhandled offline attachments/photos | **MEDIUM** | Store metadata queue in IndexedDB; upload chunks when connection restores. |
