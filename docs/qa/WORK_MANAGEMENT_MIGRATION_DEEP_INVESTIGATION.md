# Deep migration investigation — Work Management

## Worktree and Git evidence

Baseline was captured in `WORK_MANAGEMENT_NEXT_PHASE_WORKTREE_BASELINE.md`: local `main` at `08828aa`; unrelated Documents changes remain untouched. `git remote -v`, `git ls-remote --heads origin`, `git ls-remote --tags origin` and `git fetch --all --prune --tags` were run. The reachable remote has only `main` (`20a00fe…`) and no tags; re-searching all refs found no target migration path.

`npx tsx scripts/qa/find-migration-blobs-by-checksum.ts` completed (exit 0): 15,876 objects, 4,306/4,306 blobs, 0 read errors, 523,080,689 bytes, largest blob 288,998,912 bytes. No match for successful checksums Phase 2 `734950…5c42`, Phase 3 `657b57…94c78`, or Remove Structure `f638ad…4deae`.

VS Code/Cursor/JetBrains/Codex history, PSReadLine (sanitized), mounted repository copies, backup folders and archive entries were queried read-only by migration name/checksum. No candidate source file was found. Codex hits were this investigation prompt/current-day transcripts only. PSReadLine has no target migration or `migrate resolve` command. No claim is made for inaccessible cloud/CI artifacts.

## Phase 2 timeline

| UTC | Asia/Bangkok | checksum | outcome |
|---|---|---|---|
| 08:43:27.622–08:43:52.988 | 15:43:27–15:43:52 | `409726…516a5` | rolled back, 0 steps; driver reports embedded null byte |
| 08:44:02.277–08:44:17.923 | 15:44:02–15:44:17 | `435bc9…80885` | rolled back, 0 steps; PostgreSQL 42601 at initial U+FEFF BOM before `-- CreateEnum` |
| 08:44:25.255–08:44:25.375 | 15:44:25 | `734950…5c42` | finished, 1 step, logs null |

The intervals are 9.289 seconds from first rollback to second start and 7.332 seconds from second rollback to successful start. This proves intermediate rewrites occurred, but does not prove which editor/command produced the successful bytes. Only the successful checksum could be restored; it was not found.

## Phase 3 and Remove Structure

Phase 3 ledger row: `0c597127-e23d-4325-80cd-1fc52f3a18de`, checksum `657b57…94c78`, started `08:54:52.682Z`, finished `08:54:52.915Z`, one step, no logs. No byte-identical candidate exists.

Remove Structure row: `6172be03-05a2-44a7-a739-af5f40a51ace`, checksum `f638ad…4deae`, started/finished `10:12:27.368Z` (`17:12:27` Bangkok), zero steps, empty logs. Read-only census finds Development still has Structure enums/tables while QA only has unrelated FieldProgressItem enum/table names. This is insufficient to conclude SQL applied, manual change+resolve, or intended no-op. Conclusion **D: insufficient evidence**.

## Result and gates

The three previously recovered migrations remain byte untouched. Phase 2, Phase 3 and Remove Structure are BLOCKED. M1 source completeness fails; M2 fresh replay, M3 drift and M4 reconciliation are not run; M5 QA safety previously passes but cannot authorize a deploy. No migration, resolve, db push, reset or SQL mutation was run.
