import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("D:/ZaloData/CÁC CT CÁC BAN.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 7000,
  tableMaxRows: 8,
  tableMaxCols: 15,
  tableMaxCellChars: 120,
});
const rows = await workbook.inspect({
  kind: "region",
  sheetId: "2HN và PTN (3)",
  range: "A1:O91",
  maxChars: 30000,
  tableMaxRows: 91,
  tableMaxCols: 15,
  tableMaxCellChars: 180,
});
const preview = await workbook.render({
  sheetName: "2HN và PTN (3)",
  range: "A1:O91",
  scale: 0.8,
  format: "png",
});
await fs.writeFile("D:/construction-erp-v2/scratch/site-commander-final/workbook-preview.png", new Uint8Array(await preview.arrayBuffer()));
console.log(overview.ndjson);
console.log(rows.ndjson);
