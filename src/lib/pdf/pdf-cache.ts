type PdfCacheEntry = {
  key: string;
  buffer: Buffer;
  byteSize: number;
  updatedAt: string;
  timestamp: number;
  lastAccessed: number;
};

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
}

const pdfCache = new Map<string, PdfCacheEntry>();
const MAX_CACHE_ENTRIES = 50;
const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50 MB
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let currentTotalBytes = 0;
const metrics: CacheMetrics = { hits: 0, misses: 0, evictions: 0 };

/**
 * Builds a deterministic PDF cache key incorporating document versioning metadata.
 * NEVER relies on createdAt alone.
 */
export function buildPdfCacheKey(params: {
  reportId: string;
  documentType: string;
  updatedAt?: string | Date | null;
  templateVersion?: string;
  companyProfileVersion?: string;
}): string {
  const version = params.updatedAt
    ? new Date(params.updatedAt).getTime().toString()
    : "latest";
  const template = params.templateVersion || "v1";
  const companyVer = params.companyProfileVersion || "c1";

  return `${params.reportId}:${params.documentType}:${version}:${template}:${companyVer}`;
}

export function getCachedPdf(key: string): Buffer | null {
  cleanExpiredPdfCache();

  const entry = pdfCache.get(key);
  if (!entry) {
    metrics.misses++;
    return null;
  }

  // Update LRU timestamp
  entry.lastAccessed = Date.now();
  metrics.hits++;
  return entry.buffer;
}

export function setCachedPdf(key: string, buffer: Buffer, updatedAt: string = ""): void {
  if (!buffer || buffer.length === 0) return;

  const byteSize = buffer.length;

  // Evict LRU entries if capacity or size exceeds thresholds
  while (
    (pdfCache.size >= MAX_CACHE_ENTRIES || currentTotalBytes + byteSize > MAX_CACHE_BYTES) &&
    pdfCache.size > 0
  ) {
    evictOldestEntry();
  }

  const now = Date.now();
  pdfCache.set(key, {
    key,
    buffer,
    byteSize,
    updatedAt,
    timestamp: now,
    lastAccessed: now,
  });

  currentTotalBytes += byteSize;
}

function evictOldestEntry(): void {
  let oldestKey: string | null = null;
  let oldestAccess = Infinity;

  for (const [k, entry] of pdfCache.entries()) {
    if (entry.lastAccessed < oldestAccess) {
      oldestAccess = entry.lastAccessed;
      oldestKey = k;
    }
  }

  if (oldestKey && pdfCache.has(oldestKey)) {
    const entry = pdfCache.get(oldestKey)!;
    currentTotalBytes -= entry.byteSize;
    pdfCache.delete(oldestKey);
    metrics.evictions++;
  }
}

export function invalidatePdfCache(reportId: string): number {
  let count = 0;
  for (const [key, entry] of pdfCache.entries()) {
    if (key.startsWith(`${reportId}:`)) {
      currentTotalBytes -= entry.byteSize;
      pdfCache.delete(key);
      count++;
    }
  }
  return count;
}

export function cleanExpiredPdfCache(ttlMs: number = CACHE_TTL_MS): number {
  const now = Date.now();
  let count = 0;
  for (const [key, entry] of pdfCache.entries()) {
    if (now - entry.timestamp > ttlMs) {
      currentTotalBytes -= entry.byteSize;
      pdfCache.delete(key);
      count++;
    }
  }
  return count;
}

export function getPdfCacheMetrics(): CacheMetrics & { entryCount: number; totalBytes: number } {
  return {
    ...metrics,
    entryCount: pdfCache.size,
    totalBytes: currentTotalBytes,
  };
}

export function resetPdfCacheMetrics(): void {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.evictions = 0;
}
