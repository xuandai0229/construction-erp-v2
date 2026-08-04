type BlobRecord = {
  url: string;
  createdAt: number;
  label?: string;
};

const activeBlobs = new Map<string, BlobRecord>();
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes max TTL

export function registerBlobUrl(blob: Blob, label?: string): string {
  const url = URL.createObjectURL(blob);
  activeBlobs.set(url, {
    url,
    createdAt: Date.now(),
    label,
  });
  return url;
}

export function revokeBlobUrl(url: string): void {
  if (!url) return;
  if (activeBlobs.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    activeBlobs.delete(url);
  }
}

export function cleanOrphanBlobs(maxAgeMs: number = DEFAULT_TTL_MS): number {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [url, record] of activeBlobs.entries()) {
    if (now - record.createdAt > maxAgeMs) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      activeBlobs.delete(url);
      cleanedCount++;
    }
  }
  return cleanedCount;
}

export function getActiveBlobCount(): number {
  return activeBlobs.size;
}
