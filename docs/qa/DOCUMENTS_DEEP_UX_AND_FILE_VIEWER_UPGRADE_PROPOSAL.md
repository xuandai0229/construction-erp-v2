# DOCUMENTS DEEP UX AND FILE VIEWER UPGRADE PROPOSAL

## 1. Executive Summary

Phân hệ Documents hiện đã tốt hơn đáng kể ở Phase A: có danh sách công trình, 8 folder mặc định, rule theo folder, nhãn upload theo ngữ cảnh, kiểm tra extension ở cả frontend/backend, danh sách file sau upload và cơ chế giữ folder đang chọn qua URL. Đây là nền tảng đủ tốt để tiếp tục UAT.

Khoảng trống lớn nhất còn lại không nằm ở việc “đã upload được file hay chưa”, mà ở trải nghiệm sau upload. Hiện nút **Xem trước** mở route file trong tab mới. Với ảnh và PDF, browser có thể render inline, nhưng người dùng bị rời khỏi màn hình quản lý tài liệu; với Word, Excel, CAD hoặc XML, route hiện chuyển thành tải xuống. Luồng này làm mất ngữ cảnh folder, không cho xem metadata song song với danh sách và đặc biệt bất tiện trên điện thoại tại công trường.

Định hướng khuyến nghị:

1. **Phase A.1 không migration:** biến click file thành thao tác mở viewer/chi tiết ngay trong app; desktop dùng right-side drawer, mobile dùng full-screen viewer; ảnh/PDF preview inline; các loại không hỗ trợ hiển thị fallback trung thực với nút tải xuống.
2. **Nâng file card và upload flow:** menu hành động luôn dùng được bằng touch, tên file dễ đọc, upload có bước kiểm tra nhẹ để xác nhận folder và chỉnh tên hiển thị trước khi lưu.
3. **Phase B có schema:** bổ sung metadata nghiệp vụ, trạng thái, phân loại, version/latest, liên kết hóa đơn/thanh toán/nghiệm thu/tiến độ.
4. **Phase C production hardening:** object storage, signed URL hoặc authenticated streaming phù hợp, backup, virus scan, kiểm tra nội dung file, xử lý file lớn, audit view/download và chính sách retention.

Không nên nhảy thẳng sang viewer Office/CAD hoặc workflow duyệt phức tạp. Giá trị UAT lớn nhất đến từ việc giữ người dùng trong app, làm file dễ hiểu và làm upload sạch hơn.

## 2. Hiện trạng code/file flow

### 2.1 Model `Document`

`prisma/schema.prisma` hiện có:

| Field | Ý nghĩa hiện tại |
|---|---|
| `id` | ID tài liệu |
| `projectId` | Công trình sở hữu tài liệu |
| `folderId` | Folder chứa tài liệu |
| `originalName` | Tên file người dùng upload |
| `storedName` | Tên vật lý đã sanitize, thêm timestamp và UUID ngắn |
| `mimeType` | MIME do browser gửi lên, fallback `application/octet-stream` |
| `extension` | Extension lấy từ tên gốc |
| `size` | Dung lượng file |
| `storagePath` | Đường dẫn vật lý trên local filesystem |
| `uploadedById` | Người upload |
| `version` | Có field nhưng hiện mặc định `1`, chưa có logic versioning |
| `deletedAt` | Soft delete |
| `createdAt`, `updatedAt` | Thời gian tạo/cập nhật |

Model đã đủ dữ liệu cơ bản để làm viewer, file details, đổi tên hiển thị và cảnh báo rule mà **không cần migration**. Model chưa đủ cho metadata nghiệp vụ như số hóa đơn, loại bản vẽ, trạng thái ký, bản mới nhất hoặc quan hệ với thanh toán/tiến độ.

### 2.2 Upload hiện hoạt động thế nào

Flow hiện tại trong `document-manager.tsx`:

1. User chọn folder.
2. Nút upload có label và `accept` theo rule folder.
3. User chọn một file.
4. Frontend chặn file trên 50 MB.
5. Frontend gửi `file`, `projectId`, `folderId` tới `POST /api/documents/upload`.
6. Backend kiểm tra session, project, quyền truy cập project, folder thuộc đúng project và extension theo folder rule.
7. Backend tạo `storedName`, ghi file bằng `fs.writeFile`, sau đó tạo record `Document`.
8. Backend ghi `UPLOAD_DOCUMENT` vào `AuditLog`.
9. Frontend `router.refresh()` và giữ folder bằng query `?folder=...`.

Điểm tốt:

- Folder đích được kiểm tra lại ở backend.
- Upload sai extension bị chặn ở backend, không chỉ dựa vào `accept`.
- File không đặt trong `public/`; client không truy cập trực tiếp filesystem.
- Upload có audit.
- Folder selection được giữ sau upload/refresh.

Giới hạn:

- Chỉ upload một file mỗi lần.
- Chọn file xong upload ngay, không có bước xác nhận folder/tên.
- Chỉ kiểm extension; `mimeType` do client cung cấp và chưa có kiểm tra magic bytes/nội dung thật.
- Toàn bộ multipart và file được đưa vào bộ nhớ qua `request.formData()` và `file.arrayBuffer()` trước khi ghi; giới hạn 50 MB không đồng nghĩa route đã tối ưu cho file lớn hoặc nhiều request đồng thời.
- Nếu ghi file vật lý thành công nhưng tạo DB record hoặc ghi audit thất bại, chưa thấy cơ chế rollback/xóa file mồ côi.
- Local storage hiện nằm dưới `storage/projects/...`. Repo đang có cả file storage đã được track và file chưa track; `.gitignore` không loại trừ toàn bộ `storage/`. Đây là rủi ro vận hành và rò dữ liệu nếu quy trình commit không được kiểm soát.

