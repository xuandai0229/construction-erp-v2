const fs = require('fs');
let pulled = fs.readFileSync('scratch/pulled_schema.prisma', 'utf8');
let original = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Extract all enums that contain 'Supervision'
let supervisionEnums = [];
const enumRegex = /enum Supervision[A-Za-z0-9_]+ \{[\s\S]*?\}/g;
let match;
while ((match = enumRegex.exec(pulled)) !== null) {
  supervisionEnums.push(match[0]);
}

// Extract all models that contain 'Supervision'
let supervisionModels = [];
const modelRegex = /model Supervision[A-Za-z0-9_]+ \{[\s\S]*?\}/g;
while ((match = modelRegex.exec(pulled)) !== null) {
  supervisionModels.push(match[0]);
}

let newContent = original + '\n\n' + supervisionEnums.join('\n\n') + '\n\n' + supervisionModels.join('\n\n');

newContent += '\n\nmodel SupervisionInspectionSchedule {\n  id                String                      @id @default(cuid())\n  projectId         String\n  supervisorId      String\n  workItemId        String?\n  workItemText      String?\n  plannedDate       DateTime\n  shift             SupervisionShift\n  startTime         String?\n  endTime           String?\n  inspectionContent String\n  status            SupervisionInspectionStatus @default(PLANNED)\n  linkedVisitId     String?\n  createdAt         DateTime                    @default(now())\n  updatedAt         DateTime                    @updatedAt\n  deletedAt         DateTime?\n\n  project           Project                     @relation(fields: [projectId], references: [id], onDelete: Cascade)\n  supervisor        User                        @relation(fields: [supervisorId], references: [id], onDelete: Cascade)\n  linkedVisit       SupervisionVisit?           @relation(fields: [linkedVisitId], references: [id], onDelete: SetNull)\n\n  @@index([projectId])\n  @@index([supervisorId])\n  @@index([plannedDate])\n}\n\nenum SupervisionInspectionStatus {\n  PLANNED\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED\n}\n';

// Add the back-relation to SupervisionVisit
newContent = newContent.replace('model SupervisionVisit {', 'model SupervisionVisit {\n  SupervisionInspectionSchedule SupervisionInspectionSchedule[]');

fs.writeFileSync('prisma/schema.prisma', newContent);
