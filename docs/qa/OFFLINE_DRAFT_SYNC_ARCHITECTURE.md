# Offline Draft & Sync Infrastructure Architecture Design

**Repository:** `construction-erp-v2`  
**Module:** `src/lib/offline-drafts`  
**Target Release:** Production Infrastructure Specification  

---

## 1. Architectural Philosophy

The **3-Tier Offline-Durable Data Protection Architecture** ensures zero data loss during network outages, server disconnects, browser reloads, tab closures, or sudden power failures.

```
                    ┌─────────────────────────────────────────┐
                    │               USER INPUT                │
                    └────────────────────┬────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │     TIER 1: FORM STATE  │                 │    TIER 2: INDEXEDDB    │
      │  - React Local State    │                 │  - Local DB Repository  │
      │  - 0ms Latency UI       │                 │  - 300ms Local Write    │
      │  - Active Field Control │                 │  - Persists F5 & Crash  │
      └─────────────────────────┘                 └────────────┬────────────┘
                                                               │
                                                               ▼
                                                  ┌─────────────────────────┐
                                                  │   OFFLINE SYNC QUEUE    │
                                                  │  - Sequential Exec      │
                                                  │  - Idempotent Retry     │
                                                  └────────────┬────────────┘
                                                               │
                                                (When Server Reachable)
                                                               │
                                                               ▼
                                                  ┌─────────────────────────┐
                                                  │    TIER 3: POSTGRESQL   │
                                                  │  - Optimistic Lock      │
                                                  │  - Single Transaction   │
                                                  │  - Audit Log Entry      │
                                                  └─────────────────────────┘
```

---

## 2. Core Modules Specification

The infrastructure resides in `src/lib/offline-drafts/` with the following structural layout:

```
src/lib/offline-drafts/
  ├── offline-draft-types.ts        # Data structures, status enums & payload schemas
  ├── offline-draft-db.ts           # IndexedDB connection manager & migration handler
  ├── offline-draft-repository.ts   # CRUD operations for local draft storage
  ├── offline-sync-queue.ts         # Idempotent sync queue & sequential worker
  ├── offline-draft-sanitizer.ts    # Unicode NFC normalization & payload hygiene
  └── offline-connectivity.ts       # Active health check engine (/api/health/connectivity)
```

---

## 3. IndexedDB Record Schema (`OfflineDraftRecord`)

```ts
export type OfflineDraftState =
  | "LOCAL_ONLY"       // Draft created offline, not yet attempted to sync
  | "PENDING_SYNC"     // Enqueued for server synchronization
  | "SYNCING"          // Active sync request in progress
  | "SYNCED"           // Successfully committed to PostgreSQL server
  | "CONFLICT"         // Version conflict detected (requires user or field merge)
  | "FAILED";          // Sync attempt failed (network/server error, retained in local DB)

export interface OfflineDraftRecord {
  id: string;                   // Local unique draft key (tenantId:userId:module:entityId)
  tenantId: string;             // Multi-tenant isolation key
  userId: string;               // User isolation key
  module: 
    | "SAFETY_WEEKLY_FILE"
    | "SAFETY_PLAN"
    | "SAFETY_ASSESSMENT"
    | "SUPERVISION_WEEKLY"
    | "SITE_DAILY_REPORT"
    | "MATERIAL"
    | "TASK"
    | "DOCUMENT";
  entityId: string | null;      // Server DB ID (null if new unsaved record)
  localEntityId: string;        // Client generated UUID for correlation

  formVersion: number;          // Client schema version
  serverVersion: number | null;  // Last known PostgreSQL optimistic lock version

  payload: unknown;             // JSON-serializable sanitized form payload
  payloadHash: string;          // SHA-256 / SHA-1 checksum for change detection

  state: OfflineDraftState;
  retryCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;

  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
  lastLocalSavedAt: string;     // ISO timestamp of last IndexedDB write
  lastSyncAttemptAt: string | null;
  lastServerSavedAt: string | null;

  idempotencyKey: string;       // Unique UUID v4 key per mutation cycle
  correlationId: string;        // Tracing identifier for audit logs
  expiresAt: string | null;     // Cleanup TTL timestamp
}
```

---

## 4. Connectivity Health Engine

Relying solely on `navigator.onLine` is insufficient because browsers can report `online = true` while behind captive portals, proxy errors, or dropped server sockets.

The **`OfflineConnectivity`** service periodically checks `/api/health/connectivity`:

```ts
export type NetworkHealthStatus = 
  | "ONLINE"
  | "OFFLINE_DEVICE"
  | "SERVER_UNREACHABLE"
  | "DATABASE_UNAVAILABLE"
  | "AUTH_EXPIRED";
```

- Poll Interval: Every 15 seconds when online; every 5 seconds when retrying after disconnection.
- Auto Trigger: Instantly fires on window `online` or `focus` events.

---

## 5. Synchronization & Idempotency Rules

1. **Sequential Execution per Entity:** Only one sync request runs per entity at any given time to eliminate race conditions.
2. **Snapshot Coalescing:** If user edits a form 10 times offline, the queue syncs **only the latest snapshot**, discarding intermediate superseded updates.
3. **Exponential Backoff Retry:** Retries on failure at 2s, 5s, 15s, 30s, and 60s intervals.
4. **Idempotency Header:** All sync requests include `X-Idempotency-Key` and `X-Correlation-ID`. The server validates against `IdempotencyRecord` table before executing database transactions.
5. **Optimistic Locking:** If server returns `VERSION_CONFLICT`, the client retains local draft state and presents the non-destructive Merge UI.
