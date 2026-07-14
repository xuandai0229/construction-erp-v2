# Local/remote history analysis

`git rev-list --left-right --count main...origin/main` returned `1 0`; merge-base is `20a00fe`. `origin/main` is an ancestor of local `main`, while local `main` is not an ancestor of origin. Therefore local is **AHEAD by one commit**, not diverged. The local-only commit is `08828aa don_pate35`. Current reachable remote refs were verified; historical deleted remote refs remain **NOT VERIFIABLE**. No target migration artifact appears on either side.
