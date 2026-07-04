const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

const targetStr = `export function DailyEntryTable({
  projectId,
  templateId,
  dateStr,
  projectLabel,
  initialItems,
  parentGroups = [],
}: {
  projectId: string;
  templateId: string;
  dateStr: string;
  projectLabel: string;
  initialItems: any[];
  parentGroups?: any[];
}) {`;

const replacement = `export function DailyEntryTable({
  projectId,
  templateId,
  dateStr,
  projectLabel,
  initialItems,
  parentGroups = [],
  userRole,
}: {
  projectId: string;
  templateId: string;
  dateStr: string;
  projectLabel: string;
  initialItems: any[];
  parentGroups?: any[];
  userRole?: string;
}) {`;

content = content.replace(targetStr, replacement);
// If it fails because of newline types
if (!content.includes('userRole?: string')) {
    content = content.replace(/parentGroups \= \[\]\,[\s\S]*?\}: \{[\s\S]*?parentGroups\?\: any\[\];[\s\S]*?\}\) \{/g, replacement);
}

fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
