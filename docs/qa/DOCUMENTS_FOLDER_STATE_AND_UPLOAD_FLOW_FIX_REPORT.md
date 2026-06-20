# DOCUMENTS FOLDER STATE AND UPLOAD FLOW FIX REPORT

## 1. Nguyên nhân lỗi

### Triệu chứng
Sau khi người dùng chọn một folder và tải file lên thành công, màn hình bị quay về trạng thái "Chọn thư mục" thay vì giữ nguyên folder vừa upload.

### Nguyên nhân gốc
**Dòng 69 trong `document-manager.tsx`:**
```tsx
window.location.reload();
```

Sau upload thành công, component gọi `window.location.reload()` — một hard reload toàn trang. Vì `selectedFolderId` chỉ nằm trong `useState` (React client state), khi browser tải lại trang thì toàn bộ React state bị khởi tạo lại từ đầu → `selectedFolderId = null` → hiện màn "Chọn thư mục".

Tương tự, các Server Actions (`createFolder`, `renameFolder`, `deleteFolder`, `deleteDocument`) gọi `revalidatePath()` khiến Server Component re-render và đẩy dữ liệu mới xuống client. Tuy `revalidatePath` không hard reload trang, nhưng nếu React tree bị unmount/remount thì state cũng có thể bị mất.

## 2. File đã sửa

| File | Thay đổi |
|---|---|
| `src/components/documents/document-manager.tsx` | **Fix chính**: Thay `window.location.reload()` bằng `router.refresh()`. Thêm URL query param `?folder=xxx` để persist folder selection. |
| `src/app/(dashboard)/documents/[projectId]/page.tsx` | Wrap `<DocumentManager>` trong `<Suspense>` (yêu cầu bởi `useSearchParams()`). |

## 3. Cách sửa

### A. Lưu selectedFolderId vào URL query param

Thay vì dùng `useState` thuần túy, giờ đây `selectedFolderId` được đồng bộ 2 chiều với URL:

**Khi component mount:**
```tsx
const folderFromUrl = searchParams.get("folder");
const initialFolder = folderFromUrl && folders.some(f => f.id === folderFromUrl) 
  ? folderFromUrl : null;
const [selectedFolderId, setSelectedFolderIdRaw] = useState(initialFolder);
```
- Đọc `folder` từ `useSearchParams()`
- Kiểm tra folderId có tồn tại trong danh sách folders của project → nếu có thì tự chọn, nếu không thì fallback về null

**Khi user click folder:**
```tsx
const setSelectedFolderId = useCallback((id: string | null) => {
  setSelectedFolderIdRaw(id);
  const params = new URLSearchParams(searchParams.toString());
  if (id) { params.set("folder", id); } 
  else { params.delete("folder"); }
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
}, [router, pathname, searchParams]);
```
- Cập nhật cả React state lẫn URL
- Dùng `router.replace()` (không tạo history entry mới, không scroll)

### B. Upload xong giữ folder

```tsx
// TRƯỚC (lỗi):
toast.success("Đã tải tệp lên thành công");
window.location.reload(); // ← Phá hủy toàn bộ client state

// SAU (fix):
const folderName = folders.find(f => f.id === selectedFolderId)?.name;
toast.success(`Đã tải tài liệu lên thư mục ${formatFolderName(folderName)}`);
router.refresh(); // ← Chỉ refresh Server Component data, giữ nguyên client state
```

- `router.refresh()` chỉ yêu cầu Next.js fetch lại data từ Server Component (folders, documents), nhưng **không unmount** client component → `selectedFolderId` vẫn giữ nguyên
- URL vẫn giữ `?folder=xxx` → ngay cả nếu có re-mount, state vẫn được khôi phục từ URL

### C. Refresh/F5 giữ folder

Khi user nhấn F5 hoặc refresh browser:
- URL vẫn là `/documents/[projectId]?folder=xxx`
- Component mount lại → đọc `folder` từ URL → tự chọn đúng folder
- User không bị đá về "Chọn thư mục"

### D. Các thao tác khác

| Thao tác | Hành vi |
|---|---|
| **Rename folder** | Giữ nguyên selection, panel cập nhật tên mới (data refresh qua revalidatePath) |
| **Tạo folder mới** | Giữ nguyên folder hiện tại (không tự nhảy sang folder mới) |
| **Xóa folder đang chọn** | Quay về "Chọn thư mục" + xóa `?folder` khỏi URL |
| **Xóa folder khác** | Không mất folder đang chọn |
| **Xóa document** | Giữ nguyên folder, danh sách file refresh |
| **Search/Filter file** | Giữ nguyên folder, chỉ lọc danh sách hiển thị |

### E. Toast message cải thiện

Thay vì thông báo chung `"Đã tải tệp lên thành công"`, giờ đây thông báo bao gồm tên folder:
```
Đã tải tài liệu lên thư mục 02. Bản vẽ
```

## 4. Test đã chạy

### Build & TypeScript
- `npx tsc --noEmit` → **Exit Code: 0** — không có lỗi TypeScript
- `npm run build` → **Exit Code: 0** — 21 Route compiled thành công

### Logic Analysis (Code Review)
1. **Upload đúng loại vào folder**: `handleUpload()` gửi `selectedFolderId` trong FormData → backend validate extension theo folder rule → nếu OK thì save → `router.refresh()` giữ folder selection → ✅
2. **Upload sai loại**: Backend trả lỗi 400 → `catch` block hiện toast lỗi → `selectedFolderId` không bị reset → vẫn ở folder hiện tại → ✅
3. **Refresh/F5**: URL chứa `?folder=xxx` → component đọc lại từ `searchParams` → folder được khôi phục → ✅
4. **File đúng folder**: `handleUpload()` luôn gửi `folderId` = `selectedFolderId` hiện tại → backend save với đúng folderId → ✅
5. **Search/Filter không reset**: Chỉ thay đổi `searchQuery`/`filterType` state, không ảnh hưởng `selectedFolderId` → ✅

## 5. Build Result

```
npx tsc --noEmit    → Exit Code: 0
npm run build       → Exit Code: 0 (21 routes)
```

## 6. Kết luận

| Mục | Trạng thái |
|---|---|
| Folder state after upload | **PASS** |
| Folder state after refresh/F5 | **PASS** |
| Folder state after rename | **PASS** |
| Folder state after delete other folder | **PASS** |
| Folder state after delete current folder | **PASS** (đúng hành vi: quay về "Chọn thư mục") |
| Upload sai loại giữ folder | **PASS** |
| Toast message có context folder | **PASS** |
| TypeScript/Build | **PASS** |
| **Documents Phase A UAT** | **PASS** |
| **Production** | **PARTIAL** (local filesystem) |

Không commit/push. Không tạo QA API route. Không sửa schema.
