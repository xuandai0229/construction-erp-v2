const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

const regex = /export function DailyEntryTable\(\{[\s\S]*?\}\) \{/;
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

let match = content.match(/export function DailyEntryTable[\s\S]*?const router = useRouter\(\);/);
if (match) {
    let replacedBlock = replacement + "\n  const router = useRouter();";
    content = content.replace(match[0], replacedBlock);
    fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
    console.log("Fixed successfully.");
} else {
    console.log("Could not find the block");
}
