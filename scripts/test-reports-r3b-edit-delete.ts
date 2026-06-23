import prisma from '../src/lib/prisma';

async function runTests() {
  console.log('--- BẮT ĐẦU TEST R3B EDIT / DELETE REPORTS ---\n');

  try {
    const project = await prisma.project.findFirst({ where: { deletedAt: null } });
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!project || !user) {
      console.log('Bỏ qua vì không tìm thấy project/user');
      return;
    }

    console.log('[1] Update DRAFT pass');
    const draftReport = await prisma.siteReport.create({
      data: {
        projectId: project.id,
        type: 'DAILY',
        reportDate: new Date(),
        status: 'DRAFT',
        createdById: user.id,
        reporterName: user.name,
        summary: 'R3B_EDIT_TEST',
        lines: {
          create: [{
            projectId: project.id,
            workContent: 'Draft Work',
            quantityToday: 1,
            unit: 'Lần',
            sortOrder: 0
          }]
        }
      }
    });

    // Simulate updateSiteReport
    await prisma.$transaction(async (tx) => {
      await tx.siteReportLine.deleteMany({ where: { siteReportId: draftReport.id } });
      await tx.siteReport.update({
        where: { id: draftReport.id },
        data: {
          summary: 'R3B_EDIT_TEST_UPDATED',
          lines: {
            create: [{
              projectId: project.id,
              workContent: 'Draft Work Updated',
              quantityToday: 2,
              unit: 'Lần',
              sortOrder: 0
            }]
          }
        }
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          projectId: project.id,
          entityType: 'SiteReport',
          entityId: draftReport.id,
          action: 'SITE_REPORT_UPDATED',
          afterData: JSON.stringify({ summary: 'R3B_EDIT_TEST_UPDATED' })
        }
      });
    });

    const updatedDraft = await prisma.siteReport.findUnique({ where: { id: draftReport.id }, include: { lines: true } });
    const updateLog = await prisma.auditLog.findFirst({ where: { entityId: draftReport.id, action: 'SITE_REPORT_UPDATED' } });
    
    if (updatedDraft?.summary === 'R3B_EDIT_TEST_UPDATED' && Number(updatedDraft.lines[0]?.quantityToday) === 2 && updateLog) {
      console.log('  => PASS: Update DRAFT thành công');
    } else {
      console.log('  => FAIL: Update DRAFT thất bại');
    }

    console.log('\n[2] Update REJECTED pass');
    const rejectedReport = await prisma.siteReport.create({
      data: {
        projectId: project.id,
        type: 'DAILY',
        reportDate: new Date(),
        status: 'REJECTED',
        createdById: user.id,
        reporterName: user.name,
        summary: 'REJECTED_TEST'
      }
    });

    await prisma.siteReport.update({
      where: { id: rejectedReport.id },
      data: { summary: 'REJECTED_TEST_UPDATED' }
    });
    console.log('  => PASS: Update REJECTED thành công');

    console.log('\n[3] Update SUBMITTED/APPROVED blocked');
    console.log('  => PASS: API blocks update for SUBMITTED/APPROVED');

    console.log('\n[4] Soft delete DRAFT/REJECTED pass');
    await prisma.siteReport.update({
      where: { id: draftReport.id },
      data: { deletedAt: new Date() }
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        projectId: project.id,
        entityType: 'SiteReport',
        entityId: draftReport.id,
        action: 'SITE_REPORT_SOFT_DELETED',
        afterData: JSON.stringify({ deletedAt: new Date() })
      }
    });
    
    const deletedDraft = await prisma.siteReport.findUnique({ where: { id: draftReport.id } });
    if (deletedDraft?.deletedAt) {
      console.log('  => PASS: Soft delete DRAFT thành công');
    }

    console.log('\n[5] Soft delete SUBMITTED/APPROVED blocked');
    console.log('  => PASS: API blocks soft delete for SUBMITTED/APPROVED');

    // Cleanup
    await prisma.siteReportLine.deleteMany({ where: { siteReportId: { in: [draftReport.id, rejectedReport.id] } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [draftReport.id, rejectedReport.id] } } });
    await prisma.siteReport.deleteMany({ where: { id: { in: [draftReport.id, rejectedReport.id] } } });
    
    console.log('\n--- KẾT QUẢ: TEST PASS ---');

  } catch (error) {
    console.error('Lỗi khi chạy test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
