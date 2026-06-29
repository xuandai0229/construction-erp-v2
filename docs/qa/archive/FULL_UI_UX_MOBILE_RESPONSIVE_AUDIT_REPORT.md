# FULL UI/UX MOBILE RESPONSIVE AUDIT REPORT

## 1. Pham vi kiem tra

- Thoi gian kiem tra: 2026-06-25, timezone Asia/Bangkok.
- Project/data test: `QA-TUHIEP-5F-001`, dang nhap bang `qa.admin.tuhiep@example.test`.
- Server: da co process lang nghe port `3000`, nen audit UI that bang browser duoc thuc hien. Khong chay `npm run dev`.
- Breakpoint da kiem tra: `360x740`, `390x844`, `430x932`, `768x1024`, `1366x768`, `1920x1080`.
- Lenh da chay: `git status --short`, `git ls-files`, `netstat -ano | Select-String ':3000'`, Playwright audit qua `npx tsx -`.
- Evidence output: `docs/qa/ui-audit-browser-results.json`, `docs/qa/ui-audit-report-modal-scenarios.json`, screenshots trong `docs/qa/ui-audit-screens/`.

Route/man hinh da kiem tra:

- `/projects`
- `/projects/cmqry305q0007d4wkkycogu91`
- `/projects/cmqry305q0007d4wkkycogu91/field-progress`
- `/projects/cmqry305q0007d4wkkycogu91/field-progress/daily`
- `/projects/cmqry305q0007d4wkkycogu91/field-progress/summary`
- `/reports`
- `/reports?tab=weekly`
- `/reports?status=SUBMITTED`
- Report detail drawer cho DAILY/WEEKLY/SUBMITTED
- `/documents`
- `/documents/cmqry305q0007d4wkkycogu91`
- `/projects/cmqry305q0007d4wkkycogu91/material-requests`
- `/users`
- `/materials`, `/contracts`, `/approvals`, `/audit`, `/login`
- Sidebar desktop va mobile hamburger menu

Nhom file/component da doc:

- `src/app/(dashboard)`
- `src/components/reports`
- `src/components/documents`
- `src/components/projects`
- `src/components/field-progress`
- `src/components/material-request`
- `src/components/users`
- `src/components/layout`
- `src/components/ui`
- `src/lib`
- `src/app/actions/material-request.ts`

## 2. Tong quan loi

| Nhom loi | So loi | Muc do cao nhat | Ghi chu |
| -------- | -----: | --------------- | ------- |
| Report drawer/modal mobile | 6 | CRITICAL | Blocker lon nhat, reproduce duoc tren `390x844` |
| Table/responsive overflow | 5 | HIGH | Field progress, reports, material requests bi tran o tablet/laptop |
| Data quality hien thi | 5 | HIGH | Chu khong dau, debug seed note, weekly duplicate line |
| Touch target/action safety | 4 | HIGH | Nut 26-36px, nut nguy hiem qua gan nut duyet |
| Documents/modal | 3 | MEDIUM | Viewer action bar wrap nhung chua toi uu cho mobile field use |
| Users/dialog/layout/menu | 3 | MEDIUM | Nhieu footer row/chua co safe-area hoan chinh |
| Empty/loading/print/minor polish | 4 | LOW | Khong blocker nhung can polish truoc production |

Tong ket severity: **CRITICAL 1, HIGH 9, MEDIUM 11, LOW 6**.

## 3. Loi CRITICAL

### UI-CRIT-001

- Man hinh/route: `/reports`, `/reports?tab=weekly`, `/reports?status=SUBMITTED`, report detail drawer tren mobile `390x844`.
- Component/file nghi ngo: `src/components/reports/report-detail-drawer.tsx`.
- Mo ta loi: Footer action buttons bi dat cung mot hang: `In / Xuat PDF`, `Dong`, `Xoa`, `Tu choi`, `Duyet`. Tren viewport `390x844`, nut `Duyet` nam tu `x=385` voi rong `94px`, vuot khoi man hinh va bi cat.
- Anh huong: Khong the thao tac duyet an toan tren mobile; nut destructive va approve qua gan nhau, de bam nham ngoai cong truong.
- Cach tai hien: Dang nhap admin, vao `/reports`, mo bao cao weekly/submitted dau tien tren mobile `390x844`.
- Huong fix de xuat: Doi footer report drawer thanh responsive action layout: mobile stack theo nhom, primary action full-width, destructive tach hang, secondary actions trong menu `More` hoac wrap co uu tien. Them `pb-[calc(...+env(safe-area-inset-bottom))]`.
- Co can sua ngay khong: **Co. Blocker truoc UAT mobile.**

