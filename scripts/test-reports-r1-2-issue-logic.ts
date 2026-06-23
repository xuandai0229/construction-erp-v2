import prisma from "../src/lib/prisma";

async function runTests() {
  console.log("=== R1.2 TEST: ISSUE LOGIC VERIFICATION ===");

  try {
    const reports = await prisma.siteReport.findMany({
      where: { deletedAt: null },
      include: { lines: true }
    });

    const totalCount = reports.length;
    console.log(`[Test] Total active reports: Expected 16, Actual: ${totalCount} => ${totalCount === 16 ? 'PASS' : 'FAIL'}`);
    if (totalCount !== 16) throw new Error("Failed Total count");

    let issuesCount = 0;
    let severeCount = 0;
    let noteCount = 0;

    const severeKeywords = ['nguy hiểm', 'tai nạn', 'dừng thi công', 'chậm tiến độ', 'vượt khối lượng', 'vượt ngân sách', 'không đạt', 'sai kỹ thuật', 'thiếu vật tư', 'mưa lớn', 'sạt lở', 'an toàn'];

    for (const r of reports) {
      const rawIssues = (r.issues || '').trim();
      const isIssueValid = rawIssues.length > 0 && !rawIssues.toLowerCase().startsWith('không có') && !rawIssues.toLowerCase().startsWith('không');
      const hasIssueNote = r.lines.some(l => (l.issueNote || '').trim().length > 0);
      
      const hasNote = r.lines.some(l => (l.note || '').trim().length > 0 || (l.proposalNote || '').trim().length > 0);
      const hasSummary = (r.summary || '').trim().length > 0 && r.summary !== "No content";
      const hasRecommendations = (r.recommendations || '').trim().length > 0 && !((r.recommendations || '').toLowerCase().startsWith('tiếp tục'));

      const combinedText = [(r.issues || ''), r.lines.map(l => l.issueNote || '').join(' ')].join(' ').toLowerCase();
      const isSevereIssue = severeKeywords.some(kw => combinedText.includes(kw));

      if (isSevereIssue) severeCount++;
      else if (isIssueValid || hasIssueNote) issuesCount++;
      else if (hasNote || hasSummary || hasRecommendations) noteCount++;
    }

    console.log(`[Test] Reports with issues (Có phát sinh): ${issuesCount}`);
    console.log(`[Test] Reports with severe issues (Vấn đề nghiêm trọng): ${severeCount}`);
    console.log(`[Test] Reports with notes (Có ghi chú): ${noteCount}`);

    if (issuesCount === 16) {
      console.log(`[Warning] Issues count is still 16. This means all DB records actually have real issues or test failed.`);
      throw new Error("Failed Issues count cannot be 16 if 'Không có...' is excluded");
    } else {
      console.log(`[Test] Issues count is ${issuesCount} < 16 => PASS`);
    }

    // Now test the prisma query logic for 'issues' tab
    const issuesTabReports = await prisma.siteReport.count({
      where: {
        deletedAt: null,
        AND: [
          {
            OR: [
              {
                AND: [
                  { issues: { not: null, notIn: ["", " "] } },
                  { NOT: { issues: { startsWith: "Không có" } } },
                  { NOT: { issues: { startsWith: "không có" } } },
                ]
              },
              {
                lines: {
                  some: {
                    issueNote: { not: null, notIn: ["", " "] }
                  }
                }
              }
            ]
          }
        ]
      }
    });

    console.log(`[Test] Issues Tab DB query count: ${issuesTabReports} => ${issuesTabReports === issuesCount ? 'PASS' : 'FAIL (mismatch with JS logic)'}`);
    if (issuesTabReports !== issuesCount) throw new Error("Issues Tab DB query count mismatch");

    console.log("\nALL TESTS PASSED SUCCESSFULLY! R1.2 Issue Logic verified.");

  } catch (error) {
    console.error("\nTEST FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
