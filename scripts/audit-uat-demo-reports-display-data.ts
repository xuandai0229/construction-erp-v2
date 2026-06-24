import prisma from '../src/lib/prisma';

async function main() {
  console.log('=== AUDIT UAT DEMO REPORTS DISPLAY DATA ===\n');

  const uatProject = await prisma.project.findUnique({ where: { code: 'UAT-DEMO-001' } });
  if (!uatProject) {
    console.error('UAT-DEMO-001 project not found.');
    return;
  }

  const pid = uatProject.id;

  console.log('## 4.1. Daily reports\n');
  console.log('| Report No | Date | Status | Line count | Work name | Unit | Quantity | Issue |');
  console.log('| --------- | ---- | ------ | ---------: | --------- | ---- | -------: | ----- |');

  const dailyReports = await prisma.siteReport.findMany({
    where: { projectId: pid, type: 'DAILY' },
    include: { lines: true },
    orderBy: { reportDate: 'asc' }
  });

  for (const r of dailyReports) {
    const lines = r.lines;
    if (lines.length === 0) {
      console.log(`| ${r.reportNo} | ${r.reportDate.toISOString().split('T')[0]} | ${r.status} | 0 | - | - | 0 | No lines |`);
    } else {
      for (const line of lines) {
        let issue = '';
        if (line.unit === 'n/a' || !line.unit) issue = 'Unit missing/na';
        if (Number(line.quantityToday) <= 0) issue += (issue ? ', ' : '') + 'Qty <= 0';
        
        console.log(`| ${r.reportNo} | ${r.reportDate.toISOString().split('T')[0]} | ${r.status} | ${lines.length} | ${line.workContent?.substring(0, 20)}... | ${line.unit} | ${line.quantityToday} | ${issue || 'OK'} |`);
      }
    }
  }

  console.log('\n## 4.2. Weekly report\n');
  console.log('| Report No | Date | Status | Summary | Line count | Issue |');
  console.log('| --------- | ---- | ------ | ------- | ---------: | ----- |');

  const weeklyReports = await prisma.siteReport.findMany({
    where: { projectId: pid, type: 'WEEKLY' },
    include: { lines: true }
  });

  for (const r of weeklyReports) {
    let issue = '';
    if (r.lines.length === 0) issue = 'SOURCE_LINKAGE_NOT_IMPLEMENTED (No lines)';
    console.log(`| ${r.reportNo} | ${r.reportDate.toISOString().split('T')[0]} | ${r.status} | ${r.summary?.substring(0, 30)}... | ${r.lines.length} | ${issue || 'OK'} |`);
  }

  console.log('\n## 4.3. Attachment\n');
  
  let totalAttachments = 0;
  for (const r of [...dailyReports, ...weeklyReports]) {
    const attachCount = await prisma.siteReportAttachment.count({ where: { reportId: r.id } });
    totalAttachments += attachCount;
  }

  if (totalAttachments === 0) {
    console.log('REPORT_ATTACHMENT_NOT_TESTED_IN_DEMO_DATA (0 attachments found).');
  } else {
    console.log(`Found ${totalAttachments} attachments in demo data.`);
  }

  console.log('\n[!] Audit complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
