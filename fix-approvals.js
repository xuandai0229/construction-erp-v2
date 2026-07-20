const fs = require('fs');
let s = fs.readFileSync('src/app/(dashboard)/approvals/actions.ts', 'utf8');

const regex = /await prisma\.approvalRequest\.create\(\{[\s\S]*?\}\);/;
const replacement = `await prisma.approvalRequest.create({
    data: {
      code,
      projectId,
      sourceType: sourceType,
      sourceId: sourceId,
      title,
      description: normalizeOptionalText(data.description),
      type,
      priority,
      dueDate: parsedDueDate,
      requesterId: session.id,
      status: "PENDING"
    },
  });`;

s = s.replace(regex, replacement);
fs.writeFileSync('src/app/(dashboard)/approvals/actions.ts', s);