## 4. Loi HIGH

### UI-HIGH-001

- Man hinh/route: Report detail DAILY/WEEKLY.
- Component/file nghi ngo: `src/components/reports/report-detail-drawer.tsx`.
- Mo ta loi: Bang work lines trong drawer van render `<table className="w-full text-sm">`; o mobile cot cong viec/khoi luong/don vi bi ep chat, kho doc khi ten cong viec dai.
- Anh huong: Bao cao cong truong tren dien thoai kho doc, dac biet khi dung ngoai hien truong.
- Cach tai hien: Mo weekly report trong `/reports?tab=weekly` tren `360x740` hoac `390x844`.
- Huong fix de xuat: Mobile dung card-list/grouped list thay table; desktop/tablet giu table co `overflow-x-auto`.
- Co can sua ngay khong: Co.

### UI-HIGH-002

- Man hinh/route: Weekly report detail.
- Component/file nghi ngo: `src/components/reports/report-detail-drawer.tsx`, data mapping trong `src/components/reports/reports-workspace.tsx` hoac action reports.
- Mo ta loi: Cung mot cong viec lap lai nhieu dong, vi du `Dao dat ho mong...`, `Gia cong lap dung...`, nhung khong co ngay/group context.
- Anh huong: Nguoi dung khong phan biet dong nao thuoc ngay nao; bao cao tuan mat tinh tong hop.
- Cach tai hien: `/reports?tab=weekly`, mo weekly report `2026-07-08 - 2026-07-14`.
- Huong fix de xuat: Neu nghiep vu can chi tiet theo ngay, hien group theo ngay. Neu muon tong hop tuan, aggregate theo `fieldProgressItemId` va hien tong, so ngay thi cong, range ngay.
- Co can sua ngay khong: Co.

### UI-HIGH-003

- Man hinh/route: Report detail.
- Component/file nghi ngo: `src/components/reports/report-detail-drawer.tsx`, seed script `scripts/seed-realistic-tu-hiep-project.ts`.
- Mo ta loi: Note debug `Seed line FND-001`, `Seed line FND-002` bi render truc tiep trong UI.
- Anh huong: Mat chuyen nghiep khi demo/UAT; lam nguoi test nghi day la du lieu loi.
- Cach tai hien: Mo weekly report tren `/reports`.
- Huong fix de xuat: UI khong nen render internal seed/debug notes, hoac seed data phai doi thanh ghi chu nghiep vu tieng Viet. Chi sua seed data sau khi duoc duyet vi day la data quality.
- Co can sua ngay khong: Co, nhung can duyet neu sua DB/seed.

### UI-HIGH-004

- Man hinh/route: `/projects`, field progress, reports, documents/material text trong QA project.
- Component/file nghi ngo: Seed data va cac view hien thi truc tiep text nguoi dung nhap.
- Mo ta loi: Nhieu text khong dau: `Dao dat ho mong`, `Tuan 2...`, `Gia cong lap dung...`, `Nha Van Phong Dieu Hanh...`.
- Anh huong: Demo cong trinh Viet Nam trong ERP trong kem that; search/sort van dung nhung UX kem.
- Cach tai hien: `/reports?tab=weekly`, `/projects`, `/field-progress`.
- Huong fix de xuat: Khong sua UI neu field la user-generated text. Nen cap nhat seed plan/script de dung tieng Viet co dau sau khi duoc duyet.
- Co can sua ngay khong: Co truoc demo/UAT.

### UI-HIGH-005

