const fs = require('fs');
let s = fs.readFileSync('prisma/schema.prisma', 'utf8');

const newModel = `
model SupervisionInspectionSchedule {
  id                String                      @id @default(cuid())
  projectId         String
  supervisorId      String
  workItemId        String?
  workItemText      String?
  plannedDate       DateTime
  shift             SupervisionShift
  startTime         String?
  endTime           String?
  inspectionContent String
  status            SupervisionInspectionStatus @default(PLANNED)
  linkedVisitId     String?
  createdAt         DateTime                    @default(now())
  updatedAt         DateTime                    @updatedAt
  deletedAt         DateTime?

  project           Project                     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  supervisor        User                        @relation(fields: [supervisorId], references: [id], onDelete: Cascade)
  linkedVisit       SupervisionVisit?           @relation(fields: [linkedVisitId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([supervisorId])
  @@index([plannedDate])
}

enum SupervisionInspectionStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
`;

s += '\n' + newModel;

// Add back reference to SupervisionVisit
s = s.replace('model SupervisionVisit {', 'model SupervisionVisit {\n  SupervisionInspectionSchedule SupervisionInspectionSchedule[]');

fs.writeFileSync('prisma/schema.prisma', s);
