import prisma from "../src/lib/prisma";

async function run() {
  console.log("=== R1.2: REPORTS ISSUE LOGIC AUDIT ===");

  const reports = await prisma.siteReport.findMany({
    where: { deletedAt: null },
    include: {
      lines: true,
      attachments: true
    },
    orderBy: { reportDate: 'asc' }
  });

  console.log("reportNo | type | status | reportDate | summary | issues | recommendations | lineCount | linesWithNote | linesWithIssueNote | linesWithProposalNote | hasAttachment | currentHasIssue");
  
  for (const r of reports) {
    const linesWithNote = r.lines.filter(l => l.note && l.note.trim() !== "").length;
    const linesWithIssueNote = r.lines.filter(l => l.issueNote && l.issueNote.trim() !== "").length;
    const linesWithProposalNote = r.lines.filter(l => l.proposalNote && l.proposalNote.trim() !== "").length;
    
    const summary = r.summary ? r.summary.replace(/\n/g, " ").substring(0, 20) + "..." : "null";
    const issues = r.issues ? r.issues.replace(/\n/g, " ").substring(0, 20) + "..." : "null";
    const recommendations = r.recommendations ? r.recommendations.replace(/\n/g, " ").substring(0, 20) + "..." : "null";
    const reportDate = r.reportDate.toISOString().split('T')[0];
    const hasAttachment = r.attachments.length > 0;
    
    // Check old logic: why was it 16? Maybe it just checked if r.issues is truthy?
    // Wait, old logic in page.tsx: `hasIssues: !!r.issues && r.issues.trim() !== ''`
    // Let's print exactly what it is.
    const currentHasIssue = !!r.issues && r.issues.trim() !== "";

    console.log(`${r.reportNo} | ${r.type} | ${r.status} | ${reportDate} | ${summary} | ${issues} | ${recommendations} | ${r.lines.length} | ${linesWithNote} | ${linesWithIssueNote} | ${linesWithProposalNote} | ${hasAttachment} | ${currentHasIssue}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