### 2.3 File list/card hiện hoạt động thế nào

Trang project tải toàn bộ document chưa xóa của project, kèm tên người upload, rồi truyền xuống client. Client lọc theo `selectedFolderId`, tìm theo `originalName`, lọc theo nhóm IMAGE/PDF/WORD/EXCEL/CAD.

Card hiện hiển thị:

- Icon theo MIME/extension.
- Tên file, tối đa hai dòng.
- Dung lượng và extension.
- Ngày giờ upload.
- Người upload.
- Ba action khi hover: xem trước, tải xuống, xóa.

Vấn đề UX:

- Action dùng `opacity-0 group-hover:opacity-100`, vì vậy khó khám phá và không phù hợp thiết bị cảm ứng.
- Click vào phần thân card không làm gì; người dùng phải tìm icon con mắt.
- Không có menu ba chấm ổn định cho mobile/keyboard.
- Không có folder, trạng thái rule, version, nhãn nghiệp vụ hoặc cảnh báo dữ liệu cũ.
- Tên dài chỉ có tooltip desktop; mobile không có cách đọc đầy đủ thuận tiện trước khi mở.
- Grid card phù hợp ảnh nhưng khi nhiều file Word/PDF/hóa đơn, chế độ list dày thông tin sẽ hiệu quả hơn.

### 2.4 Click/xem/tải file hiện hoạt động thế nào

Nút **Xem trước** trỏ tới:

`/api/documents/{documentId}/download?preview=true`

và có `target="_blank"`.

Route `GET /api/documents/[documentId]/download`:

1. Kiểm tra session.
2. Tìm `Document` chưa xóa và project chưa xóa.
3. Kiểm tra `canAccessProject`.
4. Đọc toàn bộ file bằng `fs.readFile(document.storagePath)`.
5. Nếu `preview=true` và MIME là `image/*` hoặc `application/pdf`, trả `Content-Disposition: inline`.
6. Các trường hợp khác trả `Content-Disposition: attachment`.

Kết luận chính xác:

- **Có download route.**
- **Không có preview route riêng.** Preview chỉ là chế độ query của download route.
- **Ảnh/PDF có thể render inline** nếu MIME đã lưu đúng và browser hỗ trợ định dạng.
- **Word/Excel/DWG/DXF/XML không preview inline theo code hiện tại**; route ép tải xuống.
- **Xem trước hiện mở tab mới mặc định** do frontend, không phải do route bắt buộc.
- Có guard theo quyền project cho cả preview/download.
- Không thấy ghi `VIEW_DOCUMENT` hoặc `DOWNLOAD_DOCUMENT` vào audit.

### 2.5 Quyền hiện tại

Quyền đang ở mức project, chưa ở mức folder/nghiệp vụ:

- Page detail dùng `requireProjectAccessOrRedirect`.
- Upload, tạo folder và đổi tên folder cho phép bất kỳ user nào có quyền truy cập project.
- Xóa folder/document yêu cầu vừa có quyền project vừa thuộc nhóm high-level (`ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`).
- `DocumentManager` đang nhận `canEdit={true}` cố định. Vì vậy UI hiện nút tạo/đổi tên/upload/xóa cho mọi user vào được project; thao tác xóa của user không đủ quyền chỉ bị backend từ chối.
- Chưa có action đổi tên document.

Điều này chưa phù hợp với mục tiêu phân vai kế toán/chỉ huy trưởng/kỹ sư. Phase A.1 nên ít nhất truyền capability thật xuống UI và ẩn/disable action đúng quyền; Phase B mới nên tiến tới matrix quyền theo folder.

### 2.6 Rủi ro kỹ thuật và bảo mật hiện tại

| Hạng mục | Hiện trạng | Đánh giá |
|---|---|---|
| Project access guard | Có ở page, upload và download | Tốt ở mức project |
| File nằm trong `public/` | Không | Tốt |
| Đoán URL file | Biết document ID vẫn phải qua session + project guard | Không phải public URL |
| Path traversal từ URL | URL chỉ nhận document ID, không nhận path | Rủi ro trực tiếp thấp |
| Path containment khi đọc | Route tin `document.storagePath` từ DB, chưa re-resolve/canonical-check dưới `STORAGE_ROOT` | Cần defense in depth |
| MIME validation | Lưu MIME do browser gửi; validation chính là extension | Chưa đủ tin cậy |
| Magic-byte/file signature | Chưa có | Cần trước production |
| Virus scan | Chưa có | Cần trước production theo mô hình triển khai |
| Audit upload/delete | Có | Tốt |
| Audit view/download | Chưa có | Thiếu cho truy vết |
| Range request | Chưa có; đọc toàn bộ file vào RAM | PDF lớn/CAD tải kém hiệu quả |
| Cache/security headers | Chưa thấy policy rõ cho file response | Cần bổ sung |
| Physical delete | Soft delete DB nhưng file vật lý vẫn còn | Cần retention/cleanup |
| Legacy invalid data | Rule chỉ bảo vệ upload mới; storage đã có loại file không nằm trong rule hiện tại | Cần badge/audit dữ liệu cũ |

## 3. User Pain Points

### 3.1 Người dùng công trường

