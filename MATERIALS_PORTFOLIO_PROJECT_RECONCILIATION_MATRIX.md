# MATERIALS PORTFOLIO ↔ PROJECT RECONCILIATION MATRIX

Read-only DB audit, 2026-08-11. Counts are raw database records in the same 21-project portfolio set. `Proposal UI` excludes CANCELLED because the listing query does so; the KPI currently does not.

| Project | Materials | Stocks | Stock quantity | Movements | Proposals DB / UI | Portfolio match | Project match | Difference | Verdict |
|---|---:|---:|---:|---:|---:|---|---|---:|---|
| CT-2026-0001 Thanh Xuân | 5 | 5 | 915 | 7 | 5 / 5 | Yes | Yes | 0 | FAIL stock ledger: 2 mismatches |
| CT-2026-0015 Xuân Phương | 5 | 5 | 3,640 | 7 | 7 / 6 | **No** for proposal KPI/list | List matches project list | 1 | FAIL semantic + 1 stock mismatch |
| CT-2026-0011 Vĩnh Tuy | 2 | 2 | 12,100 | 3 | 5 / 5 | Yes | Yes | 0 | FAIL stock ledger: 1 mismatch |
| CT-2026-0002 Quảng trường Đông Hồ Hoàn Kiếm | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0003 THCS Lệ Chi | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0004 Mầm non Kim Sơn | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0005 MN Hoa Hồng | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0006 Mầm non Minh Khai | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0007 Trường học Tây Hồ 15 trường | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0008 Trường học Tây Hồ 13 trường | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0009 Khu liên cơ Võ Chí Công | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0010 Cống hộp Nguyễn Chí Thanh | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0012 Mầm non 20-10 | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0013 Đường/ngõ Láng | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0014 Đường Lạc Long Quân–Nhật Chiêu | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0016 Trần Nhân Tông | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0017 Trung Văn | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0018 Trung Văn | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0019 Hồ Phùng Khoang | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0020 Duy tu giao thông Đại Mỗ | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| CT-2026-0021 Dương Văn Bé | 0 | 0 | 0 | 0 | 0 / 0 | Yes | Yes | 0 | No Materials data |
| **Total** | **12** | **12** | **16,655** | **17** | **17 / 16** | **No** | **No KPI/list parity** | **1** | **FAIL** |

## Conservation results

| Metric | Portfolio raw DB | Sum project scope | Difference | Result |
|---|---:|---:|---:|---|
| MaterialItem | 12 | 12 | 0 | PASS |
| ProjectMaterialStock | 12 | 12 | 0 | PASS |
| Stored stock quantity | 16,655 | 16,655 | 0 | PASS as stored value only |
| MaterialMovement | 17 | 17 | 0 | PASS count only |
| MaterialProposal | 17 | 17 | 0 | PASS raw count only |
| MaterialProposalItem | 22 | 22 | 0 | PASS |

## Reconciliation exceptions

1. Proposal KPI counts 17 including cancelled; the project/portfolio list displays 16 excluding `DVT-QA-2026-008`.
2. Four stock rows fail movement-ledger reconciliation: Thanh Xuân Xi măng (-20), Thanh Xuân Thép (+200), Xuân Phương Thép (-500), Vĩnh Tuy Gạch (+3,000).
3. No relation mismatch, orphan, duplicate stock row, cross-project proposal item, or negative stock is present.

**Matrix verdict: FAIL.** Raw portfolio/project counts conserve, but the visible proposal semantics and quantity ledger do not yet reconcile.
