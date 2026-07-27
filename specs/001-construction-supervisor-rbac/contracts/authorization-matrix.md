# Authorization Contract

| Resource | Read | Create | Update | Delete | Submit | Decide/Lock | Export/Download |
|---|---:|---:|---:|---:|---:|---:|---:|
| Projects and operational data | all projects | deny | deny | deny | deny | deny | n/a |
| Field reports | all projects, including draft marker | deny | deny | deny | deny | deny | deny unless separate permission |
| Materials | all projects | deny | deny | deny | deny | deny | n/a |
| Tasks | all project tasks | deny | deny/comment/assign | deny | deny | deny | n/a |
| Documents | metadata + preview | deny upload/folder | deny | deny/restore | n/a | deny share | deny download |
| Approvals | view | deny request | deny | deny/cancel | n/a | deny | n/a |
| Weekly dossier owned by actor | view | allow | DRAFT or REVISION_REQUIRED | own draft only if retained | allow per state | deny | preview + Word/PDF/print except LOCKED |
| Weekly dossier owned by other actor | view | n/a | deny | deny | deny | deny | preview only |

All decisions are server-side. A denied route/action returns the repository-standard 401/403/404/error contract without canonical DTO/file and without mutation.