- Thường dùng điện thoại, mạng không ổn định, thao tác bằng một tay.
- Tab mới dễ làm mất app hoặc khó quay lại đúng folder.
- Cần xem nhanh ảnh, PDF bản vẽ/biên bản hơn là tải về rồi tìm trong thư mục Downloads.
- Tên ảnh từ camera/Zalo thường vô nghĩa; vài tuần sau không thể nhớ ảnh thuộc khu vực/hạng mục nào.
- Action chỉ hiện khi hover gần như không tồn tại trên mobile.

### 3.2 Kế toán

- Cần đối chiếu hóa đơn, chứng từ thanh toán và hợp đồng song song với danh sách.
- Tải mọi file về máy tạo bản sao rải rác, tăng nguy cơ dùng nhầm chứng từ.
- Cần nhìn rõ số hóa đơn, ngày, nhà cung cấp, số tiền; schema hiện chưa có các trường này.
- Cần biết file nào đã đối chiếu, file nào còn thiếu hoặc trùng.

### 3.3 Chỉ huy trưởng

- Cần mở nhanh bản vẽ, hồ sơ nghiệm thu, báo cáo ngày và ảnh hiện trường.
- Rủi ro lớn nhất là không phân biệt bản mới/bản cũ.
- Cần giữ danh sách và folder bên cạnh để chuyển tài liệu liên tục.
- Với PDF bản vẽ, drawer hẹp không đủ; phải có chế độ phóng toàn màn.

### 3.4 Giám đốc

- Chủ yếu cần đọc nhanh, xem tổng quan, kiểm tra “đã có/chưa có”, không muốn thao tác kỹ thuật với file.
- Cần tín hiệu trạng thái rõ: hợp đồng chính, bản vẽ mới nhất, nghiệm thu đã ký, hóa đơn chưa đối chiếu.
- Việc phải tải file về hoặc đổi tab làm luồng kiểm tra chậm và rời rạc.

### 3.5 Desktop và mobile

Desktop có đủ không gian để giữ danh sách và panel chi tiết song song. Mobile không có; cố nhét preview vào bottom sheet thấp sẽ làm ảnh/PDF khó đọc. Vì vậy responsive behavior nên khác nhau, không chỉ co cùng một layout.

## 4. File Viewer trong app

### 4.1 Ba phương án

#### Phương án 1 — Modal giữa màn cho mọi file

Ưu điểm:

- Dễ triển khai.
- Tập trung vào nội dung.
- Hợp với ảnh.

Nhược điểm:

- Che toàn bộ danh sách và folder.
- Metadata và action dễ chật.
- PDF/bản vẽ cần vùng lớn, modal phải gần full-screen.

#### Phương án 2 — Right-side drawer cho mọi file

Ưu điểm:

- Giữ ngữ cảnh folder và danh sách.
- Phù hợp luồng xem nhiều file liên tiếp.
- Metadata và action đặt ổn định.

Nhược điểm:

- Drawer hẹp không đủ đọc PDF bản vẽ hoặc ảnh chi tiết.
- Trên màn nhỏ không còn lợi ích chia đôi.

#### Phương án 3 — Hybrid drawer + expand/full-screen

Đây là phương án khuyến nghị:

- Desktop/tablet ngang: click card mở right-side drawer.
- Drawer có preview, metadata và action.
- Ảnh/PDF có nút **Phóng toàn màn**.
- Mobile/tablet dọc: mở full-screen viewer ngay từ đầu.
- Bottom sheet chỉ dùng cho action menu ngắn, không dùng làm vùng đọc file.

Phương án hybrid giữ được ngữ cảnh trong đa số thao tác nhưng không hy sinh khả năng đọc bản vẽ/PDF.

### 4.2 Hành vi chung

Khi click card:

1. Không mở tab mới.
2. Cập nhật state `selectedDocument`.
3. Có thể đồng bộ `document={id}` vào URL để back/forward và copy link nội bộ vẫn quay đúng project/folder/file.
4. Mở viewer theo capability:
   - `previewable`: ảnh/PDF.
   - `details-only`: Word/Excel/CAD/XML ở Phase A.1.
5. Đóng viewer vẫn giữ nguyên folder, search, filter và scroll position.

Header viewer nên có:

- Tên file đầy đủ.
- Icon/loại file.
- Nút đóng.
- Menu `...`: Tải xuống, Mở tab mới, Sao chép link nội bộ, Đổi tên, Xóa theo quyền.

Footer hoặc details panel nên có:

- Folder.
- Dung lượng.
- Extension/MIME.
- Người upload.
- Ngày giờ upload.
- Version hiện tại nếu muốn hiển thị, nhưng không gọi là versioning đầy đủ.
- Cảnh báo nếu file không khớp rule folder hiện tại.

### 4.3 Ảnh JPG/PNG/WEBP/HEIC

Phase A.1:

- Render bằng URL protected hiện có với `preview=true`.
- `object-fit: contain`, nền trung tính, không crop.
- Zoom in/out, reset, fit-to-screen.
- Có next/previous trong tập file ảnh đang được filter.
- Click ảnh hoặc nút expand mở full-screen.
- Metadata và action nằm trong drawer hoặc overlay gọn.

HEIC cần xử lý thận trọng:

- Route hiện có thể trả `image/heic` inline nếu MIME đúng.
- Khả năng browser hiển thị HEIC không đồng đều, đặc biệt ngoài Safari.
- Không nên hứa “HEIC preview được” ở Phase A.1. Nếu browser không render, hiển thị fallback rõ và cho tải xuống.
- Chuyển HEIC sang JPEG thumbnail/preview nên để Phase C hoặc một phase media-processing riêng.

