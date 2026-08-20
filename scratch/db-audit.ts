import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function audit() {
  const models: [string, any][] = [
    ['Project', prisma.project],
    ['ProjectMember', prisma.projectMember],
    ['WBSItem', prisma.wBSItem],
    ['DocumentFolder', prisma.documentFolder],
    ['Document', prisma.document],
    ['SiteReport', prisma.siteReport],
    ['SiteReportLine', prisma.siteReportLine],
    ['SiteReportPhoto', prisma.siteReportPhoto],
    ['SiteReportAttachment', prisma.siteReportAttachment],
    ['MaterialItem', prisma.materialItem],
    ['MaterialProposal', prisma.materialProposal],
    ['MaterialProposalItem', prisma.materialProposalItem],
    ['MaterialProposalApproval', prisma.materialProposalApproval],
    ['MaterialMovement', prisma.materialMovement],
    ['ProjectMaterialStock', prisma.projectMaterialStock],
    ['ApprovalRequest', prisma.approvalRequest],
    ['Notification', prisma.notification],
    ['AuditLog', prisma.auditLog],
    ['FieldProgressTemplate', prisma.fieldProgressTemplate],
    ['FieldProgressItem', prisma.fieldProgressItem],
    ['FieldProgressEntry', prisma.fieldProgressEntry],
    ['FieldMaterialRequest', prisma.fieldMaterialRequest],
    ['FieldMaterialRequestItem', prisma.fieldMaterialRequestItem],
    ['ProjectLocationNode', prisma.projectLocationNode],
    ['FieldProgressItemAssignment', prisma.fieldProgressItemAssignment],
    ['FieldProgressItemLocation', prisma.fieldProgressItemLocation],
    ['SupervisionWeeklyDossier', prisma.supervisionWeeklyDossier],
    ['SupervisionWeeklyEntry', prisma.supervisionWeeklyEntry],
    ['SupervisionWeeklyQuantity', prisma.supervisionWeeklyQuantity],
    ['SupervisionWeeklyTransition', prisma.supervisionWeeklyTransition],
    ['SupervisionWeeklyProgress', prisma.supervisionWeeklyProgress],
    ['SupervisionWeeklyObservation', prisma.supervisionWeeklyObservation],
    ['SupervisionFinding', prisma.supervisionFinding],
    ['SupervisionWeeklyPackage', prisma.supervisionWeeklyPackage],
    ['SupervisionVisit', prisma.supervisionVisit],
    ['SupervisionPlanItem', prisma.supervisionPlanItem],
    ['SupervisionProgressAssessment', prisma.supervisionProgressAssessment],
    ['SupervisionInspectionSchedule', prisma.supervisionInspectionSchedule],
    ['SafetyReportPlan', prisma.safetyReportPlan],
    ['SafetyReportPlanEntry', prisma.safetyReportPlanEntry],
    ['SafetySelfAssessmentReport', prisma.safetySelfAssessmentReport],
    ['SafetySelfAssessmentEntry', prisma.safetySelfAssessmentEntry],
    ['SafetyWeeklyFile', prisma.safetyWeeklyFile],
    ['SafetyReportApprovalHistory', prisma.safetyReportApprovalHistory],
    ['SafetyReportAuditLog', prisma.safetyReportAuditLog],
    ['User', prisma.user],
    ['Employee', prisma.employee],
    ['OrganizationUnit', prisma.organizationUnit],
    ['Position', prisma.position],
    ['EmployeeOrganizationAssignment', prisma.employeeOrganizationAssignment],
    ['EmployeeProjectAssignment', prisma.employeeProjectAssignment],
    ['UserAccessGrant', prisma.userAccessGrant],
    ['SystemSetting', prisma.systemSetting],
    ['ChatMessage', prisma.chatMessage],
  ];

  console.log('=== COMPLETE BUSINESS DATA INVENTORY ===');
  for (const [name, model] of models) {
    try {
      const count = await model.count();
      console.log(`${name}: ${count}`);
    } catch(e: any) {
      console.log(`${name}: ERROR - ${e.message?.slice(0,80)}`);
    }
  }

  console.log('\n=== PROJECTS WITH FIELD PROGRESS DATA ===');
  const projectsWithTemplates = await prisma.fieldProgressTemplate.groupBy({
    by: ['projectId'],
    _count: true,
  });
  console.log(`Projects with templates: ${projectsWithTemplates.length}`);
  for (const p of projectsWithTemplates) {
    const proj = await prisma.project.findUnique({ where: { id: p.projectId }, select: { code: true, name: true } });
    const items = await prisma.fieldProgressItem.count({ where: { projectId: p.projectId, deletedAt: null } });
    const entries = await prisma.fieldProgressEntry.count({ where: { projectId: p.projectId, deletedAt: null } });
    const approved = await prisma.fieldProgressEntry.count({ where: { projectId: p.projectId, deletedAt: null, status: 'APPROVED' } });
    console.log(`  ${proj?.code} | templates=${p._count} items=${items} entries=${entries} approved=${approved}`);
  }

  console.log('\n=== PROJECTS WITH SITE REPORTS ===');
  const projectsWithReports = await prisma.siteReport.groupBy({
    by: ['projectId'],
    _count: true,
  });
  console.log(`Projects with reports: ${projectsWithReports.length}`);
  for (const p of projectsWithReports) {
    const proj = await prisma.project.findUnique({ where: { id: p.projectId }, select: { code: true, name: true } });
    const lines = await prisma.siteReportLine.count({ where: { projectId: p.projectId } });
    console.log(`  ${proj?.code} | reports=${p._count} lines=${lines}`);
  }

  console.log('\n=== PROJECTS WITH MATERIALS ===');
  const projectsWithMaterials = await prisma.materialItem.groupBy({
    by: ['projectId'],
    _count: true,
  });
  console.log(`Projects with material items: ${projectsWithMaterials.length}`);
  for (const p of projectsWithMaterials) {
    const proj = await prisma.project.findUnique({ where: { id: p.projectId }, select: { code: true, name: true } });
    const stock = await prisma.projectMaterialStock.count({ where: { projectId: p.projectId } });
    const movement = await prisma.materialMovement.count({ where: { projectId: p.projectId } });
    const proposals = await prisma.materialProposal.count({ where: { projectId: p.projectId } });
    console.log(`  ${proj?.code} | items=${p._count} stock=${stock} movements=${movement} proposals=${proposals}`);
  }

  console.log('\n=== APPROVAL REQUESTS BY STATUS ===');
  const approvalsByStatus = await prisma.approvalRequest.groupBy({ by: ['status'], _count: true });
  for (const a of approvalsByStatus) console.log(`  ${a.status}: ${a._count}`);

  console.log('\n=== APPROVAL REQUESTS BY TYPE ===');
  const approvalsByType = await prisma.approvalRequest.groupBy({ by: ['type'], _count: true });
  for (const a of approvalsByType) console.log(`  ${a.type}: ${a._count}`);

  console.log('\n=== SAFETY MODULE DATA ===');
  const safetyPlansByStatus = await prisma.safetyReportPlan.groupBy({ by: ['status'], _count: true });
  for (const s of safetyPlansByStatus) console.log(`  SafetyReportPlan ${s.status}: ${s._count}`);
  const safetyAssessmentsByStatus = await prisma.safetySelfAssessmentReport.groupBy({ by: ['status'], _count: true });
  for (const s of safetyAssessmentsByStatus) console.log(`  SafetyAssessment ${s.status}: ${s._count}`);

  console.log('\n=== SUPERVISION LEGACY DATA ===');
  const legacyPackages = await prisma.supervisionWeeklyPackage.groupBy({ by: ['status'], _count: true });
  for (const s of legacyPackages) console.log(`  LegacyPackage ${s.status}: ${s._count}`);

  console.log('\n=== SUPERVISION WEEKLY DOSSIER DATA ===');
  const dossiersByStatus = await prisma.supervisionWeeklyDossier.groupBy({ by: ['status'], _count: true });
  for (const s of dossiersByStatus) console.log(`  Dossier ${s.status}: ${s._count}`);

  console.log('\n=== PROJECT STATUS DISTRIBUTION ===');
  const projectsByStatus = await prisma.project.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } });
  for (const p of projectsByStatus) console.log(`  ${p.status}: ${p._count}`);

  console.log('\n=== PROJECTS WITH END DATE ===');
  const now = new Date();
  const projectsWithEndDate = await prisma.project.findMany({
    where: { deletedAt: null, endDate: { not: null } },
    select: { code: true, name: true, status: true, startDate: true, endDate: true },
    orderBy: { endDate: 'asc' },
  });
  for (const p of projectsWithEndDate) {
    const days = p.endDate ? Math.ceil((p.endDate.getTime() - now.getTime()) / 86400000) : null;
    console.log(`  ${p.code} | status=${p.status} | endDate=${p.endDate?.toISOString().slice(0,10)} | daysRemaining=${days}`);
  }

  console.log('\n=== LOCATION NODES ===');
  const locationsByProject = await prisma.projectLocationNode.groupBy({ by: ['projectId'], _count: true, where: { deletedAt: null } });
  for (const l of locationsByProject) {
    const proj = await prisma.project.findUnique({ where: { id: l.projectId }, select: { code: true } });
    console.log(`  ${proj?.code}: ${l._count} nodes`);
  }

  console.log('\n=== NOTIFICATIONS ===');
  const notifCount = await prisma.notification.count();
  const unread = await prisma.notification.count({ where: { isRead: false } });
  console.log(`  Total: ${notifCount}, Unread: ${unread}`);

  console.log('\n=== DOCUMENT FOLDERS ===');
  const folders = await prisma.documentFolder.groupBy({ by: ['projectId'], _count: true });
  for (const f of folders) {
    const proj = await prisma.project.findUnique({ where: { id: f.projectId }, select: { code: true } });
    const docs = await prisma.document.count({ where: { projectId: f.projectId, deletedAt: null } });
    console.log(`  ${proj?.code}: ${f._count} folders, ${docs} documents`);
  }

  // Field material requests
  console.log('\n=== FIELD MATERIAL REQUESTS ===');
  const fmr = await prisma.fieldMaterialRequest.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } });
  for (const f of fmr) console.log(`  ${f.status}: ${f._count}`);

  // Material proposals by status
  console.log('\n=== MATERIAL PROPOSALS BY STATUS ===');
  const mpStatus = await prisma.materialProposal.groupBy({ by: ['status'], _count: true });
  for (const m of mpStatus) console.log(`  ${m.status}: ${m._count}`);

  await prisma.$disconnect();
  await pool.end();
}

audit().catch(console.error);