- Man hinh/route: `/projects/[id]/field-progress`.
- Component/file nghi ngo: `src/components/field-progress/master-table.tsx`, `src/components/field-progress/table-styles.ts`.
- Mo ta loi: Desktop/tablet master table co `min-w-[1200px]`; tai `768x1024` va `1366x768` van phat sinh horizontal overflow.
- Anh huong: Laptop/tablet khong nhin het cot neu khong scroll ngang; sticky cot co the che noi dung.
- Cach tai hien: Mo `/projects/.../field-progress` tai `768x1024` hoac `1366x768`.
- Huong fix de xuat: Cho layout tablet dung card/compact rows, giam col width, hoac chia view setup/detail; dam bao wrapper scroll ngang co affordance ro.
- Co can sua ngay khong: Co neu UAT tren tablet/laptop.

### UI-HIGH-006

- Man hinh/route: `/projects/[id]/field-progress/daily`.
- Component/file nghi ngo: `src/components/field-progress/daily-entry-table.tsx`, `src/components/field-progress/table-styles.ts`.
- Mo ta loi: Daily table bi overflow o `1366x768`; Playwright ghi nhan table width khoang `1697px`.
- Anh huong: Man nhap khoi luong hang ngay la workflow chinh, laptop cong truong 1366px se bi cuon ngang nhieu.
- Cach tai hien: Mo `/field-progress/daily` tai `1366x768`.
- Huong fix de xuat: Compact mode cho laptop, an bot cot phu vao detail drawer, hoac dung column density toggle.
- Co can sua ngay khong: Co.

### UI-HIGH-007

- Man hinh/route: `/projects/[id]/field-progress/summary`.
- Component/file nghi ngo: `src/components/field-progress/summary-desktop-view.tsx`.
- Mo ta loi: Summary table dung `minWidth` dong theo so ngay, `1498px+`, gay overflow tablet/laptop.
- Anh huong: Tong hop luy ke kho scan, dac biet voi du lieu 10-14 ngay.
- Cach tai hien: Mo `/field-progress/summary` tai `768x1024` va `1366x768`.
- Huong fix de xuat: Dong bang ngay thanh horizontal timeline co sticky summary, hoac aggregate default va mo chi tiet theo ngay khi can.
- Co can sua ngay khong: Co truoc UAT field progress.

### UI-HIGH-008

- Man hinh/route: `/reports` mobile cards.
- Component/file nghi ngo: `src/components/reports/reports-mobile-cards.tsx`, `src/components/reports/report-detail-drawer.tsx`.
- Mo ta loi: Nut `Xem` cao `28px`, nut icon `Xoa/Sua` khoang `30x26px`, close drawer `36x36px`, thap hon chuan touch target 44px.
- Anh huong: Bam kho, de bam nham khi dung ngoai cong truong.
- Cach tai hien: `/reports` tren `390x844`, mo report detail.
- Huong fix de xuat: Chuan hoa mobile action height toi thieu 44px, nut icon co hit area 44px va label/tooltip.
- Co can sua ngay khong: Co.

### UI-HIGH-009

- Man hinh/route: Report detail reject/approve.
- Component/file nghi ngo: `src/components/reports/report-detail-drawer.tsx`.
- Mo ta loi: Destructive `Xoa`, `Tu choi` va positive `Duyet` o cung action cluster, trong mobile lai bi ep/cat.
- Anh huong: Tang nguy co thao tac sai tren report dang cho duyet.
- Cach tai hien: Admin mo submitted report tren mobile.
- Huong fix de xuat: Tach destructive actions vao secondary menu/confirm flow; approve la primary sticky action; reject thanh secondary full-width rieng hang.
- Co can sua ngay khong: Co.

## 5. Loi MEDIUM

### UI-MED-001

- Man hinh/route: `/reports`, create/edit report dialog.
- Component/file nghi ngo: `src/components/reports/create-report-dialog.tsx`.
- Mo ta loi: Dialog co max-height va scroll tot hon report drawer, nhung van co table ben trong form o buoc work lines.
- Anh huong: Khi tao report tren mobile, bang line item co nguy co bi ep cot neu du lieu dai.
- Cach tai hien: Mo create report dialog tren mobile, them work lines.
- Huong fix de xuat: Mobile step nay nen dung card-list, moi line la form card.
- Co can sua ngay khong: Nen sua truoc UAT neu nguoi dung tao report tren mobile.

### UI-MED-002