Phase sau:

- Gallery theo ngày/khu vực.
- Thumbnail đã tối ưu.
- EXIF: thời gian chụp, GPS nếu policy cho phép.
- Batch upload và gắn vào báo cáo ngày.

### 4.4 PDF

Phase A.1:

- Dùng `iframe`, `object` hoặc `embed` trỏ tới protected inline route.
- Mặc định xem trong drawer; có nút phóng full-screen.
- Có fallback khi browser/PDF policy không render: thông báo ngắn + nút tải xuống + mở tab mới.
- “Mở tab mới” là action phụ, không phải hành vi mặc định.

Lưu ý:

- Với PDF lớn, route hiện đọc toàn bộ file vào RAM và chưa hỗ trợ Range. UAT với file nhỏ có thể chấp nhận, nhưng production cần stream/Range hoặc chuyển sang object storage/CDN.
- PDF bản vẽ khổ lớn cần full-screen; drawer chỉ phù hợp xem nhanh trang đầu/nội dung tổng quát.

### 4.5 Word/Excel

Phase A.1 không giả vờ preview:

- Mở drawer chi tiết.
- Hiển thị icon Word/Excel, tên, dung lượng, người upload, ngày, folder.
- Message: “Định dạng này chưa hỗ trợ xem trực tiếp trong hệ thống.”
- Primary action: **Tải xuống**.
- Secondary action: **Mở bằng ứng dụng phù hợp** hoặc **Mở tab mới** chỉ khi có cơ chế thực sự có ý nghĩa.

Không nên nhúng Office Online Viewer ngay vào UAT vì:

- File protected/private không tự nhiên truy cập được từ dịch vụ viewer bên ngoài.
- Có rủi ro dữ liệu, phụ thuộc internet và chính sách doanh nghiệp.
- Cần storage URL/signed URL phù hợp và quyết định bảo mật rõ.

Phase sau có hai hướng:

1. Sinh preview PDF/thumbnail server-side khi upload.
2. Tích hợp Microsoft 365/OnlyOffice nếu tổ chức thực sự cần chỉnh sửa/xem Office trong app.

Hướng 1 thường ít scope và dễ kiểm soát dữ liệu hơn.

### 4.6 DWG/DXF

Phase A.1:

- Drawer details-only.
- Message rõ: **“File bản vẽ CAD — vui lòng tải xuống để mở bằng phần mềm chuyên dụng.”**
- Hiển thị extension, dung lượng, người upload, thời gian, folder.
- Primary action: tải xuống.
- Nếu có PDF cùng bộ hồ sơ, có thể gợi ý user upload thêm bản PDF để xem nhanh; chưa cần tự động ghép relation.

Không nên làm CAD viewer ngay. Viewer CAD web thường kéo theo conversion service, licensing, file lớn, layer/font và yêu cầu bảo mật. Chỉ đầu tư khi UAT chứng minh nhu cầu thường xuyên và có tiêu chí rõ.

### 4.7 XML hóa đơn

Phase A.1:

- Details-only.
- Cho tải xuống.
- Không render XML raw trực tiếp như HTML để tránh UX xấu và rủi ro xử lý nội dung không an toàn.

Phase B:

- Parse XML ở server bằng parser an toàn, vô hiệu external entity.
- Hiển thị structured summary: mẫu số/ký hiệu, số hóa đơn, ngày, MST, nhà cung cấp, tiền trước thuế, thuế, tổng tiền.
- Lưu metadata chuẩn hóa và cho đối chiếu với thanh toán.

### 4.8 Action hierarchy

Không nên đặt ba nút ngang hàng cho mọi loại file. Thứ tự nên theo khả năng:

| Loại file | Primary | Secondary | Menu phụ |
|---|---|---|---|
| Ảnh/PDF | Xem nhanh | Tải xuống | Phóng toàn màn, mở tab mới, copy link, đổi tên, xóa |
| Word/Excel | Tải xuống | Xem thông tin | Copy link, đổi tên, xóa |
| DWG/DXF | Tải xuống | Xem thông tin | Copy link, đổi tên, xóa |
| XML | Xem thông tin | Tải xuống | Copy link, đổi tên, xóa |

## 5. File Card/File List UX

### 5.1 Card nên hiển thị

Tối thiểu Phase A.1:

- Icon màu theo loại file.
- Tên file tối đa hai dòng, tooltip desktop và tên đầy đủ trong viewer.
- Dung lượng.
- Extension/loại file thân thiện.
- Ngày upload.
- Người upload.
- Badge cảnh báo nếu extension không phù hợp rule folder hiện tại.
- Menu ba chấm luôn nhìn thấy, không phụ thuộc hover.

Folder không nhất thiết lặp trên từng card khi user đang ở một folder cụ thể, nhưng phải xuất hiện trong drawer/details và kết quả search toàn project trong tương lai.

### 5.2 Click semantics

- Click thân card: mở viewer/details.
- Click menu: không mở viewer.
- Double click không nên là hành vi bắt buộc.
- Keyboard: card focusable, Enter/Space mở viewer.
- Mobile: touch target tối thiểu đủ lớn; action không ẩn bằng hover.

### 5.3 Menu hành động

Phase A.1:

- Xem nhanh/Xem thông tin.
- Tải xuống.
- Mở tab mới, đặt trong menu phụ.
- Sao chép link nội bộ dạng app URL, không copy raw storage path.
- Đổi tên nếu có quyền.
- Xóa nếu có quyền.

