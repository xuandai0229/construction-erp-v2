import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = process.argv[2];
if (!workbookPath) {
  throw new Error("Usage: node read-workbook.mjs <workbook.xlsx>");
}

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 20,
  tableMaxCellChars: 160,
});

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 5000 });
const sourceSheet = workbook.worksheets.getItemAt(0);
const usedRange = sourceSheet.getUsedRange(true);
console.log(JSON.stringify({
  summary: summary.ndjson,
  sheets: sheets.ndjson,
  sourceSheet: sourceSheet.name,
  usedAddress: usedRange.address,
  values: usedRange.values,
  formulas: usedRange.formulas,
}, null, 2));