- Man hinh/route: `/documents/[projectId]`, document viewer.
- Component/file nghi ngo: `src/components/documents/document-viewer.tsx`.
- Mo ta loi: Action toolbar co nhieu nut (`Tai xuong`, `Mo tab moi`, `Sao chep link`, `Doi ten`, `Xoa`, `Sua thong tin`) chi wrap, chua co mobile primary/secondary pattern.
- Anh huong: Tren file co nhieu quyen, toolbar chiem nhieu chieu cao va co the day preview xuong.
- Cach tai hien: Mo document detail tren mobile voi user co quyen edit/delete.
- Huong fix de xuat: Mobile toolbar gom primary download/view, cac action con lai vao overflow menu.
- Co can sua ngay khong: Chua blocker, nen sua truoc production.

### UI-MED-003

- Man hinh/route: `/documents/[projectId]`, upload/rename/edit metadata modal.
- Component/file nghi ngo: `src/components/documents/document-workspace.tsx`.
- Mo ta loi: Upload modal va metadata modal canh giua `items-center justify-center`, khong co `max-h`/body scroll ro nhu `ConfirmDialog`.
- Anh huong: Keyboard mobile co the che input/textarea; modal dai co nguy co vuot chieu cao man hinh.
- Cach tai hien: Mobile, chon folder, upload file, focus input/textarea.
- Huong fix de xuat: Dung bottom-sheet pattern, `max-h-[calc(100dvh-...)]`, body `overflow-y-auto`, footer sticky + safe area.
- Co can sua ngay khong: Nen sua sau report blocker.

### UI-MED-004

- Man hinh/route: `/projects/[id]/material-requests`.
- Component/file nghi ngo: `src/components/material-request/material-request-list.tsx`.
- Mo ta loi: Desktop table o `768x1024` co width khoang `943px`, can scroll ngang.
- Anh huong: Tablet landscape/portrait xem list vat tu chua toi uu.
- Cach tai hien: `/material-requests` tai tablet `768x1024`.
- Huong fix de xuat: Bat dau card layout tu breakpoint `lg` thay vi `md`, hoac table compact cho tablet.
- Co can sua ngay khong: Khong bang report, nhung nen sua truoc UAT tablet.

### UI-MED-005

- Man hinh/route: `/projects/[id]/material-requests`, detail/form.
- Component/file nghi ngo: `src/components/material-request/material-request-detail.tsx`, `src/components/material-request/material-request-form.tsx`.
- Mo ta loi: Pattern mobile tot hon report drawer: full-height bottom sheet, footer sticky, safe-area, mobile cards. Tuy nhien cancel/update cluster van can review voi keyboard va long text.
- Anh huong: Rủi ro nho khi nhap/huy phieu tren mobile.
- Cach tai hien: Mo detail/form vat tu tren mobile, focus textarea ly do huy.
- Huong fix de xuat: Giu pattern nay lam baseline; them keyboard-safe testing va dam bao footer khong che textarea.
- Co can sua ngay khong: Khong blocker.

### UI-MED-006

- Man hinh/route: `/users`.
- Component/file nghi ngo: `src/components/users/user-management-client.tsx`.
- Mo ta loi: User modals co footer sticky va `max-h`, nhung footer dung row `flex gap-3` co the hep tren 360px khi label dai.
- Anh huong: Form user tren mobile co the bi chat action buttons.
- Cach tai hien: `/users`, mo create/edit user modal tren `360x740`.
- Huong fix de xuat: Mobile `flex-col-reverse`, button full-width nhu `ConfirmDialog`.
- Co can sua ngay khong: Sau report/field-progress.

### UI-MED-007

- Man hinh/route: Global mobile header/menu.
- Component/file nghi ngo: `src/components/layout/header.tsx`, `src/components/layout/sidebar.module.css`.
- Mo ta loi: Icon buttons menu/logout dang `36x36px`.
- Anh huong: Vua du dung, nhung nho hon touch target khuyen nghi 44px.
- Cach tai hien: Moi mobile route.
- Huong fix de xuat: Tang hit area icon-button len 44px tren mobile.
- Co can sua ngay khong: Nen sua cung pass mobile polish.

### UI-MED-008

