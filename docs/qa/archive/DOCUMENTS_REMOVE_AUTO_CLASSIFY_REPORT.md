# Báo cáo: Documents Remove Auto-classify Feature

## 1. Executive Summary
Sau quá trình UAT thực tế, tính năng tự động phân loại hồ sơ (Auto-classify) được đánh giá là hoạt động không ổn định, dễ gây nhầm lẫn cho người dùng công trường, và không mang lại giá trị rõ ràng so với phân loại thủ công. Quyết định: **bỏ hoàn toàn tính năng tự đoán**, quay về mô hình đơn giản — người dùng tự chọn phân loại khi upload hoặc bổ sung sau.

## 2. Lý do bỏ Auto-classify
- Thuật toán dựa trên keyword trong tên file — không đáng tin cậy với tên file tiếng Việt viết tắt, không dấu, hoặc scan.
- Gợi ý sai tạo tâm lý "hệ thống đã chọn rồi" khiến người dùng không kiểm tra lại.
- Tên folder DB thật dùng underscore (`01_Hợp đồng`) nhưng code auto-classify dùng dot (`01. Hợp đồng`) gây lỗi mapping.
- Giá trị thực tế thấp: người dùng công trường upload ít file mỗi lần, tự chọn 1 dropdown nhanh hơn là đọc hiểu gợi ý.

## 3. Những gì đã xóa/ẩn

### 3.1 File đã xóa
- `src/lib/documents/auto-classify.ts` — toàn bộ thuật toán suggestDocumentType
- `scripts/qa/seed-documents-auto-classify-test-data.ts` — script seed QA
- `scripts/qa/diagnose-document-folders.ts` — script chẩn đoán folder

### 3.2 Code đã sửa trong `document-workspace.tsx`
- Xóa import `suggestDocumentType`, `AutoClassifyResult`
- Xóa field `suggestion` khỏi state `pendingUpload`
- `handleFileSelected`: không còn gọi `suggestDocumentType()`, `documentType` mặc định `""`
- Upload Preflight: xóa 2 block hiển thị gợi ý (`✨ Gợi ý phân loại...` và `Chưa nhận diện được...`)
- Thay bằng text hướng dẫn thủ công: *"Chọn phân loại để sau này lọc và gom nhóm dễ hơn. Có thể bỏ trống và bổ sung sau."*

### 3.3 Script QA
- `cleanup-documents-auto-classify-test-data.ts` → đổi tên thành `cleanup-qa-documents-test-data.ts`
- Giữ lại để dọn dữ liệu test trong tương lai nếu cần

## 4. Những gì giữ lại

| Tính năng | Giữ? | Lý do |
|:---|:---:|:---|
| Field `documentType` trong DB | ✅ | Phân loại thủ công vẫn cần |
| Dropdown "Loại hồ sơ" khi upload | ✅ | Người dùng tự chọn |
| Sửa phân loại trong Edit Metadata | ✅ | Bổ sung/sửa sau upload |
| Filter "Phân loại hồ sơ" | ✅ | Lọc file đã phân loại |
| Gom nhóm theo phân loại | ✅ | Nhóm hiển thị theo loại |
| Badge phân loại trên File Card | ✅ | Hiển thị rõ loại hồ sơ |
| Badge "Chưa phân loại" | ✅ | Nhắc người dùng bổ sung |
| `metadata-types.ts` + normalize | ✅ | Danh sách phân loại theo folder |
| `document-rules.ts` + normalize | ✅ | Tránh fallback "Tài liệu khác" |
| Backend validation documentType | ✅ | Kiểm tra hợp lệ khi upload |

## 5. Cleanup dữ liệu QA_AUTO
- **11 document records** có prefix `QA_AUTO_` đã được hard-delete khỏi DB
- **11 file vật lý** đã xóa khỏi `storage/`
- **8 folder gốc** còn đúng (không trùng), không có folder QA sót lại
- Dữ liệu thật (6 file Hợp đồng, 4 file Bản vẽ, 10 file Nghiệm thu) không bị ảnh hưởng

## 6. UI Upload Preflight sau khi sửa
```
┌─────────────────────────────────────┐
│ Tệp đã chọn: document.pdf          │
│                                     │
│ Tên hiển thị: [___________________] │
│                                     │
│ Loại hồ sơ:   [-- Chọn loại --  ▾] │
│ Chọn phân loại để sau này lọc và    │
│ gom nhóm dễ hơn. Có thể bỏ trống   │
│ và bổ sung sau.                     │
│                                     │
│ Ghi chú:      [___________________] │
│                                     │
│ Lưu vào: 01_Hợp đồng               │
│                                     │
│              [Hủy]  [Tải lên]       │
└─────────────────────────────────────┘
```

## 7. File Card sau khi sửa
- Có phân loại: Badge xanh `📋 Hợp đồng chính`
- Chưa phân loại: Badge vàng `Chưa phân loại`
- Không còn bất kỳ wording nào về "tự phân loại" hoặc "gợi ý"

## 8. Build Result & Git Safety
- `npx prisma validate`: PASS
- `tsc --noEmit`: PASS
- `npm run build`: PASS (Exit code 0)
- `git ls-files storage`: Rỗng
- Repo local an toàn, tuyệt đối KHÔNG push

## 9. Rủi ro còn lại
- Không có rủi ro từ việc bỏ auto-classify. Tính năng không ảnh hưởng DB hoặc dữ liệu hiện có.
- File đã được auto-classify trước đó vẫn giữ nguyên `documentType` trong DB — không bị reset.

## 10. Kết luận
- **Auto-classify removed**: PASS
- **Manual classification**: PASS (dropdown, edit metadata, filter, group — tất cả hoạt động)
- **Có migration không**: KHÔNG
- **Push repo cũ**: KHÔNG
- **Production**: NO-GO
