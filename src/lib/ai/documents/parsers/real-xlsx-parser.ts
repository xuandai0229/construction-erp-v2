/**
 * REAL XLSX BYTE PARSER & SHEET EXTRACTOR
 * Extracts structured chunks directly from real binary XLSX bytes (Buffer) using ExcelJS.
 */

import { DocumentChunk, DocumentIntelligenceStatus, DocumentAuthorityLevel } from '../document-brain-contracts';
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';

export interface RealXlsxParseInput {
  buffer: Buffer;
  documentId: string;
  documentFamilyId?: string;
  projectId: string;
  projectCode?: string;
  title: string;
  version: number;
  status: DocumentIntelligenceStatus;
  authorityLevel: DocumentAuthorityLevel;
  supersedesDocId?: string | null;
  supersededByDocId?: string | null;
  isLatestApprovedInFamily?: boolean;
  effectiveDate?: string | null;
  asOf?: string;
}

export interface RealXlsxParseResult {
  documentId: string;
  sheetCount: number;
  sheetNames: string[];
  totalRows: number;
  fileHash: string;
  chunks: DocumentChunk[];
  extractionQuality: "HIGH" | "MEDIUM";
}

/**
 * Helper to safely extract cell text value from ExcelJS cell.
 */
function getCellText(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    // Formula result or rich text
    const obj = cell.value as any;
    if (obj.result !== undefined) return String(obj.result);
    if (obj.richText && Array.isArray(obj.richText)) {
      return obj.richText.map((rt: any) => rt.text).join('');
    }
    if (obj.text !== undefined) return String(obj.text);
    return JSON.stringify(obj);
  }
  return String(cell.value).trim();
}

/**
 * Parses raw XLSX buffer into structured table chunks with exact Sheet + Cell Range coordinates.
 */
export async function parseRealXlsxBuffer(input: RealXlsxParseInput): Promise<RealXlsxParseResult> {
  const fileHash = createHash('sha256').update(input.buffer).digest('hex');
  const asOf = input.asOf || new Date().toISOString();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input.buffer as any);

  const chunks: DocumentChunk[] = [];
  const sheetNames: string[] = [];
  let totalRows = 0;

  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    sheetNames.push(sheetName);

    const rows: string[] = [];
    let headerRowText = "";
    let minRow = 999999;
    let maxRow = 0;
    let minCol = 999999;
    let maxCol = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      totalRows++;
      const cellValues: string[] = [];
      
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const text = getCellText(cell);
        cellValues.push(text);
        if (text) {
          minRow = Math.min(minRow, rowNumber);
          maxRow = Math.max(maxRow, rowNumber);
          minCol = Math.min(minCol, colNumber);
          maxCol = Math.max(maxCol, colNumber);
        }
      });

      const formattedLine = cellValues.join(" | ").trim();
      if (formattedLine) {
        if (!headerRowText && rowNumber <= 3) {
          headerRowText = formattedLine;
        }
        rows.push(`Dòng ${rowNumber}: ${formattedLine}`);
      }
    });

    if (rows.length === 0) return;

    // Group rows into chunks of 15 rows each
    const CHUNK_SIZE = 15;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunkRows = rows.slice(i, i + CHUNK_SIZE);
      const startRowNum = i + 1;
      const endRowNum = Math.min(rows.length, i + CHUNK_SIZE);
      const cellRange = `${sheetName}!R${startRowNum}:R${endRowNum}`;
      
      const chunkText = `[Sheet: ${sheetName}] (Phạm vi: ${cellRange})\n` +
        (headerRowText ? `[Tiêu đề cột]: ${headerRowText}\n` : "") +
        chunkRows.join("\n");

      const textHash = createHash("sha256").update(chunkText).digest("hex").slice(0, 16);
      const chunkId = `chk_${input.documentId}_${sheetName}_${Math.floor(i / CHUNK_SIZE) + 1}`;

      chunks.push({
        chunkId,
        documentId: input.documentId,
        documentFamilyId: input.documentFamilyId,
        projectId: input.projectId,
        projectCode: input.projectCode,
        documentTitle: input.title,
        documentVersion: input.version,
        pageNumber: null,
        sheetName,
        cellRange,
        clauseReference: `Sheet ${sheetName}`,
        sectionTitle: `Bảng biểu ${sheetName}`,
        chunkType: "TABLE",
        text: chunkText,
        textHash,
        status: input.status,
        authorityLevel: input.authorityLevel,
        supersedesDocId: input.supersedesDocId,
        supersededByDocId: input.supersededByDocId,
        isLatestApprovedInFamily: input.isLatestApprovedInFamily,
        effectiveDate: input.effectiveDate,
        extractionQuality: "HIGH",
        ocrUsed: false,
        asOf,
      });
    }
  });

  return {
    documentId: input.documentId,
    sheetCount: sheetNames.length,
    sheetNames,
    totalRows,
    fileHash,
    chunks,
    extractionQuality: "HIGH",
  };
}
