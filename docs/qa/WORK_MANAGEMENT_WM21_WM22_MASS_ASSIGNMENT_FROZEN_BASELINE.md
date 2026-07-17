# WM-21/WM-22 Mass-assignment frozen baseline

- Public command objects use exact own-key allowlists.
- Unknown and server-owned fields are rejected.
- Inherited fields, accessors, symbols and custom prototypes are rejected.
- Exact structural validation does not authenticate a snapshot; service trust remains DEFERRED.
- Core Task schemas remain strict.
- Patch-scoped diff is required; unrelated full-worktree whitespace is a WM-28 warning.
- Schema: NO-GO.
