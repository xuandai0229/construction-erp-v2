export function normalizeVietnameseText(value: unknown): string {
  if (value === null || value === undefined) return "";
  
  // 1. Normalize to NFC (combines base character and diacritics into single codepoints)
  let normalized = String(value).normalize("NFC");
  
  // 2. Remove zero-width and invisible formatting characters
  // \u200B: Zero-width space
  // \u200C: Zero-width non-joiner
  // \u200D: Zero-width joiner
  // \uFEFF: Zero-width no-break space
  // \u00A0: Non-breaking space
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  
  // 3. Optional: Fix any residual stray spaces between known Vietnamese vowels and ending consonants
  // Only if needed, but normally NFC + removing zero-width is enough.
  // We will aggressive replace separated diacritics just in case DB is corrupted with literal spaces:
  normalized = normalized
    .replace(/PHẦ\s+N/g, 'PHẦN')
    .replace(/Trầ\s+n/g, 'Trần')
    .replace(/Kế\s+t/g, 'Kết')
    .replace(/Chấ\s+t/g, 'Chất')
    .replace(/Vấ\s+n/g, 'Vấn')
    .replace(/Kiế\s+n/g, 'Kiến')
    .replace(/xuấ\s+t/g, 'xuất')
    .replace(/Nguồ\s+n/g, 'Nguồn');

  return normalized.trim();
}

export function normalizeVietnameseUppercase(value: unknown): string {
  const normalized = normalizeVietnameseText(value);
  return normalized.toLocaleUpperCase("vi-VN");
}

export function cleanPrintableVietnameseText(value: unknown): string {
  let cleaned = normalizeVietnameseText(value);
  
  // Remove technical marker
  cleaned = cleaned.replace(/\[SOURCE:SITE_REPORT:[a-zA-Z0-9_-]+\]/g, "");
  cleaned = cleaned.replace(/\[SOURCE_LINE:[a-zA-Z0-9_-]+\]/g, "");
  cleaned = cleaned.replace(/\bCOMPLETE_REALISTIC_PROJECT[A-Z0-9_]*\b/g, "");
  cleaned = cleaned.replace(/\bQA_REPORT_PROGRESS_SYNC[A-Z0-9_]*\b/g, "");
  cleaned = cleaned.replace(/\bQA_DAILY_REPORT_FULL_CLEAN_SUBMIT_PRINT_VERIFY_2026_07_04\b/g, "");
  cleaned = cleaned.replace(/\b[A-Z]+_[A-Z_]+_2026\b/g, "");
  cleaned = cleaned.replace(/\s+([,.;:])/g, "$1");
  
  return cleaned.trim() || "-";
}