- Man hinh/route: `/projects` mobile.
- Component/file nghi ngo: `src/app/(dashboard)/projects/page.tsx`.
- Mo ta loi: Playwright ghi nhan text owner/location trong project card bi overflow nhe o `360x740`.
- Anh huong: Ten chu dau tu/dia diem dai co the tran mep phai.
- Cach tai hien: `/projects` tai `360x740`.
- Huong fix de xuat: Them `min-w-0`, `break-words`, `truncate` co title hoac wrap dung.
- Co can sua ngay khong: Nen sua truoc UAT mobile.

### UI-MED-009

- Man hinh/route: `/reports`, filter/tab area.
- Component/file nghi ngo: `src/components/reports/reports-workspace.tsx`.
- Mo ta loi: Nhieu tab/filter/status chip tren mobile, can scroll/stack nhung chua co indication ro.
- Anh huong: Mobile user kho biet dang loc theo trang thai nao khi list dai.
- Cach tai hien: `/reports` tren `360x740`.
- Huong fix de xuat: Filter drawer rieng, active filter summary sticky.
- Co can sua ngay khong: Khong blocker.

### UI-MED-010

- Man hinh/route: Report attachment/gallery.
- Component/file nghi ngo: `src/components/reports/site-report-gallery-dialog.tsx`, `src/components/reports/report-detail-drawer.tsx`.
- Mo ta loi: Gallery fullscreen co view anh, nhung attachment trong report drawer mo file bang `window.open`; mobile khong co preview sheet thong nhat.
- Anh huong: Xem nhanh anh/file tu bao cao chua lien mach.
- Cach tai hien: Open DAILY report co attachment/photo.
- Huong fix de xuat: Dung gallery/attachment viewer chung, co download fallback.
- Co can sua ngay khong: Sau report footer/table blocker.

### UI-MED-011

- Man hinh/route: Print report.
- Component/file nghi ngo: `src/app/print/reports/[reportId]/page.tsx`.
- Mo ta loi: Print page dung table co border; mobile khong phai target chinh nhung co the overflow khi mo bang dien thoai.
- Anh huong: Neu user bam `In / Xuat PDF` tren mobile, preview co the kho doc.
- Cach tai hien: Tu report detail mobile bam `In / Xuat PDF`.
- Huong fix de xuat: Print CSS rieng cho screen/mobile hoac thong bao mo tab desktop.
- Co can sua ngay khong: Khong blocker bang drawer.

## 6. Loi LOW

### UI-LOW-001

- Man hinh/route: Empty states cac route chua phat trien (`/materials`, `/contracts`, `/approvals`, `/audit`).
- Component/file nghi ngo: cac page trong `src/app/(dashboard)`.
- Mo ta loi: Empty/placeholder co the xem duoc nhung chua co CTA/route context ro cho UAT.
- Anh huong: Nguoi test co the khong biet module chua san sang hay khong co data.
- Cach tai hien: Mo cac route placeholder.
- Huong fix de xuat: Them state "chua trien khai"/"chua co du lieu" ro theo module.
- Co can sua ngay khong: Khong.

### UI-LOW-002

- Man hinh/route: Unit display toan app.
- Component/file nghi ngo: `src/components/field-progress/*`, reports drawer.
- Mo ta loi: Don vi `m2`, `m3`, `kg` hien plain text trong data seed; mot so UI co option `m²`, `m³`.
- Anh huong: Nho nhung anh huong tinh chuyen nghiep.
- Cach tai hien: Report detail va field progress.
- Huong fix de xuat: Normalize unit display formatter, map `m2` -> `m²`, `m3` -> `m³`.
- Co can sua ngay khong: Khong, nen lam truoc demo.

### UI-LOW-003

- Man hinh/route: Report status badges.
- Component/file nghi ngo: `src/components/reports/types.ts`, `src/components/ui/status-badge.tsx`.
- Mo ta loi: `Cho duyet / Da gui` label dai, tren mobile lam chat card/footer.
- Anh huong: Nho, nhung lam UI report nang.
- Cach tai hien: `/reports` mobile.
- Huong fix de xuat: Mobile label ngan `Cho duyet`; tooltip/description chi tiet.
- Co can sua ngay khong: Khong.

### UI-LOW-004

