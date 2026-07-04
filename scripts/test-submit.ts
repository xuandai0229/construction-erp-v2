import prisma from "../src/lib/prisma";
import { createSiteReport } from "../src/app/(dashboard)/reports/actions";

async function main() {
  const project = await prisma.project.findFirst({
    where: { code: "CT-TAYHO-2026-001" }
  });
  
  if (!project) {
    console.error("Project not found");
    return;
  }
  
  const items = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id, itemType: "WORK" },
    take: 2
  });
  
  if (items.length < 2) {
    console.error("Not enough work items found");
    return;
  }
  
  const data = {
    projectId: project.id,
    type: "DAILY",
    date: new Date().toISOString().split("T")[0],
    time: "08:30",
    weatherCondition: "SUNNY",
    weatherTemperature: "32",
    workLines: [
      {
        fieldProgressItemId: items[0].id,
        workContent: items[0].workContent,
        quantityToday: 44,
        note: "QA_DAILY_REPORT_FULL_SUBMIT_PRINT_VERIFY_2026_07_04 - kiểm tra dòng khối lượng 44"
      },
      {
        fieldProgressItemId: items[1].id,
        workContent: items[1].workContent,
        quantityToday: 12.5,
        note: "QA_DAILY_REPORT_FULL_SUBMIT_PRINT_VERIFY_2026_07_04 - kiểm tra dòng khối lượng 12.5"
      }
    ],
    materials: "QA_DAILY_REPORT_FULL_SUBMIT_PRINT_VERIFY_2026_07_04",
    labor: "QA_DAILY_REPORT_FULL_SUBMIT_PRINT_VERIFY_2026_07_04",
    quality: "QA_DAILY_REPORT_FULL_SUBMIT_PRINT_VERIFY_2026_07_04",
    issues: "QA_DAILY_REPORT_FULL_SUBMIT_PRINT_VERIFY_2026_07_04",
    recommendations: "QA_DAILY_REPORT_FULL_SUBMIT_PRINT_VERIFY_2026_07_04",
  };
  
  try {
    const result = await createSiteReport(data, false);
    console.log("Submit result:", result);
  } catch (error) {
    console.error("Submit Error:", error.message);
  }
}

main();
