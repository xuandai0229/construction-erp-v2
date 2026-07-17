# Work Management Phase 1 Browser Timeout Diagnosis

## Prior-run timeline

| Milestone | Status | Evidence |
|---|---|---|
| T0 runner start | REACHED | `tsx` runner process began. |
| T1 server spawned | REACHED | A `next start` child process later owned port 3107. |
| T2 port listening | REACHED | `netstat` identified the runner-created Node process on 3107. |
| T3 HTTP readiness | UNKNOWN | The old runner inferred readiness from stdout only; it had no HTTP probe. |
| T4 fixture ready | UNKNOWN | Buffered output prevented a trustworthy checkpoint. |
| T5 browser launched | UNKNOWN | No durable artifact was produced before timeout. |
| T6-T8 auth, tasks, assertion | NOT REACHED / UNKNOWN | Browser assertions were not emitted. |
| T9 cleanup | REACHED manually | Runner-owned port process was stopped; prefixed QA fixture cleanup reported zero remaining fixtures. |

## Root cause

The old runner treated a `Ready` stdout line as its readiness contract and killed only its shell parent. On timeout this could leave the actual `next start` child holding port 3107, making the next runner exit with `EADDRINUSE`. This was orchestration failure, not a schema or Work Management lifecycle failure.

## Correction

The production runner now uses bounded HTTP readiness against `/login`, captures stdout/stderr for diagnostics, refuses an exited child with its final logs, and kills only the process tree rooted at the PID it spawned. A fresh fixture prefix is `WM-PHASE1-E2E-`; cleanup is bound to the run manifest.
