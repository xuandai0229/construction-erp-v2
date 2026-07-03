import prisma from '../src/lib/prisma';
import {
  serializeDate,
  serializeDecimal,
  serializeProjectForClient,
  serializeReportAttachmentForClient,
  serializeReportForClient
} from '../src/lib/reports/report-serializers';
import { parseWeeklyGeneralNote } from '../src/lib/reports/weekly-report-utils';

function assertPlainSerializable(value: any, path: string = 'root') {
  if (value === null || value === undefined) return;
  if (typeof value === 'function') throw new Error(`Function found at ${path}`);
  if (typeof value === 'bigint') throw new Error(`BigInt found at ${path}`);
  if (value instanceof Date) throw new Error(`Date object found at ${path}`);
  if (value instanceof Map) throw new Error(`Map found at ${path}`);
  if (value instanceof Set) throw new Error(`Set found at ${path}`);
  
  if (typeof value === 'object') {
    if ('toNumber' in value && typeof value.toNumber === 'function') {
      throw new Error(`Decimal object found at ${path}`);
    }
    for (const key of Object.keys(value)) {
      assertPlainSerializable(value[key], `${path}.${key}`);
    }
  }
}

async function runAudit() {
  console.log("=== BẮT ĐẦU AUDIT SERIALIZATION REPORTS ===");
  
  // 1. Fetch active projects
  console.log("1. Kiểm tra Projects...");
  const projects = await prisma.project.findMany({ take: 10 });
  for (const p of projects) {
    const clientP = serializeProjectForClient(p);
    assertPlainSerializable(clientP, `project_${p.id}`);
  }
  console.log("-> Projects an toàn.");

  // 2. Fetch reports
  console.log("2. Kiểm tra Reports...");
  const reports = await prisma.siteReport.findMany({
    take: 10,
    include: {
      project: true,
      createdBy: true,
      lines: true,
      attachments: true
    }
  });

  for (const r of reports) {
    const clientR = serializeReportForClient(r);
    assertPlainSerializable(clientR, `report_${r.id}`);
    
    // Check attachments explicitly
    for (const a of r.attachments) {
      const clientA = serializeReportAttachmentForClient(a);
      assertPlainSerializable(clientA, `attachment_${a.id}`);
    }
  }
  console.log("-> Reports an toàn.");

  // 3. Test edge cases serializeDate
  console.log("3. Kiểm tra helpers serializeDate/Decimal...");
  assertPlainSerializable(serializeDate(new Date()), "serializeDate(new Date)");
  assertPlainSerializable(serializeDate("2026-07-03T10:00:00Z"), "serializeDate(string)");
  assertPlainSerializable(serializeDate(null), "serializeDate(null)");
  assertPlainSerializable(serializeDecimal(10.5), "serializeDecimal(number)");
  assertPlainSerializable(serializeDecimal("10.5"), "serializeDecimal(string)");
  console.log("-> Helpers an toàn.");

  // 4. Test Weekly General Note parse fail safety
  console.log("4. Kiểm tra WeeklyGeneralNote safety...");
  const badNote1 = parseWeeklyGeneralNote("not a json string");
  assertPlainSerializable(badNote1, "badNote1");
  const badNote2 = parseWeeklyGeneralNote(null);
  assertPlainSerializable(badNote2, "badNote2");
  const badNote3 = parseWeeklyGeneralNote('{"version":1,"invalidKey":new Date()}');
  assertPlainSerializable(badNote3, "badNote3");
  console.log("-> WeeklyGeneralNote parse fail safety: OK.");

  console.log("=== HOÀN TẤT AUDIT - MỌI THỨ AN TOÀN ===");
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
