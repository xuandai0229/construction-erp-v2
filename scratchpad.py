import re

with open(r"d:\construction-erp-v2\src\components\documents\document-workspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove loadTrashChildren entirely
content = re.sub(r'  // Lazy load trash children.*?\n  }, \[projectId\]\);\n', '', content, flags=re.DOTALL)
content = re.sub(r'loadTrashChildren\(folder\.id\);\n', '', content)
content = re.sub(r'isLoadingTrash \? \(.*?\) : ', '', content, flags=re.DOTALL) # Remove loading UI that used isLoadingTrash if any

# Replace old trash state with new architecture
old_state = r'''  // Trash lazy-load state
  const \[trashFolders, setTrashFolders\] = useState<FolderItem\[\]>\(deletedFolders\);
  const \[trashDocuments, setTrashDocuments\] = useState<DocumentListItem\[\]>\(deletedDocuments\);
  const \[trashLoadedFolderCount, setTrashLoadedFolderCount\] = useState\(deletedFolders\.length\);
  const \[trashLoadedFileCount, setTrashLoadedFileCount\] = useState\(deletedDocuments\.length\);
  const \[trashTotalFolders, setTrashTotalFolders\] = useState\(pagination\?\.totalDeletedFolders \?\? deletedFolders\.length\);
  const \[trashTotalFiles, setTrashTotalFiles\] = useState\(pagination\?\.totalDeletedFiles \?\? deletedDocuments\.length\);
  const \[isLoadingTrash, setIsLoadingTrash\] = useState\(false\);'''

new_state = '''  // Trash lazy-load state (aligned with active workspace)
  const [loadedTrashFolderCount, setLoadedTrashFolderCount] = useState(deletedFolders.length);
  const [loadedTrashFileCount, setLoadedTrashFileCount] = useState(deletedDocuments.length);
  const [extraTrashFolders, setExtraTrashFolders] = useState<FolderItem[]>([]);
  const [extraTrashDocuments, setExtraTrashDocuments] = useState<DocumentListItem[]>([]);
  const [isLoadingMoreTrashFolders, setIsLoadingMoreTrashFolders] = useState(false);
  const [isLoadingMoreTrashFiles, setIsLoadingMoreTrashFiles] = useState(false);
  
  const trashFolders = useMemo(() => {
    const ids = new Set(deletedFolders.map(f => f.id));
    return [...deletedFolders, ...extraTrashFolders.filter(f => !ids.has(f.id))];
  }, [deletedFolders, extraTrashFolders]);
  
  const trashDocuments = useMemo(() => {
    const ids = new Set(deletedDocuments.map(d => d.id));
    return [...deletedDocuments, ...extraTrashDocuments.filter(d => !ids.has(d.id))];
  }, [deletedDocuments, extraTrashDocuments]);

  const hasMoreTrashFolders = pagination ? loadedTrashFolderCount < pagination.totalDeletedFolders : false;
  const hasMoreTrashFiles = pagination ? loadedTrashFileCount < pagination.totalDeletedFiles : false;
'''
content = re.sub(old_state, new_state, content)

# Update useEffects for Trash
old_effects = r'''  useEffect\(\(\) => \{
    setTrashFolders\(\(prev\) => \{
      const serverIds = new Set\(deletedFolders\.map\(\(f\) => f\.id\)\);
      const keepPrev = prev\.filter\(\(f\) => !serverIds\.has\(f\.id\)\);
      return \[\.\.\.deletedFolders, \.\.\.keepPrev\];
    \}\);
  \}, \[deletedFolders\]\);
  useEffect\(\(\) => \{
    setTrashDocuments\(\(prev\) => \{
      const serverIds = new Set\(deletedDocuments\.map\(\(d\) => d\.id\)\);
      const keepPrev = prev\.filter\(\(d\) => !serverIds\.has\(d\.id\)\);
      return \[\.\.\.deletedDocuments, \.\.\.keepPrev\];
    \}\);
  \}, \[deletedDocuments\]\);'''

new_effects = '''  useEffect(() => {
    setLoadedTrashFolderCount(deletedFolders.length);
    setExtraTrashFolders([]);
  }, [deletedFolders]);
  useEffect(() => {
    setLoadedTrashFileCount(deletedDocuments.length);
    setExtraTrashDocuments([]);
  }, [deletedDocuments]);'''
content = re.sub(old_effects, new_effects, content)

# Add loadMoreTrashFolders and loadMoreTrashFiles
load_more_trash = '''
  const loadMoreTrashFolders = useCallback(async () => {
    if (isLoadingMoreTrashFolders || !pagination) return;
    setIsLoadingMoreTrashFolders(true);
    try {
      const params = new URLSearchParams({
        projectId,
        type: "trashFolders",
        skip: String(loadedTrashFolderCount),
        take: String(pagination.folderPageSize),
      });
      if (selectedTrashFolderId) params.set("parentId", selectedTrashFolderId);
      const res = await fetch(`/api/documents/load-more?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExtraTrashFolders(prev => [...prev, ...data.items]);
        setLoadedTrashFolderCount(prev => prev + data.items.length);
      }
    } finally {
      setIsLoadingMoreTrashFolders(false);
    }
  }, [isLoadingMoreTrashFolders, pagination, projectId, loadedTrashFolderCount, selectedTrashFolderId]);

  const loadMoreTrashFiles = useCallback(async () => {
    if (isLoadingMoreTrashFiles || !pagination) return;
    setIsLoadingMoreTrashFiles(true);
    try {
      const params = new URLSearchParams({
        projectId,
        type: "trashFiles",
        skip: String(loadedTrashFileCount),
        take: String(pagination.filePageSize),
        sortBy,
      });
      if (selectedTrashFolderId) params.set("folderId", selectedTrashFolderId);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/documents/load-more?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExtraTrashDocuments(prev => [...prev, ...data.items]);
        setLoadedTrashFileCount(prev => prev + data.items.length);
      }
    } finally {
      setIsLoadingMoreTrashFiles(false);
    }
  }, [isLoadingMoreTrashFiles, pagination, projectId, loadedTrashFileCount, sortBy, selectedTrashFolderId, searchQuery]);
'''
content = re.sub(r'(  const loadMoreFiles = useCallback.*?\}, \[.*?\]\);\n)', r'\1' + load_more_trash, content, flags=re.DOTALL)

# Replace 'trashFolders' with 'allTrashFolders'
# Wait, I named it 'trashFolders' in the useMemo so I don't have to change all the references!
# But wait, in handlePermanentDelete/handleRestore, they mutate trashFolders!
# But we can't mutate trashFolders anymore because it's a useMemo!
# We must mutate extraTrashFolders instead!
content = re.sub(r'setTrashFolders\(\(prev\) => prev\.filter\(\(f\) => f\.id !== id\)\);', r'setExtraTrashFolders((prev) => prev.filter((f) => f.id !== id));', content)
content = re.sub(r'setTrashDocuments\(\(prev\) => prev\.filter\(\(d\) => d\.id !== id\)\);', r'setExtraTrashDocuments((prev) => prev.filter((d) => d.id !== id));', content)

# Fix onClick for Trash Load More
content = re.sub(r'onClick=\{isTrashView \? undefined : loadMoreFolders\}', 'onClick={isTrashView ? loadMoreTrashFolders : loadMoreFolders}', content)
content = re.sub(r'disabled=\{isLoadingMoreFolders\}', 'disabled={isTrashView ? isLoadingMoreTrashFolders : isLoadingMoreFolders}', content)

content = re.sub(r'onClick=\{loadMoreFiles\}', 'onClick={isTrashView ? loadMoreTrashFiles : loadMoreFiles}', content)
content = re.sub(r'disabled=\{isLoadingMoreFiles\}', 'disabled={isTrashView ? isLoadingMoreTrashFiles : isLoadingMoreFiles}', content)

with open(r"d:\construction-erp-v2\src\components\documents\document-workspace.tsx", "w", encoding="utf-8") as f:
    f.write(content)