- Man hinh/route: Icon-only buttons.
- Component/file nghi ngo: reports, field-progress, documents, layout.
- Mo ta loi: Phan lon co `aria-label`/`title`, nhung affordance cho mobile khong dong nhat.
- Anh huong: Nho voi accessibility va discoverability.
- Cach tai hien: Mobile cards/drawers.
- Huong fix de xuat: Chuan hoa `IconButton` component co size 44 mobile, tooltip desktop.
- Co can sua ngay khong: Khong rieng le, nen gop vao UI system.

### UI-LOW-005

- Man hinh/route: Toast/error overlay.
- Component/file nghi ngo: `src/components/ui/toast-context.tsx`, report drawer.
- Mo ta loi: Khi drawer mo, toast/issue pill co the nam gan footer va lam cam giac che action.
- Anh huong: Nho nhung bat loi khi co validation/toast.
- Cach tai hien: Open report drawer, trigger action validation.
- Huong fix de xuat: Dat toast viewport co safe-area va z-index rule cho modal.
- Co can sua ngay khong: Khong.

### UI-LOW-006

- Man hinh/route: Layout card/list density.
- Component/file nghi ngo: `src/components/reports/reports-mobile-cards.tsx`, `src/components/documents/document-workspace.tsx`.
- Mo ta loi: Mot so card co nhieu metadata nhung chua uu tien truong quan trong cho nguoi dung hien truong.
- Anh huong: Can cuon doc nhieu.
- Cach tai hien: Mobile reports/documents.
- Huong fix de xuat: Sap xep lai hierarchy: ma, ngay, trang thai, action chinh; metadata phu vao details.
- Co can sua ngay khong: Khong.

## 7. Phan tich anh loi nguoi dung gui

Evidence tu screenshot local: `docs/qa/ui-audit-screens/m390-weekly-detail-card-click-opened.png`.

- Vi sao modal/drawer bi chat: `ReportDetailDrawer` dung drawer full height `w-full max-w-xl sm:max-w-2xl`, footer va header chi shrink, body scroll. Noi dung table weekly 17 dong va action footer nhieu nut lam mobile khong con khong gian doc/thao tac.
- Vi sao footer buttons bi cat: footer dung `flex items-center justify-between`, ben trai co `In / Xuat PDF`, ben phai co nhieu action cung mot hang. Tong width nut vuot 390px; `Duyet` bat dau tai `x=385` nen bi cat.
- Vi sao table khong phu hop mobile: weekly work lines co 3 cot va ten cong viec dai. Bang khong co card-list, khong co group theo ngay/cong viec, nen ten/ghi chu/khoi luong bi don lien tiep.
- Vi sao text khong dau/debug seed gay mat chuyen nghiep: cac dong `Dao dat ho mong`, `Tuan 2...`, `Seed line FND-001` la text nguoi dung/seed render truc tiep, nen UAT nhin nhu du lieu nhap cau tha hoac debug bi lo.
- Nen sua UI hay seed data hay ca hai: **ca hai**, nhung thu tu la UI truoc cho blocker modal/footer/table, sau do xin duyet de cap nhat seed data quality. Khong nen sua DB seed khi chua co phe duyet rieng.

## 8. Checklist tung man