Đổi tên không cần migration: chỉ cập nhật `originalName`/tên hiển thị, giữ nguyên `storedName` và `storagePath`. Extension nên bị khóa hoặc được validate để không tạo tên giả định dạng.

### 5.4 Tên file dài và tên file xấu

Nên dùng hai lớp:

1. **Hiển thị tốt:** line clamp, tooltip, viewer có tên đầy đủ.
2. **Dữ liệu sạch:** upload dialog phát hiện tên xấu và gợi ý đổi.

Heuristic cảnh báo không cần AI:

- Tên chỉ có `CV`, `scan`, `document`, `image`, `zalo`, chuỗi hash dài.
- Tên camera như `IMG_20260620_...`.
- Tên quá ngắn, quá dài hoặc không có từ khóa liên quan.
- Nhiều ký tự ngẫu nhiên.

Warning chỉ nên khuyến nghị ở UAT, không block cứng vì có trường hợp tên hợp lệ ngoài heuristic.

### 5.5 Badge và legacy data

Rule hiện chỉ chặn upload mới. Dữ liệu cũ có thể không phù hợp folder. Không nên ẩn hoặc tự xóa; nên:

- Badge `Không đúng định dạng folder`.
- Tooltip giải thích “Dữ liệu cũ, cần kiểm tra”.
- Filter `Cần kiểm tra` nếu số lượng đáng kể.

Badge nghiệp vụ như `Bản mới nhất`, `Đã ký`, `Đã đối chiếu` chỉ được hiển thị khi có dữ liệu/schema thật. Không suy diễn từ tên file để giả trạng thái.

### 5.6 Search/filter/sort

Phase A.1:

- Search/filter tiếp tục áp dụng trong folder đang chọn.
- Mở/đóng viewer không làm mất search/filter.
- Thêm sort: mới nhất, cũ nhất, tên A-Z, dung lượng.
- Với nhiều tài liệu, có toggle `Card/List`; mặc định:
  - Gallery/card cho ảnh hiện trường.
  - List cho hợp đồng, dự toán, nghiệm thu, hóa đơn, thanh toán, báo cáo.

Search toàn project và search metadata để Phase B, tránh tăng query/API scope ngay.

## 6. Upload Flow nâng cấp

### 6.1 Phương án 1 — Upload nhanh

Flow:

`Bấm nút → chọn file → upload ngay`

Ưu điểm:

- Nhanh.
- Ít thao tác.
- Phù hợp chụp ảnh hiện trường.

Nhược điểm:

- Không sửa tên trước upload.
- Không xác nhận folder.
- Không có chỗ hiển thị warning chi tiết.
- Dễ tích lũy tên `z719...jpg`, `CV.pdf`.

### 6.2 Phương án 2 — Upload có kiểm tra

Flow:

`Bấm nút → chọn file → dialog preflight → xác nhận upload`

Dialog hiển thị:

- Tên file hiện tại và ô tên hiển thị có thể sửa.
- Extension/loại file.
- Dung lượng.
- Folder đích.
- Rule và naming hint.
- Warning tên file xấu.
- Lỗi định dạng/dung lượng trước khi gửi.
- Nút `Tải lên`.

Ưu điểm:

- Làm sạch dữ liệu từ đầu.
- Giảm upload sai folder.
- Có chỗ mở rộng metadata Phase B.

Nhược điểm:

- Thêm một bước.
- Nếu dialog quá nhiều field sẽ làm chậm công trường.

### 6.3 Khuyến nghị cho UAT/MVP

Chọn **Upload Dialog nhẹ**, không làm form metadata đầy đủ:

1. User vẫn bấm nút theo folder.
2. File picker mở ngay.
3. Sau khi chọn, dialog preflight xuất hiện.
4. Tên file được prefill, extension khóa.
5. Hiển thị folder đích và rule.
6. Nếu tên xấu, đưa gợi ý nhưng cho phép bỏ qua.
7. Một nút xác nhận upload.

Đây là phương án cân bằng: chỉ thêm một click nhưng xử lý đúng vấn đề tên file và sai folder.

Ngoại lệ hợp lý cho `07. Hình ảnh hiện trường` trên mobile:

- Giữ đường tắt **Chụp ảnh nhanh**.
- Sau khi chụp, mở preflight tối giản với tên gợi ý tự động như `HT_20260620_1430`.
- Metadata khu vực/hạng mục để Phase B.

### 6.4 Progress/error/success

Phase A.1 nên có:

- Trạng thái `Đang tải...`, không cho submit lặp.
- Tên file đang upload.
- Lỗi cụ thể: quá dung lượng, sai định dạng, mất kết nối.
- Upload thành công: giữ folder và tự mở viewer của file vừa upload nếu là ảnh/PDF.
- Với file không preview được: tự mở drawer details, không tự tải file xuống.

Progress phần trăm thật cần upload mechanism có hỗ trợ progress; `fetch` hiện tại không cung cấp upload progress tiện lợi. Không nên fake thanh phần trăm. UAT có thể dùng spinner/indeterminate progress trung thực.

## 7. Folder-specific Tasks

### 7.1 Ma trận ưu tiên

