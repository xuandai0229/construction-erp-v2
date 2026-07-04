const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

const targetStr = `export function DailyEntryTable({
  projectId,
  templateId,
  dateStr,
  projectLabel,
  initialItems,
  export function DailyEntryTable({
  projectId,
  templateId,
  dateStr,
  projectLabel,
  initialItems,
  parentGroups = [],
  userRole,`;

const replacement = `export function DailyEntryTable({
  projectId,
  templateId,
  dateStr,
  projectLabel,
  initialItems,
  parentGroups = [],
  userRole,`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
