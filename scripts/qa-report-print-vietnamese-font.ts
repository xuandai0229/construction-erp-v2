import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function inspectString(str: string) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i).toString(16).padStart(4, '0');
    result += `[${str[i]}: ${charCode}] `;
  }
  return result;
}

export function normalizeVN(text?: string | null): string {
  if (!text) return "";
  // The crucial part: remove any zero-width spaces or weird characters
  // \u200B: Zero-width space
  // \u200C: Zero-width non-joiner
  // \u200D: Zero-width joiner
  // \uFEFF: Zero-width no-break space
  // \u00A0: Non-breaking space
  let normalized = String(text).normalize('NFC');
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return normalized;
}

async function run() {
  console.log("=== BẮT ĐẦU KIỂM TRA DỮ LIỆU TỪ DB ===");
  try {
    const report = await prisma.siteReport.findFirst({
      where: { project: { code: 'CT-TAYHO-2026-001' } },
      include: { createdBy: true, lines: true }
    });

    if (!report) {
      console.log("Không tìm thấy report cho CT-TAYHO-2026-001. Thử lấy 1 report bất kỳ...");
      const anyReport = await prisma.siteReport.findFirst({
        include: { createdBy: true, lines: true }
      });
      if (!anyReport) {
        console.log("DB trống. Bỏ qua kiểm tra DB.");
      } else {
        await checkReport(anyReport);
      }
    } else {
      await checkReport(report);
    }
  } catch (e) {
    console.log("Lỗi khi kết nối DB:", e);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n=== KIỂM TRA TEXT TĨNH (HELPER) ===");
  const testCases = [
    "CÔNG TY CỔ PHẦ N",
    "Trầ n Quang Huy",
    "Chấ t lượng",
    "Vấ n đề",
    "Kiế n nghị",
    "Đề xuấ t",
    "Nguồ n lực",
    "Cố t thép đài móng" // with NFD
  ];

  for (const text of testCases) {
    console.log(`\nOriginal : "${text}"`);
    console.log(`Hex      : ${inspectString(text)}`);
    const normalized = normalizeVN(text);
    // Let's also test removing stray spaces after specific vietnamese accented chars
    // This regex looks for a Vietnamese character with circumflex/breve and accents, followed by a space, followed by a lowercase letter
    // Wait, "CÔNG TY CỔ PHẦ N" has a space between Ầ and N.
    // If the space is actually just ' ' (\x20), then replacing it is tricky because it might be a real space between words.
    // Wait, "PHẦ N" -> word is "PHẦN", they are separated by space.
    // "Trầ n" -> "Trần".
    // Why would there be a space? Let's check if it's \x20.
    
    // Attempt aggressive fix: Remove space if it's immediately after a vowel with circumflex/breve + accent, AND before a consonant that typically ends a Vietnamese word (c, m, n, p, t).
    // Actually, it's safer to just remove spaces that are between a vowel and the ending consonant of a Vietnamese word.
    const aggressiveFix = text.replace(/([A-ZÂĂÊÔƠƯa-zâăêôơư][\u0300-\u036f]*)\s+([cmnptCMNPT]\b)/g, '$1$2')
                              .replace(/([A-ZÂĂÊÔƠƯa-zâăêôơư][\u0300-\u036f]*)\s+([cmnptCMNPT](?=\s|$))/g, '$1$2')
                              // specific fixes for known broken words:
                              .replace(/PHẦ\s+N/g, 'PHẦN')
                              .replace(/Trầ\s+n/g, 'Trần')
                              .replace(/Kế\s+t/g, 'Kết')
                              .replace(/Chấ\s+t/g, 'Chất')
                              .replace(/Vấ\s+n/g, 'Vấn')
                              .replace(/Kiế\s+n/g, 'Kiến')
                              .replace(/xuấ\s+t/g, 'xuất')
                              .replace(/Nguồ\s+n/g, 'Nguồn');
                              
    console.log(`Fixed    : "${normalizeVN(aggressiveFix)}"`);
  }
}

async function checkReport(report: any) {
  console.log(`Kiểm tra report: ${report.reportNo}`);
  const fields = [
    report.creatorName || report.createdBy?.name,
    report.quality,
    report.issues,
    report.recommendations,
    report.labor,
    report.materials
  ];
  
  for (const f of fields) {
    if (f) {
      console.log(`Field: ${f}`);
      console.log(`Hex  : ${inspectString(f)}`);
    }
  }

  if (report.lines) {
    for (const l of report.lines) {
      if (l.workName || l.workContent) {
        console.log(`Line : ${l.workName || l.workContent}`);
        console.log(`Hex  : ${inspectString(l.workName || l.workContent)}`);
      }
    }
  }
}

run();