| Folder | Làm ngay, không migration | Phase B, cần schema/quan hệ | Làm sau |
|---|---|---|---|
| `01. Hợp đồng` | Empty state “Chưa có hợp đồng”; filter PDF/Word/Excel; gợi ý tên; details/download | `documentType`: hợp đồng chính/phụ lục/bảo lãnh; `isPrimary`; số HĐ, ngày ký, giá trị, trạng thái | Approval/chữ ký số, nhắc hết hạn/bảo lãnh |
| `02. Bản vẽ` | Preview PDF/ảnh; CAD fallback; filter theo extension; cảnh báo file cũ không đúng rule | Loại thiết kế/shopdrawing/hoàn công; mã bản vẽ; revision; `isLatest`; trạng thái superseded | CAD web viewer/conversion, mark-up bản vẽ |
| `03. Dự toán` | Details Excel/PDF; gợi ý tên gốc/điều chỉnh; sort theo ngày | Loại dự toán, version, trạng thái phê duyệt; liên kết WBS/bảng khối lượng gốc | Import/compare BOQ tự động |
| `04. Nghiệm thu` | Preview PDF/ảnh; details Word; filter; gợi ý tên hạng mục/ngày | Hạng mục/WBS, ngày/đợt nghiệm thu, trạng thái đã ký/chưa ký, người duyệt | Workflow ký/duyệt và checklist hồ sơ |
| `05. Hóa đơn` | Preview PDF/ảnh; XML details-only; warning tên; sort mới nhất | Số HĐ, ngày, NCC, MST, số tiền, trạng thái kiểm tra; parse XML; relation supplier/payment | OCR ảnh/PDF, đối soát thuế tự động |
| `06. Thanh toán` | Preview chứng từ; details; gợi ý ngày/số tiền trong tên | Số tiền, ngày, phương thức, reference; relation invoice/contract/payment record; trạng thái đối chiếu | Đối soát ngân hàng tự động |
| `07. Hình ảnh hiện trường` | Gallery/card; preview full-screen; next/previous; chụp nhanh; gợi ý rename | Ngày chụp, khu vực, hạng mục, mô tả; relation site report/field progress | Map/EXIF, AI tagging, timeline nâng cao |
| `08. Báo cáo ngày` | Preview PDF; details Office; sort theo ngày; CTA phù hợp | Relation tới `SiteReport`, trạng thái submitted/approved, snapshot/export PDF | Chuyển trọng tâm sang tạo báo cáo trong app và tự đóng gói hồ sơ |

### 7.2 `01. Hợp đồng`

Làm ngay:

- Empty state rõ “Chưa có tài liệu hợp đồng”.
- Viewer/details tốt.
- Gợi ý naming.
- Không hiển thị “Chưa có hợp đồng chính” như một khẳng định nghiệp vụ vì schema chưa phân biệt hợp đồng chính/phụ lục.

Phase B:

- Thêm phân loại `MAIN_CONTRACT`, `APPENDIX`, `GUARANTEE`, `MINUTES`.
- Cho đánh dấu một hợp đồng chính theo project/nhóm hợp đồng, có rule chống nhiều bản chính.
- Metadata số hợp đồng, ngày ký, giá trị, bên ký.

### 7.3 `02. Bản vẽ`

Làm ngay:

- PDF/ảnh preview.
- DWG/DXF details + download.
- Hiển thị ngày upload và người upload rõ.

Phase B:

- Revision và `isLatest`.
- Khi đánh dấu bản mới nhất, bản cũ chuyển `Superseded`, không xóa.
- Filter Thiết kế/Shopdrawing/Hoàn công.
- Cần uniqueness theo mã bản vẽ + revision, không dựa vào tên file.

### 7.4 `03. Dự toán`

Làm ngay:

- List view thay vì card lớn.
- Details cho Excel/PDF.
- Naming hint dự toán gốc/điều chỉnh.

Phase B:

- `documentType`, version, ngày lập, người lập.
- Relation tới WBS/BOQ sau khi mô hình dữ liệu khối lượng gốc ổn định.

Không nên import Excel tự động trong A.1; mapping biểu mẫu dự toán thường khác nhau và dễ làm scope nổ.

### 7.5 `04. Nghiệm thu`

Làm ngay:

- Preview PDF/ảnh.
- Details Word.
- Gợi ý tên theo hạng mục/ngày.

Phase B:

- Link WBS/Field Progress.
- Trạng thái `DRAFT`, `SIGNED`, `REQUIRES_SIGNATURE`.
- Ngày nghiệm thu, đợt, bên tham gia.

### 7.6 `05. Hóa đơn`

Làm ngay:

- Preview PDF/ảnh.
- XML details-only.
- Warning tên chung chung.

Phase B:

- Metadata hóa đơn và parse XML.
- Relation Supplier/PaymentRecord.
- Cờ trùng số hóa đơn + MST + ngày.

Không nên OCR ngay vì XML hóa đơn là nguồn dữ liệu tốt hơn khi có; OCR chỉ là fallback.

### 7.7 `06. Thanh toán`

Làm ngay:

- Preview PDF/ảnh.
- Details và download rõ.

Phase B:

- Link chứng từ tới hóa đơn/hợp đồng/payment record.
- Trạng thái đối chiếu: chưa đối chiếu/khớp/chênh lệch.
- Không suy diễn trạng thái từ tên file.

### 7.8 `07. Hình ảnh hiện trường`

Làm ngay:

- Gallery.
- Full-screen image viewer.
- Next/previous.
- Nút chụp ảnh nhanh trên mobile.
- Gợi ý tên tự động theo thời gian.

Phase B:

- Gom theo ngày bằng metadata/createdAt.
- Gắn khu vực, hạng mục, ghi chú.
- Link SiteReport/FieldProgressEntry.

