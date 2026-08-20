import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';

async function exportQAFixtures() {
  const { default: prisma } = await import('../src/lib/prisma');

  const fixturesDir = path.resolve('d:/construction-erp-v2/scripts/qa/fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });

  // 1. Fetch exact records
  const template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: project.id, name: { contains: 'Võ Chí Công' } },
  });
  if (!template) throw new Error('AI-01B template not found');

  const items = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id, templateId: template.id },
    orderBy: { sortOrder: 'asc' },
  });

  const reports = await prisma.siteReport.findMany({
    where: { projectId: project.id },
    include: { lines: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { reportDate: 'asc' },
  });

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id, sourceType: 'SITE_REPORT' },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  });

  // 2. Build Manifest
  const manifest = {
    metadata: {
      classification: "SYNTHETIC_QA",
      milestone: "AI-01B",
      projectCode: "CT-2026-0009",
      projectId: project.id,
      createdAt: new Date().toISOString(),
      provenanceStatus: "UNVERIFIED_OPERATIONAL_DATA",
      intendedEnvironment: "ISOLATED_QA_TESTING_ONLY",
      warning: "SYNTHETIC_QA_ONLY - NOT_REAL_CONSTRUCTION_DATA - DO_NOT_LOAD_INTO_BUSINESS_DB"
    },
    counts: {
      templates: 1,
      items: items.length,
      reports: reports.length,
      lines: reports.reduce((acc, r) => acc + r.lines.length, 0),
      entries: entries.length
    },
    exactIds: {
      fieldProgressTemplateIds: [template.id],
      fieldProgressItemIds: items.map(i => i.id),
      siteReportIds: reports.map(r => r.id),
      siteReportLineIds: reports.flatMap(r => r.lines.map(l => l.id)),
      fieldProgressEntryIds: entries.map(e => e.id)
    }
  };

  const manifestFile = path.join(fixturesDir, 'ai01b-synthetic-dataset-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Manifest created: ${manifestFile}`);

  // 3. Build Full QA Fixture (sanitized PII)
  const fullFixture = {
    header: {
      classification: "SYNTHETIC_QA_ONLY",
      notRealConstructionData: true,
      doNotLoadIntoBusinessDb: true,
      milestone: "AI-01B",
      exportedAt: new Date().toISOString(),
      description: "Complete vertical slice fixture for Construction ERP AI Copilot testing: field progress template, items, daily reports with weather/labor/issues, and synchronized approved progress entries."
    },
    projectContext: {
      code: project.code,
      name: project.name,
      displayName: project.displayName,
      targetProjectId: project.id,
      budget: project.budget?.toString(),
      startDate: project.startDate?.toISOString(),
      endDate: project.endDate?.toISOString(),
    },
    template: {
      id: template.id,
      name: template.name,
      status: template.status,
      createdAt: template.createdAt.toISOString(),
    },
    items: items.map(i => ({
      id: i.id,
      code: i.code,
      itemType: i.itemType,
      categoryName: i.categoryName,
      workContent: i.workContent,
      constructionCrew: i.constructionCrew,
      designQuantity: Number(i.designQuantity),
      unit: i.unit,
      note: i.note,
      sortOrder: i.sortOrder,
    })),
    reports: reports.map(r => ({
      id: r.id,
      reportNo: r.reportNo,
      type: r.type,
      reportDate: r.reportDate.toISOString(),
      weatherCondition: r.weatherCondition,
      weatherTemperature: r.weatherTemperature,
      summary: r.summary,
      labor: r.labor,
      materials: r.materials,
      quality: r.quality,
      issues: r.issues,
      recommendations: r.recommendations,
      status: r.status,
      submittedAt: r.submittedAt?.toISOString(),
      approvedAt: r.approvedAt?.toISOString(),
      lines: r.lines.map(l => ({
        id: l.id,
        fieldProgressItemId: l.fieldProgressItemId,
        workContent: l.workContent,
        area: l.area,
        constructionCrew: l.constructionCrew,
        quantityToday: Number(l.quantityToday),
        unit: l.unit,
        designQuantity: Number(l.designQuantity),
        quantityCumulative: Number(l.quantityCumulative),
        progressPercent: Number(l.progressPercent),
        note: l.note,
        sortOrder: l.sortOrder,
      })),
    })),
    entries: entries.map(e => ({
      id: e.id,
      itemId: e.itemId,
      templateId: e.templateId,
      entryDate: e.entryDate.toISOString(),
      quantity: Number(e.quantity),
      sourceType: e.sourceType,
      sourceReportId: e.sourceReportId,
      sourceLineId: e.sourceLineId,
      status: e.status,
      approvedAt: e.approvedAt?.toISOString(),
    })),
  };

  const fixtureFile = path.join(fixturesDir, 'ai01b-construction-vertical-slice.json');
  fs.writeFileSync(fixtureFile, JSON.stringify(fullFixture, null, 2), 'utf-8');
  console.log(`QA Fixture created: ${fixtureFile} (${fs.statSync(fixtureFile).size} bytes)`);

  await prisma['$disconnect']();
}

exportQAFixtures().catch(console.error);
