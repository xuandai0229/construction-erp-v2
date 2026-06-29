# SAFE TEST DATA CLEANUP EXECUTE REPORT

## 1. Môi trường Thực thi
- **Branch hiện tại**: `main`
- **Commit hiện tại**: `eb5ebea (HEAD -> main) Chuan hoa confirm dialog toast va thong bao he thong`
- **Database env**: `postgresql://***:***@127.0.0.1:5432/construction_erp_v2?schema=public`

---

## 2. Backup Database
- **File Backup**: `backups/construction_erp_v2_before_test_cleanup.dump`
- **Lệnh thực thi**: `pg_dump`
- **Tình trạng**: Đã tạo file `.dump` thành công trước khi bắt đầu cleanup execute.

---

## 3. Quá trình Execute (Transaction)

Hệ thống đã thực hiện xoá dữ liệu sử dụng `prisma.$transaction`. Kết quả xóa chính xác theo danh sách ID từ Dry-Run (`docs/qa/test-data-cleanup-dry-run-results.json`).

### Danh sách Project ID đã dọn (33 projects)
`cmqitfq6m00e44cwknsynw6s7`, `cmqhx5zrb0003gswk1m23nnnk`, `cmqhxm2m80036gswk3q7rzzjp`, `cmqhxoe75004qgswkdjew4sls`, `cmqisuhgp00004cwk8blzbm3s`, `cmqiswna8001k4cwkk2m5cb27`, `cmqisyqpg00344cwkahee2ih7`, `cmqit0w85004o4cwkd9irm3xb`, `cmqit305s00684cwkps14l1hb`, `cmqit5tqq007s4cwkopcq7556`, `cmqit85lk009f4cwk7eylvy7y`, `cmqitaxl100b04cwkvtz5vguc`, `cmqitco8h00ck4cwkiusmoth7`, `cmqithz6c00fp4cwk1ga4aw0c`, `cmqitm3zs00hc4cwkco3gqvoi`, `cmqitpbib00j64cwkvu1eohhh`, `cmqitruc400l04cwk4tp1y8dx`, `cmqitusxw00mu4cwkj179gzos`, `cmqitxpxx00oo4cwknp3qr7n2`, `cmqiu1l2400qi4cwkt0stwovv`, `cmqiu3qz800sc4cwksyfnccwh`, `cmqiu7xij00u64cwkk0g0pzf6`, `cmqiu9dy300w04cwkxf3r9ms9`, `cmqiub60v00xv4cwk2epd99qj`, `cmqiuf4xj00zp4cwk30xrcifz`, `cmqiuj1ko011j4cwkrq2n6rlk`, `cmqiummqo013d4cwkbsqnlbwl`, `cmqiuoy6q01574cwkujfkc9iy`, `cmqiur5as01714cwkun8mb57t`, `cmqiuxj4r0000mwwkvzi1t7u8`, `cmqivalnc000328wkb2nxcf0b`, `cmqivalne000428wkso4rjbd3`, `cmqiztpxp000huswkwiu6uz9s`

### Danh sách Material Request ID đã dọn (5 MRs)
`cmqj156bb0000kgwkfg22r7u4`, `cmqj156bp0002kgwkdu055dyk`, `cmqj156bu0006kgwkq581shos`, `cmqj156by0009kgwk64lep7el`, `cmqj156c2000bkgwk7x6qenjc`

---

## 4. Xác nhận Nguyên tắc Không động chạm (Zero Impact)
- Nhóm `Needs Confirmation` (Projects: `CT0011`, `ct_01`... Field Progress Entries test trên dự án thật) hoàn toàn được bảo vệ, KHÔNG BỊ XÓA.
- Nhóm `Keep` (Các dự án chính, 5 user seed `admin`, `director`...) hoàn toàn được giữ nguyên.

---

## 5. Kết quả Re-Audit (Sau Cleanup)

### A. Kiểm tra lại bằng script Dry-Run:
- Số bản ghi thuộc nhóm **Safe To Cleanup** hiện tại bằng 0.
- Nhóm **Needs Confirmation** vẫn là 6 Projects, 40 FieldEntries, 3 DocumentFolders.
- Nhóm **Keep** giữ nguyên 1 Project demo và 6 Users.

### B. Kết quả Audit Bảng `FieldProgressEntry`:
- **Trước Cleanup**: Tổng cộng 515 Entries.
- **Sau Cleanup**: Còn lại **215 Entries**. Số lượng lớn (300 Entries) rác liên quan tới các project UAT đã được xoá triệt để nhờ cơ chế **CASCADE** của Prisma (Xoá Project -> Xoá FieldProgressTemplate -> Xoá Items -> Xoá Entries). Lợi ích của Cascade giúp DB gọn gàng ngay lập tức.

---

## 6. Kiểm tra Toàn Vẹn Hệ Thống (Build & Test)
- `npx prisma validate`: Schema hợp lệ.
- `npx prisma generate`: Cập nhật Prisma client thành công (253ms).
- `npx tsc --noEmit`: Không có lỗi kiểu dữ liệu.
- `npm run build`: Tối ưu hóa trang tĩnh (Static Pages) thành công, không gặp lỗi.
- Toàn bộ Test Script Playwright (`qa-user-management-*`, `qa-rbac-*`, `qa-field-progress-*`, `qa-material-requests-integration-test`) đều chạy **PASS 100%**.

---

## 7. Rủi ro còn lại & Khuyến nghị
- Một số script test vẫn đang sinh ra các bản ghi bị soft-delete (Ví dụ: `qa-field-progress-uat-integration.ts`). 
- Vẫn còn nhóm `Needs Confirmation` (6 projects). Bạn cần xác nhận lại danh sách này bằng mắt hoặc UI để có thể lên kế hoạch xóa trong tương lai, nhưng hiện tại đã loại bỏ được 33 project rác lớn nhất, đủ để giảm tải đáng kể cho UI.

---

## 8. Trạng thái Git Cuối Phase

`git status --short`:
```text
A  docs/qa/TEST_UAT_DATA_INVENTORY_AUDIT_REPORT.md
?? docs/qa/SAFE_TEST_DATA_CLEANUP_DRY_RUN_REPORT.md
?? docs/qa/SAFE_TEST_DATA_CLEANUP_EXECUTE_REPORT.md
?? docs/qa/test-data-cleanup-dry-run-results.json
?? scripts/qa-test-data-cleanup-dry-run.ts
?? scripts/qa-test-data-cleanup-execute.ts
```

- Không commit file `backups/*.dump`. Thư mục backups đang nằm trong `.gitignore`.
- Đã xác nhận không có thao tác commit/push nào được tự động thực hiện.