Làm sau:

- EXIF/GPS phải có policy riêng vì là dữ liệu nhạy cảm.
- Thumbnail pipeline và nén ảnh.

### 7.9 `08. Báo cáo ngày`

Làm ngay:

- Xem PDF trong app.
- Word/Excel details + download.
- Sort theo ngày.

Phase B:

- Link file xuất bản với `SiteReport`.
- Trạng thái báo cáo lấy từ `SiteReport`, không tạo một workflow song song trong Document.

Định hướng dài hạn:

- Báo cáo ngày nên được tạo trong app từ dữ liệu tiến độ, nhân lực, thiết bị, ảnh.
- Folder Documents lưu bản export/snapshot chính thức, không trở thành nơi nhập báo cáo thủ công mãi mãi.

## 8. Technical Design Options

### 8.1 Có thể làm ngay, không migration

- Viewer state trong `DocumentManager`.
- Right-side drawer desktop, full-screen mobile.
- Image/PDF inline qua protected route hiện có.
- Fallback details cho Office/CAD/XML.
- Click card mở viewer.
- Action menu luôn hiển thị/touch-friendly.
- Sort và toggle card/list.
- Badge legacy rule mismatch tính từ extension + folder rule.
- Upload preflight dialog nhẹ.
- Đổi tên hiển thị bằng cập nhật `originalName`, giữ physical name.
- Copy internal deep link với project/folder/document.
- Ghi audit view/download bằng model `AuditLog` hiện có, nhưng cần thiết kế tránh ghi lặp do iframe/Range.
- Capability UI đúng quyền thay vì `canEdit={true}`.

### 8.2 Cần migration/schema

Khuyến nghị không dồn mọi thứ vào một `metadata JSON` duy nhất. Dùng field chuẩn cho dữ liệu cần filter/index/ràng buộc, JSON cho phần biến thiên:

- `documentType`.
- `status`.
- `metadata Json?`.
- `isLatest` hoặc tốt hơn là relation/version group rõ.
- `versionGroupId`/`supersedesDocumentId` nếu cần versioning thực.
- `reviewedById`, `reviewedAt`.
- `fileHash` để phát hiện trùng.
- `displayName` riêng nếu muốn giữ immutable original filename.
- Relation invoice/payment/contract/WBS/site report/field progress.

`deletedAt` đã có nên không cần thêm soft delete. Cần bổ sung cleanup policy cho file vật lý.

### 8.3 Cần production storage

- S3/MinIO hoặc object storage tương đương.
- Object key không chứa dữ liệu nhạy cảm và không dùng trực tiếp làm quyền truy cập.
- Signed URL thời hạn ngắn hoặc authenticated proxy tùy yêu cầu audit/bảo mật.
- Multipart upload cho file lớn.
- Backup/versioning/lifecycle.
- Thumbnail/preview derivative.
- Virus scan/quarantine trước khi file thành `AVAILABLE`.
- Retry và xử lý orphan object/DB record.

Object storage không tự giải quyết UX, quyền, audit, metadata hoặc viewer. Nó chỉ là một phần của production readiness.

### 8.4 Security cần xử lý

Ưu tiên trước production:

1. Kiểm MIME/file signature ở server; không tin `file.type`.
2. Canonicalize và xác nhận path đọc nằm dưới storage root trong local mode.
3. `X-Content-Type-Options: nosniff`.
4. Cache policy phù hợp cho tài liệu private.
5. Range/streaming cho PDF lớn hoặc signed object URL.
6. Audit intent view/download; phân biệt preview và download.
7. Rate limit/quota upload.
8. Virus scan/quarantine.
9. Không commit file người dùng; ignore/di chuyển storage khỏi repo.
10. Capability-based RBAC theo action/folder.
11. Cleanup file vật lý sau retention, không chỉ soft delete DB.
12. Parse XML an toàn, vô hiệu external entity.

## 9. Recommended Roadmap

### Phase A.1 — Viewer/File Card/Upload Dialog nhẹ

Mục tiêu: cải thiện UAT rõ rệt mà không migration.

Phạm vi:

- Click card mở viewer trong app.
- Desktop drawer; mobile full-screen.
- Ảnh/PDF inline; expand full-screen.
- Office/CAD/XML details-only, tải xuống trung thực.
- `Mở tab mới` chuyển thành action phụ.
- Card/list rõ hơn; menu không phụ thuộc hover.
- Upload preflight dialog: folder, tên, loại, dung lượng, warning tên xấu.
- Đổi tên hiển thị.
- Giữ folder/search/filter/scroll khi xem file.
- Badge file legacy sai rule.
- Sửa capability UI tối thiểu.

Không làm trong A.1:

- Office viewer.
- CAD viewer.
- OCR.
- Workflow approval.
- Versioning thật.
- Metadata nghiệp vụ sâu.

### Phase B — Metadata/Status/Workflow có chọn lọc

Mục tiêu: biến Documents từ kho file thành hồ sơ có cấu trúc.

Thứ tự đề xuất:

1. Hóa đơn + Thanh toán: metadata và relation phục vụ kế toán.
2. Bản vẽ: revision/latest/superseded.
3. Nghiệm thu: link WBS/Field Progress và trạng thái ký.
4. Hợp đồng: loại tài liệu, hợp đồng chính, phụ lục.
5. Ảnh/Báo cáo ngày: relation SiteReport/Field Progress.

Mỗi nhóm nên có UAT riêng; không migration tất cả nghiệp vụ cùng lúc.

