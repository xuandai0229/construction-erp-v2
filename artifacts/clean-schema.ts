import fs from 'fs';

const schemaPath = 'prisma/schema.prisma';
const content = fs.readFileSync(schemaPath, 'utf-8');
const lines = content.split('\n');

const newLines: string[] = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Start skipping at line 1892 "// Safety inspection module..."
  if (line.includes('// Safety inspection module (ATLĐ, PCCC, VSMT)')) {
    skip = true;
    continue;
  }

  if (skip) {
    continue;
  }

  // Skip relations on User
  if (line.trim().startsWith('safetyPlansCreated') ||
      line.trim().startsWith('safetyPlansApproved') ||
      line.trim().startsWith('safetyPlanProjectsAdded') ||
      line.trim().startsWith('safetyScheduleCollaborations') ||
      line.trim().startsWith('safetySessionsInspected') ||
      line.trim().startsWith('safetyChecklistTemplatesCreated') ||
      line.trim().startsWith('safetyResultsInspected') ||
      line.trim().startsWith('safetyFindingsCreated') ||
      line.trim().startsWith('safetyFindingsResponsible') ||
      line.trim().startsWith('safetyCorrectiveActionsCreated') ||
      line.trim().startsWith('safetyCorrectiveActionsAssigned') ||
      line.trim().startsWith('safetyCorrectiveActionsSubmitted') ||
      line.trim().startsWith('safetyEvidenceUploaded') ||
      line.trim().startsWith('safetyEvidenceCancelled') ||
      line.trim().startsWith('safetyReinspectionsPerformed') ||
      line.trim().startsWith('safetyWeeklyReportsCreated') ||
      line.trim().startsWith('safetyWeeklyReportsApproved') ||
      line.trim().startsWith('safetyWeeklyNarrativesEdited') ||
      line.trim().startsWith('safetyWeeklyEntriesCancelled') ||
      line.trim().startsWith('safetyDocumentTemplatesCreated') ||
      line.trim().startsWith('safetyDocumentTemplatesApproved') ||
      line.trim().startsWith('safetyApprovalHistoryActions') ||
      line.trim().startsWith('safetyAuditLogActions') ||
      line.trim().startsWith('safetyIdempotencyMutations')) {
    continue;
  }

  // Skip relations on Project
  if (line.trim().startsWith('safetyPlanProjects') ||
      line.trim().startsWith('safetySchedules') ||
      line.trim().startsWith('safetySessions') ||
      line.trim().startsWith('safetyInspectionResults') ||
      line.trim().startsWith('safetyFindings') ||
      line.trim().startsWith('safetyCorrectiveActions') ||
      line.trim().startsWith('safetyCorrectiveEvidence') ||
      line.trim().startsWith('safetyReinspections') ||
      line.trim().startsWith('safetyWeeklyReportProjects') ||
      line.trim().startsWith('safetyWeeklyReportEntries') ||
      line.trim().startsWith('safetyApprovalHistories') ||
      line.trim().startsWith('safetyAuditLogs')) {
    continue;
  }

  // Skip relations on Document
  if (line.trim().startsWith('safetyEvidence') || line.trim().startsWith('safetyTemplates')) {
    continue;
  }

  // Skip relation on ApprovalRequest
  if (line.trim().startsWith('safetyHistories')) {
    continue;
  }

  newLines.push(line);
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Successfully cleaned prisma/schema.prisma');