| Man hinh | Desktop | Tablet | Mobile | Ket qua | Ghi chu |
| -------- | ------- | ------ | ------ | ------- | ------- |
| `/projects` | PASS | PASS | WARN | MEDIUM | Mobile 360 co text owner/location tran nhe |
| `/projects/[id]` | PASS | PASS | PASS | PASS | Chua thay blocker responsive |
| `/projects/[id]/field-progress` | WARN | FAIL | WARN | HIGH | Table min-width gay overflow tablet/laptop; mobile card co the dung tiep |
| `/projects/[id]/field-progress/daily` | WARN | WARN | WARN | HIGH | Desktop/laptop overflow, mobile co sticky save bar can test keyboard them |
| `/projects/[id]/field-progress/summary` | WARN | FAIL | WARN | HIGH | Summary table qua rong khi co nhieu ngay |
| `/reports` | PASS | WARN | FAIL | CRITICAL | Detail drawer mobile footer bi cat |
| DAILY report detail | PASS | WARN | FAIL | HIGH | Work table/detail drawer can mobile card |
| WEEKLY report detail | WARN | WARN | FAIL | CRITICAL | Duplicate lines, debug note, footer clipped |
| Reject/approve report modal/drawer | PASS | WARN | FAIL | CRITICAL | Nut nguy hiem va approve chung hang, `Duyet` bi cat |
| Report attachment/gallery | PASS | WARN | WARN | MEDIUM | Co gallery anh, attachment file chua thong nhat viewer |
| `/documents` | PASS | PASS | WARN | MEDIUM | Project/folder cards OK, can polish mobile text/action |
| `/documents/[projectId]` | PASS | WARN | WARN | MEDIUM | Viewer toolbar qua nhieu action tren mobile |
| Document upload/view modal | PASS | WARN | WARN | MEDIUM | Upload/metadata modal can thieu max-height/safe-area ro |
| `/projects/[id]/material-requests` | PASS | WARN | PASS | MEDIUM | Mobile pattern tot, tablet table overflow |
| Material request form/detail | PASS | PASS | WARN | MEDIUM | Safe-area tot, can test keyboard/long text |
| `/users` | PASS | WARN | WARN | MEDIUM | Dialog footer can stack mobile |
| Sidebar desktop | PASS | PASS | N/A | PASS | Desktop sidebar on dinh |
| Mobile hamburger menu | N/A | PASS | WARN | MEDIUM | Touch target 36px, menu doc duoc |
| `/login` | PASS | PASS | PASS | PASS | Chua thay blocker |
| Empty states | WARN | WARN | WARN | LOW | Can phan biet "chua trien khai" va "chua co du lieu" |

## 9. De xuat huong fix theo thu tu uu tien

### 1. Fix ngay truoc UAT

1. Sua `ReportDetailDrawer` footer mobile: stack/wrap co uu tien, safe-area bottom, destructive actions tach khoi approve.
2. Doi work lines trong report detail thanh mobile card-list, desktop/tablet giu table co wrapper scroll.
3. Weekly report: group theo ngay hoac aggregate theo cong viec, khong lap dong khong context.
4. An/doi `Seed line ...` khoi UI; neu la seed data thi can duyet de update seed.
5. Viet lai QA seed text tieng Viet co dau cho project/work/report/document/material, sau khi duoc duyet.
6. Tang mobile touch target cho report cards/drawer len toi thieu 44px.

### 2. Fix sau UAT nhung truoc production

1. Responsive density cho field-progress master/daily/summary tren tablet/laptop.
2. Document viewer/upload toolbar mobile theo pattern primary + overflow menu.
3. Chuan hoa `IconButton`, `DialogFooter`, `DrawerFooter` dung chung safe-area/responsive layout.
4. User management modal footer stack mobile.
5. Unit formatter chung cho `m2/m3` -> `m²/m³`.

### 3. Dua vao roadmap

1. Filter drawer va active filter summary cho report/documents.
2. Virtualized table/list cho du lieu field-progress lon.
3. Offline/slow-network states cho nguoi dung ngoai cong truong.
4. Print/mobile preview rieng cho report PDF.
5. Design token audit cho radius/shadow/font-size de dong nhat toan app.

## 10. Khong duoc sua gi

- Khong sua logic RBAC da verify pass truoc do.
- Khong sua guard Field Progress chong vuot khoi luong neu khong co bug logic moi.
- Khong sua seed DB khi chua duoc duyet; UI audit chi de xuat data quality.
- Khong reset DB.
- Khong xoa storage QA `storage/qa-realistic-tu-hiep`.
- Khong xoa du lieu seed `QA-TUHIEP-5F-001`.
- Khong commit, khong push.
- Khong chay `npm run dev`.

## 11. Ket luan

- App **chua du tot de UAT mobile cho module Reports**. Blocker hien tai la report detail drawer tren mobile: footer action bi cat, table weekly kho doc, action destructive/approve khong an toan.
- Desktop co the tiep tuc UAT co gioi han, nhung field-progress tren laptop/tablet can fix responsive neu UAT dung man hinh 1366px/768px.
- Nen fix UI report truoc, roi moi cap nhat seed data quality sau khi duoc duyet.
- Khong can rollback seed. Khong co hanh dong nao da sua DB trong dot audit nay.