### Phase C — Production hardening

Mục tiêu: vận hành an toàn, bền vững và scale.

- Object storage.
- Signed access/authenticated delivery.
- Streaming/Range.
- Backup/lifecycle/retention.
- Virus scan/quarantine.
- Hash/duplicate detection.
- Thumbnail/preview conversion.
- Monitoring dung lượng, lỗi upload/download.
- Audit và security headers.
- Disaster recovery test.

## 10. Decision Matrix

| Feature | Giá trị cho người dùng | Độ khó | Rủi ro | Có nên làm ngay? |
|---|---|---:|---:|---|
| Click card mở viewer trong app | Rất cao | Thấp-Trung bình | Thấp | Có |
| Desktop right-side drawer | Rất cao | Trung bình | Thấp | Có |
| Mobile full-screen viewer | Rất cao | Trung bình | Thấp | Có |
| Ảnh inline + zoom/full-screen | Cao | Trung bình | Thấp | Có |
| PDF iframe/object inline | Rất cao | Thấp-Trung bình | Trung bình với file lớn | Có cho UAT |
| Mở tab mới thành action phụ | Cao | Thấp | Thấp | Có |
| Word/Excel details-only | Cao | Thấp | Thấp | Có |
| Office online viewer | Trung bình | Cao | Cao về private file/phụ thuộc ngoài | Không |
| CAD details + download | Cao | Thấp | Thấp | Có |
| CAD web viewer | Thấp-Trung bình trước khi có bằng chứng nhu cầu | Rất cao | Cao | Không |
| XML structured viewer | Cao cho kế toán | Trung bình-Cao | Trung bình | Phase B |
| Menu action không phụ thuộc hover | Cao | Thấp | Thấp | Có |
| Toggle card/list | Trung bình-Cao | Thấp-Trung bình | Thấp | Có nếu còn capacity |
| Upload preflight dialog nhẹ | Rất cao | Trung bình | Thấp | Có |
| Metadata form đầy đủ theo 8 folder | Cao | Cao | Scope lớn | Không trong A.1 |
| Warning tên file xấu | Cao | Thấp | Thấp nếu chỉ warning | Có |
| Đổi tên hiển thị | Cao | Thấp-Trung bình | Thấp | Có |
| Badge legacy sai rule | Trung bình-Cao | Thấp | Thấp | Có |
| `isLatest` cho bản vẽ | Rất cao | Trung bình | Cao nếu rule mơ hồ | Phase B |
| Audit view/download | Cao | Trung bình | Log noise nếu thiết kế kém | Nên harden sớm |
| Range/streaming local | Cao cho PDF lớn | Trung bình-Cao | Trung bình | Trước production |
| S3/MinIO | Rất cao cho vận hành | Cao | Trung bình-Cao | Phase C |
| Virus scan/quarantine | Cao cho an toàn | Cao | Trung bình | Phase C/trước production |
| OCR hóa đơn | Trung bình | Cao | Sai dữ liệu | Làm sau |
| AI tagging ảnh | Thấp ở giai đoạn hiện tại | Cao | Scope/chi phí | Không |

## 11. Kết luận

### 11.1 Đề xuất làm tiếp theo

Ưu tiên kế tiếp nên là **Phase A.1: in-app file viewer + file card action + upload preflight dialog nhẹ**.

Definition of done đề xuất:

- Upload ảnh/PDF xong có thể mở ngay trong app.
- Click file không mở tab mới mặc định.
- Desktop giữ được folder/list khi viewer mở.
- Mobile xem file bằng full-screen viewer.
- Word/Excel/CAD/XML có fallback rõ, không giả preview.
- Tải xuống luôn có sẵn.
- Đóng viewer quay lại đúng folder, search/filter và vị trí danh sách.
- Action menu dùng được bằng touch.
- User có thể sửa tên hiển thị trước hoặc sau upload theo quyền.

### 11.2 Không nên làm ngay

- Viewer Office bên thứ ba.
- Viewer/converter CAD.
- OCR/AI tagging.
- Workflow duyệt đồng loạt cho cả 8 folder.
- Versioning chỉ dựa vào tên file.
- Metadata form dài cho mọi upload.
- Chuyển storage rồi coi Documents đã hoàn tất.

### 11.3 Điều kiện để UAT tốt hơn

Documents có thể coi là UAT tốt hơn khi người dùng thực hiện được vòng lặp:

`Chọn folder → upload → kiểm tra tên/folder → xem ngay → tải/đổi tên/xóa theo quyền → đóng viewer và tiếp tục làm việc`

mà không bị bật khỏi app và không mất ngữ cảnh.

### 11.4 Điều kiện để Production Ready

Production Ready cần đồng thời:

- UX viewer ổn định trên desktop/mobile.
- RBAC đúng vai trò và action, không dùng `canEdit=true` cố định.
- File signature/MIME validation.
- Storage tách khỏi repo/app filesystem.
- Backup, lifecycle, retention và cleanup.
- Virus scan/quarantine phù hợp.
- Streaming/Range hoặc signed delivery cho file lớn.
- Audit view/download.
- Security headers và path containment.
- Monitoring lỗi/dung lượng.
- Metadata nghiệp vụ quan trọng đã được thiết kế có ràng buộc.
- Kiểm thử phục hồi dữ liệu và quyền truy cập chéo project.

Object storage là điều kiện quan trọng, nhưng không thay thế cho viewer trong app, dữ liệu sạch, quyền đúng, audit và workflow nghiệp vụ.
