import "dotenv/config";
import prisma from "../src/lib/prisma";
import { addDays, startOfWeek } from "date-fns";

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  if (!adminUser) throw new Error("No admin user");

  const project = await prisma.project.findFirst({ where: { status: "ACTIVE" } });
  if (!project) throw new Error("No active project");

  const category1 = await prisma.fieldProgressItem.findFirst({ where: { projectId: project.id, itemType: "GROUP" } });
  const category2 = await prisma.fieldProgressItem.findFirst({ where: { projectId: project.id, itemType: "GROUP", id: { not: category1?.id } } });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekStart, 13);

  console.log("Creating fixture for NEXT_WEEK_PLAN...");
  const dossier = await prisma.supervisionWeeklyDossier.create({
    data: {
      createdById: adminUser.id,
      weekStart,
      weekEnd,
      nextWeekStart,
      nextWeekEnd,
      status: "DRAFT",
      version: 99,
      reportNumber: null,
      place: "Hà Nội",
      recipientName: "Ban Lãnh đạo",
      recipientTitle: "Ban Lãnh đạo Công ty",
    }
  });

  const nextMonday = nextWeekStart;
  const nextTuesday = addDays(nextMonday, 1);
  const nextWednesday = addDays(nextMonday, 2);
  const nextThursday = addDays(nextMonday, 3);
  const nextFriday = addDays(nextMonday, 4);
  const nextSaturday = addDays(nextMonday, 5);
  const nextSunday = addDays(nextMonday, 6);

  // Entries
  const entries = [
    // T2 Sáng: 2 dòng
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextMonday, shift: "MORNING" as any, sortOrder: 0, inputMode: "PROJECT_WORK_ITEM" as any, projectId: project.id, projectNameSnapshot: project.name, categoryItemId: category1?.id, categoryNameSnapshot: category1?.workContent, commanderProposal: "Đề xuất A", inspectionContent: "Nội dung A", displayText: "Dòng 1" },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextMonday, shift: "MORNING" as any, sortOrder: 1, inputMode: "PROJECT_WORK_ITEM" as any, projectId: project.id, projectNameSnapshot: project.name, categoryItemId: category2?.id, categoryNameSnapshot: category2?.workContent, commanderProposal: "Đề xuất B", inspectionContent: "Nội dung B", displayText: "Dòng 2" },
    // T2 Chiều: nhập tay
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextMonday, shift: "AFTERNOON" as any, sortOrder: 0, inputMode: "MANUAL_TEXT" as any, manualProjectName: "Công trình test nhập tay", commanderProposal: "Đề xuất C", inspectionContent: "Nội dung C", displayText: "Dòng 3" },
    // T3 Tối: dài
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextTuesday, shift: "EVENING" as any, sortOrder: 0, inputMode: "PROJECT_WORK_ITEM" as any, projectId: project.id, projectNameSnapshot: project.name, commanderProposal: "Dòng dài 1\nDòng dài 2\nDòng dài 3", inspectionContent: "Nội dung dài 1\nNội dung dài 2", displayText: "Dòng 4" },
    // T4 không có buổi
    // T5 đủ sáng/chiều/tối
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextThursday, shift: "MORNING" as any, sortOrder: 0, inputMode: "PROJECT_WORK_ITEM" as any, projectId: project.id, projectNameSnapshot: project.name, commanderProposal: "Đề xuất sáng", inspectionContent: "Nội dung sáng", displayText: "Dòng 5" },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextThursday, shift: "AFTERNOON" as any, sortOrder: 0, inputMode: "PROJECT_WORK_ITEM" as any, projectId: project.id, projectNameSnapshot: project.name, commanderProposal: "Đề xuất chiều", inspectionContent: "Nội dung chiều", displayText: "Dòng 6" },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextThursday, shift: "EVENING" as any, sortOrder: 0, inputMode: "PROJECT_WORK_ITEM" as any, projectId: project.id, projectNameSnapshot: project.name, commanderProposal: "Đề xuất tối", inspectionContent: "Nội dung tối", displayText: "Dòng 7" },
    // T6 có nhiều công trình
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextFriday, shift: "MORNING" as any, sortOrder: 0, inputMode: "MANUAL_TEXT" as any, manualProjectName: "CT A", commanderProposal: "Đề xuất", inspectionContent: "Nội dung", displayText: "Dòng 8" },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextFriday, shift: "MORNING" as any, sortOrder: 1, inputMode: "MANUAL_TEXT" as any, manualProjectName: "CT B", commanderProposal: "Đề xuất", inspectionContent: "Nội dung", displayText: "Dòng 9" },
    // Chủ nhật có phụ lục
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextSunday, shift: "MORNING" as any, sortOrder: 0, inputMode: "PROJECT_WORK_ITEM" as any, projectId: project.id, projectNameSnapshot: project.name, commanderProposal: "Đề xuất CN", inspectionContent: "Nội dung CN (có đính kèm phụ lục PL-01)", displayText: "Dòng 10" },
  ];
  await prisma.supervisionWeeklyEntry.createMany({ data: entries });

  const shiftSelections = [
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextSaturday, shift: "MORNING" as any },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, entryDate: nextSaturday, shift: "AFTERNOON" as any },
  ];
  await prisma.supervisionWeeklyShiftSelection.createMany({ data: shiftSelections });

  const observations = [
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, category: "Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng", sortOrder: 0, content: "Tồn tại 1: abc\nTồn tại 2: xyz\nTồn tại 3: 123" },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, category: "Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành", sortOrder: 1, content: "Khắc phục 1: OK\nKhắc phục 2: OK\nKhắc phục 3: OK" },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, category: "Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật", sortOrder: 0, content: "Cần bổ sung thêm nhân lực cho đội thi công A vì hiện tại đang làm rất chậm, chất lượng không đảm bảo.\nKiến nghị đổi người phụ trách an toàn." },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, category: "Chỉ đạo tiến độ các đội chưa đạt yêu cầu, chậm tiến độ, thi công chưa đạt chất lượng", sortOrder: 1, content: "" }, // Để trống
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, category: "Xử lý phát sinh kỹ thuật, phát sinh vật liệu", sortOrder: 2, content: "Vật liệu X phát sinh thêm 200kg." },
    { dossierId: dossier.id, documentType: "NEXT_WEEK_PLAN" as any, category: "Ý kiến khác", sortOrder: 3, content: "Không có ý kiến gì thêm." },
  ];
  await prisma.supervisionWeeklyObservation.createMany({ data: observations });

  console.log(`Dossier created with ID: ${dossier.id}`);
  console.log(`Link: http://localhost:3000/supervision/weekly/${dossier.id}/edit`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
