import "dotenv/config";
import prisma from "../src/lib/prisma";

interface TestResult {
  testName: string;
  status: "PASS" | "FAIL";
  expected: string;
  actual: string;
  message: string;
}

const results: TestResult[] = [];

async function main() {
  console.log("=== QA FIELD PROGRESS SYNC TEST ===\n");
  console.log("Database: Connected ✅\n");
  
  // Setup: Tìm hoặc tạo project test
  let project = await prisma.project.findFirst({
    where: { code: "QA-FIELD-PROGRESS", deletedAt: null }
  });
  
  if (!project) {
    console.log("📦 Creating test project: QA-FIELD-PROGRESS");
    const admin = await prisma.user.findFirst();
    if (!admin) throw new Error("No user found to create project");
    
    project = await prisma.project.create({
      data: {
        code: "QA-FIELD-PROGRESS",
        name: "QA Test - Field Progress Module",
        startDate: new Date("2026-06-01"),
        estimatedEndDate: new Date("2026-12-31"),
        status: "ACTIVE",
        investor: "QA Department",
        investmentAmount: 1000000,
        createdById: admin.id
      }
    });
    console.log(`✅ Project created: ${project.id}\n`);
  } else {
    console.log(`✅ Project found: ${project.id} - ${project.code}\n`);
  }
  
  // Setup: Template
  let template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: project.id, deletedAt: null }
  });
  
  if (!template) {
    console.log("📋 Creating template");
    const admin = await prisma.user.findFirst();
    template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId: project.id,
        name: "Bảng khối lượng QA Test",
        createdById: admin!.id
      }
    });
    console.log(`✅ Template created: ${template.id}\n`);
  } else {
    console.log(`✅ Template found: ${template.id}\n`);
  }
  
  // Setup: Items (xóa cũ nếu có, tạo mới)
  const existingItems = await prisma.fieldProgressItem.count({
    where: { templateId: template.id, deletedAt: null }
  });
  
  let testItems: any[] = [];
  
  if (existingItems < 5) {
    console.log("🏗️  Creating test items (5 work items)");
    
    // Soft delete old items
    await prisma.fieldProgressItem.updateMany({
      where: { templateId: template.id, deletedAt: null },
      data: { deletedAt: new Date() }
    });
    
    // Create group
    const group = await prisma.fieldProgressItem.create({
      data: {
        templateId: template.id,
        itemType: "GROUP",
        categoryName: "Phần móng QA Test",
        code: "MONG-QA",
        level: 0,
        sortOrder: 1
      }
    });
    
    // Create 5 work items
    testItems = await Promise.all([
      prisma.fieldProgressItem.create({
        data: {
          templateId: template.id,
          parentId: group.id,
          itemType: "WORK",
          workContent: "Đào móng QA Test",
          code: "MONG-QA-01",
          unit: "m3",
          designQuantity: 100,
          constructionCrew: "Mũi 1",
          level: 1,
          sortOrder: 2
        }
      }),
      prisma.fieldProgressItem.create({
        data: {
          templateId: template.id,
          parentId: group.id,
          itemType: "WORK",
          workContent: "Bê tông lót QA Test",
          code: "MONG-QA-02",
          unit: "m3",
          designQuantity: 50,
          constructionCrew: "Mũi 1",
          level: 1,
          sortOrder: 3
        }
      }),
      prisma.fieldProgressItem.create({
        data: {
          templateId: template.id,
          parentId: group.id,
          itemType: "WORK",
          workContent: "Đào hố ga QA Test",
          code: "MONG-QA-03",
          unit: "cái",
          designQuantity: 20,
          constructionCrew: "Mũi 2",
          level: 1,
          sortOrder: 4
        }
      }),
      prisma.fieldProgressItem.create({
        data: {
          templateId: template.id,
          parentId: group.id,
          itemType: "WORK",
          workContent: "Xây tường móng QA Test",
          code: "MONG-QA-04",
          unit: "m2",
          designQuantity: 150,
          constructionCrew: "Mũi 2",
          level: 1,
          sortOrder: 5
        }
      }),
      prisma.fieldProgressItem.create({
        data: {
          templateId: template.id,
          parentId: group.id,
          itemType: "WORK",
          workContent: "Dầm móng QA Test",
          code: "MONG-QA-05",
          unit: "m3",
          designQuantity: 30,
          constructionCrew: "Mũi 1",
          level: 1,
          sortOrder: 6
        }
      })
    ]);
    
    console.log(`✅ Created ${testItems.length} work items\n`);
  } else {
    testItems = await prisma.fieldProgressItem.findMany({
      where: { templateId: template.id, deletedAt: null, itemType: "WORK" },
      orderBy: { sortOrder: "asc" },
      take: 5
    });
    console.log(`✅ Using existing ${testItems.length} work items\n`);
  }
  
  // Clean old test entries (only for this template)
  const deletedCount = await prisma.fieldProgressEntry.deleteMany({
    where: {
      templateId: template.id,
      entryDate: {
        gte: new Date("2026-06-08"),
        lte: new Date("2026-06-11")
      }
    }
  });
  console.log(`🧹 Cleaned ${deletedCount.count} old test entries\n`);
  
  const admin = await prisma.user.findFirst();
  if (!admin) throw new Error("No user found");
  
  // ==================== TEST 1: LƯU TẠM 09/06 ====================
  console.log("📝 TEST 1: Lưu tạm ngày 09/06");
  
  const date0906Start = new Date("2026-06-09T00:00:00");
  const date0906Next = new Date("2026-06-10T00:00:00");
  
  await Promise.all([
    prisma.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: testItems[0].id,
        entryDate: date0906Start,
        quantity: 0.1,
        status: "DRAFT",
        createdById: admin.id
      }
    }),
    prisma.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: testItems[1].id,
        entryDate: date0906Start,
        quantity: 22,
        status: "DRAFT",
        createdById: admin.id
      }
    }),
    prisma.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: testItems[2].id,
        entryDate: date0906Start,
        quantity: 40,
        status: "DRAFT",
        createdById: admin.id
      }
    })
  ]);
  
  // Query lại bằng range
  const queried0906 = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      entryDate: { gte: date0906Start, lt: date0906Next }
    },
    orderBy: { itemId: "asc" }
  });
  
  const test1Pass = 
    queried0906.length === 3 &&
    queried0906.every(e => e.status === "DRAFT") &&
    queried0906[0].quantity.toString() === "0.1" &&
    queried0906[1].quantity.toString() === "22" &&
    queried0906[2].quantity.toString() === "40";
  
  results.push({
    testName: "TEST 1: Lưu tạm ngày 09/06",
    status: test1Pass ? "PASS" : "FAIL",
    expected: "3 entries, status DRAFT, quantities: 0.1, 22, 40",
    actual: `${queried0906.length} entries, status: ${queried0906.map(e => e.status).join(",")}, qty: ${queried0906.map(e => e.quantity.toString()).join(",")}`,
    message: test1Pass ? "Dữ liệu 09/06 lưu đúng với range query" : "Dữ liệu 09/06 không đúng"
  });
  
  console.log(test1Pass ? "✅ PASS\n" : "❌ FAIL\n");
  
  // ==================== TEST 2: TÁCH 09/06 VÀ 10/06 ====================
  console.log("📝 TEST 2: Tách dữ liệu 09/06 và 10/06");
  
  const date1006Start = new Date("2026-06-10T00:00:00");
  const date1006Next = new Date("2026-06-11T00:00:00");
  
  // Query 10/06 trước khi nhập (phải rỗng)
  const queriedBefore1006 = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      entryDate: { gte: date1006Start, lt: date1006Next }
    }
  });
  
  const test2aBefore = queriedBefore1006.length === 0;
  
  // Nhập 10/06
  await Promise.all([
    prisma.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: testItems[0].id,
        entryDate: date1006Start,
        quantity: 5,
        status: "DRAFT",
        createdById: admin.id
      }
    }),
    prisma.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: testItems[1].id,
        entryDate: date1006Start,
        quantity: 10,
        status: "DRAFT",
        createdById: admin.id
      }
    })
  ]);
  
  // Query lại 09/06 (phải vẫn đúng)
  const queriedAgain0906 = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      entryDate: { gte: date0906Start, lt: date0906Next }
    },
    orderBy: { itemId: "asc" }
  });
  
  const test2b0906 = 
    queriedAgain0906.length === 3 &&
    queriedAgain0906[0].quantity.toString() === "0.1" &&
    queriedAgain0906[1].quantity.toString() === "22" &&
    queriedAgain0906[2].quantity.toString() === "40";
  
  // Query lại 10/06
  const queriedAgain1006 = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      entryDate: { gte: date1006Start, lt: date1006Next }
    },
    orderBy: { itemId: "asc" }
  });
  
  const test2c1006 = 
    queriedAgain1006.length === 2 &&
    queriedAgain1006[0].quantity.toString() === "5" &&
    queriedAgain1006[1].quantity.toString() === "10";
  
  const test2Pass = test2aBefore && test2b0906 && test2c1006;
  
  results.push({
    testName: "TEST 2: Tách dữ liệu 09/06 và 10/06",
    status: test2Pass ? "PASS" : "FAIL",
    expected: "10/06 before: 0; 09/06 after: 0.1,22,40; 10/06 after: 5,10",
    actual: `10/06 before: ${queriedBefore1006.length}; 09/06: ${queriedAgain0906.map(e => e.quantity.toString()).join(",")}; 10/06: ${queriedAgain1006.map(e => e.quantity.toString()).join(",")}`,
    message: test2Pass ? "Dữ liệu ngày không bị lẫn" : "Dữ liệu ngày bị lẫn"
  });
  
  console.log(test2Pass ? "✅ PASS\n" : "❌ FAIL\n");
  
  // ==================== TEST 3: GỬI GIÁM SÁT ====================
  console.log("📝 TEST 3: Gửi giám sát");
  
  // Chuyển 09/06 sang SUBMITTED
  const updateResult = await prisma.fieldProgressEntry.updateMany({
    where: {
      templateId: template.id,
      entryDate: { gte: date0906Start, lt: date0906Next }
    },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date()
    }
  });
  
  const submittedEntries = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      entryDate: { gte: date0906Start, lt: date0906Next }
    }
  });
  
  const test3Pass = 
    updateResult.count === 3 &&
    submittedEntries.every(e => e.status === "SUBMITTED" && e.submittedAt !== null);
  
  results.push({
    testName: "TEST 3: Gửi giám sát",
    status: test3Pass ? "PASS" : "FAIL",
    expected: "3 entries updated to SUBMITTED with submittedAt",
    actual: `${updateResult.count} updated, statuses: ${submittedEntries.map(e => e.status).join(",")}`,
    message: test3Pass ? "Status chuyển SUBMITTED đúng" : "Status chuyển sai"
  });
  
  console.log(test3Pass ? "✅ PASS\n" : "❌ FAIL\n");
  
  // ==================== TEST 4: MASTER CHỈ TÍNH APPROVED ====================
  console.log("📝 TEST 4: Master chỉ tính APPROVED");
  
  // Query cumulative chỉ APPROVED
  const cumulativeOnlyApproved = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: {
      templateId: template.id,
      status: "APPROVED"
    },
    _sum: { quantity: true }
  });
  
  // Chưa có APPROVED nào, nên phải rỗng
  const test4aPass = cumulativeOnlyApproved.length === 0;
  
  // Tạo một APPROVED entry
  const approvedEntry = await prisma.fieldProgressEntry.create({
    data: {
      projectId: project.id,
      templateId: template.id,
      itemId: testItems[0].id,
      entryDate: new Date("2026-06-08T00:00:00"),
      quantity: 15,
      status: "APPROVED",
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date()
    }
  });
  
  // Query lại
  const cumulativeAfterApproved = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: {
      templateId: template.id,
      status: "APPROVED"
    },
    _sum: { quantity: true }
  });
  
  const test4bPass = 
    cumulativeAfterApproved.length === 1 &&
    cumulativeAfterApproved[0]._sum.quantity?.toString() === "15";
  
  // Tính tổng theo status
  const allEntries = await prisma.fieldProgressEntry.findMany({
    where: { templateId: template.id }
  });
  
  const totalByStatus = {
    DRAFT: allEntries.filter(e => e.status === "DRAFT").reduce((sum, e) => sum + Number(e.quantity), 0),
    SUBMITTED: allEntries.filter(e => e.status === "SUBMITTED").reduce((sum, e) => sum + Number(e.quantity), 0),
    APPROVED: allEntries.filter(e => e.status === "APPROVED").reduce((sum, e) => sum + Number(e.quantity), 0)
  };
  
  const test4Pass = test4aPass && test4bPass;
  
  results.push({
    testName: "TEST 4: Master chỉ tính APPROVED",
    status: test4Pass ? "PASS" : "FAIL",
    expected: "Cumulative query only returns APPROVED. DRAFT/SUBMITTED excluded.",
    actual: `Total by status: DRAFT=${totalByStatus.DRAFT}, SUBMITTED=${totalByStatus.SUBMITTED}, APPROVED=${totalByStatus.APPROVED}. Cumulative query count: ${cumulativeAfterApproved.length}`,
    message: test4Pass ? "Cumulative logic đúng (chỉ APPROVED)" : "Cumulative logic sai"
  });
  
  console.log(test4Pass ? "✅ PASS\n" : "❌ FAIL\n");
  
  // ==================== TEST 5: SUMMARY 2 CHẾ ĐỘ ====================
  console.log("📝 TEST 5: Summary với 2 chế độ filter");
  
  const fromDate = new Date("2026-06-09T00:00:00");
  const toDate = new Date("2026-06-10T23:59:59");
  
  // Filter APPROVED_ONLY
  const entriesApprovedOnly = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      status: { in: ["APPROVED"] },
      entryDate: { gte: fromDate, lte: toDate }
    }
  });
  
  // Filter ALL (bao gồm DRAFT, SUBMITTED)
  const entriesAll = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      status: { in: ["APPROVED", "DRAFT", "SUBMITTED"] },
      entryDate: { gte: fromDate, lte: toDate }
    }
  });
  
  // Trong range 09-10/06: có 3 SUBMITTED (09/06) + 2 DRAFT (10/06) = 5, nhưng 0 APPROVED
  const test5Pass = 
    entriesApprovedOnly.length === 0 &&
    entriesAll.length === 5;
  
  results.push({
    testName: "TEST 5: Summary với 2 chế độ filter",
    status: test5Pass ? "PASS" : "FAIL",
    expected: "APPROVED_ONLY filter: 0 entries. ALL filter: 5 entries (3 SUBMITTED + 2 DRAFT)",
    actual: `APPROVED_ONLY: ${entriesApprovedOnly.length}, ALL: ${entriesAll.length}`,
    message: test5Pass ? "Filter logic đúng" : "Filter logic sai"
  });
  
  console.log(test5Pass ? "✅ PASS\n" : "❌ FAIL\n");
  
  // ==================== TEST 6: VƯỢT KHỐI LƯỢNG ====================
  console.log("📝 TEST 6: Vượt khối lượng");
  
  // testItems[2] có designQuantity = 20
  const overItem = testItems[2];
  const designQty = Number(overItem.designQuantity);
  
  // Tạo entry vượt (đã có 40 từ ngày 09/06, thêm 5 nữa = 45 > 20)
  // Nhưng 40 là SUBMITTED, nếu chỉ tính APPROVED thì chưa vượt
  // Để test vượt, tạo APPROVED vượt
  await prisma.fieldProgressEntry.create({
    data: {
      projectId: project.id,
      templateId: template.id,
      itemId: overItem.id,
      entryDate: new Date("2026-06-08T00:00:00"),
      quantity: 25, // > 20
      status: "APPROVED",
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date()
    }
  });
  
  // Tính cumulative APPROVED cho item này
  const overItemCumulative = await prisma.fieldProgressEntry.aggregate({
    where: {
      templateId: template.id,
      itemId: overItem.id,
      status: "APPROVED"
    },
    _sum: { quantity: true }
  });
  
  const cumulative = Number(overItemCumulative._sum.quantity || 0);
  const percent = (cumulative / designQty) * 100;
  
  const test6Pass = percent > 100;
  
  results.push({
    testName: "TEST 6: Vượt khối lượng",
    status: test6Pass ? "PASS" : "FAIL",
    expected: "Percent > 100 when cumulative > design quantity",
    actual: `Design: ${designQty}, Cumulative APPROVED: ${cumulative}, Percent: ${percent.toFixed(2)}%`,
    message: test6Pass ? "Logic vượt KL đúng" : "Logic vượt KL sai"
  });
  
  console.log(test6Pass ? "✅ PASS\n" : "❌ FAIL\n");
  
  // ==================== SUMMARY ====================
  console.log("\n=== TEST RESULTS SUMMARY ===\n");
  
  results.forEach(r => {
    console.log(`${r.status === "PASS" ? "✅" : "❌"} ${r.testName}`);
    console.log(`   Expected: ${r.expected}`);
    console.log(`   Actual: ${r.actual}`);
    console.log(`   Message: ${r.message}\n`);
  });
  
  const totalPass = results.filter(r => r.status === "PASS").length;
  const totalFail = results.filter(r => r.status === "FAIL").length;
  const passRate = ((totalPass / results.length) * 100).toFixed(1);
  
  console.log(`📊 Total: ${results.length} tests`);
  console.log(`✅ Pass: ${totalPass}`);
  console.log(`❌ Fail: ${totalFail}`);
  console.log(`📈 Pass Rate: ${passRate}%\n`);
  
  // JSON Output
  console.log("=== JSON OUTPUT FOR REPORT ===");
  const output = {
    projectId: project.id,
    projectCode: project.code,
    templateId: template.id,
    testItemIds: testItems.map(i => i.id),
    testItemCodes: testItems.map(i => i.code),
    results,
    summary: {
      total: results.length,
      pass: totalPass,
      fail: totalFail,
      passRate: `${passRate}%`
    },
    testData: {
      date0906Quantities: [0.1, 22, 40],
      date0906Status: "SUBMITTED",
      date1006Quantities: [5, 10],
      date1006Status: "DRAFT",
      approvedDate0808Quantity: 15,
      overItemDesignQty: 20,
      overItemApprovedQty: 25,
      totalByStatus: totalByStatus
    }
  };
  
  console.log(JSON.stringify(output, null, 2));
  
  console.log("\n✅ Test script completed successfully");
  
  if (totalFail > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ Test script failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
