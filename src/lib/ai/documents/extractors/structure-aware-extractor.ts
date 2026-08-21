/**
 * STRUCTURE-AWARE DOCUMENT EXTRACTOR & CHUNKER
 * Preserves construction document hierarchies (Articles, Clauses, Tables, Pages, Sheets)
 */

import { DocumentChunk, DocumentIntelligenceStatus, DocumentAuthorityLevel, ChunkContentType } from '../document-brain-contracts';
import { createHash } from 'node:crypto';

export interface RawDocumentInput {
  documentId: string;
  documentFamilyId?: string; // Family Lineage ID (e.g., "FAM-HD-CT009")
  projectId: string;
  projectCode?: string;
  title: string;
  mimeType: string;
  version: number;
  status: DocumentIntelligenceStatus;
  authorityLevel: DocumentAuthorityLevel;
  supersedesDocId?: string | null;
  supersededByDocId?: string | null;
  isLatestApprovedInFamily?: boolean;
  effectiveDate?: string | null;
  content: string; // Raw text or structured markdown/JSON
  isScanned?: boolean;
  ocrConfidence?: number;
  asOf?: string;
}

/**
 * Extracts structured chunks from a contract or legal document text,
 * recognizing Vietnamese construction contract patterns (Điều, Khoản, Điểm, Phụ lục).
 */
export function extractContractStructure(input: RawDocumentInput): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const lines = input.content.split(/\r?\n/);
  const asOf = input.asOf || new Date().toISOString();

  let currentClause = "PHẦN_MỞ_ĐẦU";
  let currentSection = "Thông tin chung hợp đồng";
  let currentPage = 1;
  let buffer: string[] = [];

  const flushBuffer = (type: ChunkContentType = "PARAGRAPH") => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n").trim();
    if (!text) return;

    const textHash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    const chunkId = `chk_${input.documentId}_${chunks.length + 1}`;

    chunks.push({
      chunkId,
      documentId: input.documentId,
      documentFamilyId: input.documentFamilyId,
      projectId: input.projectId,
      projectCode: input.projectCode,
      documentTitle: input.title,
      documentVersion: input.version,
      pageNumber: currentPage,
      clauseReference: currentClause,
      sectionTitle: currentSection,
      chunkType: type,
      text,
      textHash,
      status: input.status,
      authorityLevel: input.authorityLevel,
      supersedesDocId: input.supersedesDocId,
      supersededByDocId: input.supersededByDocId,
      isLatestApprovedInFamily: input.isLatestApprovedInFamily,
      effectiveDate: input.effectiveDate,
      extractionQuality: input.isScanned ? (input.ocrConfidence && input.ocrConfidence < 0.7 ? "OCR_LOW_CONFIDENCE" : "MEDIUM") : "HIGH",
      ocrUsed: input.isScanned || false,
      ocrConfidence: input.ocrConfidence,
      asOf,
    });

    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Check page indicator
    const pageMatch = trimmed.match(/^\[(?:Trang|Page)\s*(\d+)\]/i);
    if (pageMatch) {
      flushBuffer();
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Check Article/Clause header (Điều 1, Điều 2...)
    const clauseMatch = trimmed.match(/^(?:Điều|ĐIỀU)\s*(\d+[\.\d]*)\s*[:.\-–]?\s*(.*)/i);
    if (clauseMatch) {
      flushBuffer("CLAUSE");
      currentClause = `Điều ${clauseMatch[1]}`;
      currentSection = clauseMatch[2] || currentSection;
      buffer.push(trimmed);
      continue;
    }

    // Check Section header (Mục, Chương, Phần)
    const sectionMatch = trimmed.match(/^(?:Chương|CHƯƠNG|Mục|MỤC|Phần|PHẦN)\s*([IVXLCDM\d]+)\s*[:.\-–]?\s*(.*)/i);
    if (sectionMatch) {
      flushBuffer("HEADING");
      currentSection = trimmed;
      buffer.push(trimmed);
      continue;
    }

    // Check Table line
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      buffer.push(trimmed);
      continue;
    }

    // Paragraph accumulation
    if (trimmed === "") {
      if (buffer.length > 0) {
        const isTable = buffer.every(l => l.trim().startsWith("|"));
        flushBuffer(isTable ? "TABLE" : "PARAGRAPH");
      }
    } else {
      buffer.push(trimmed);
    }
  }

  // Flush remaining
  if (buffer.length > 0) {
    const isTable = buffer.every(l => l.trim().startsWith("|"));
    flushBuffer(isTable ? "TABLE" : "PARAGRAPH");
  }

  return chunks;
}

/**
 * Extracts structured chunks from a spreadsheet (Excel/XLSX) format,
 * preserving sheet names, table headers, and row data.
 */
export function extractSpreadsheetStructure(input: RawDocumentInput): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const lines = input.content.split(/\r?\n/);
  const asOf = input.asOf || new Date().toISOString();

  let currentSheet = "Sheet1";
  let buffer: string[] = [];

  const flushSheetBuffer = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n").trim();
    if (!text) return;

    const textHash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    const chunkId = `chk_${input.documentId}_${chunks.length + 1}`;

    chunks.push({
      chunkId,
      documentId: input.documentId,
      documentFamilyId: input.documentFamilyId,
      projectId: input.projectId,
      projectCode: input.projectCode,
      documentTitle: input.title,
      documentVersion: input.version,
      pageNumber: null,
      sheetName: currentSheet,
      chunkType: "TABLE",
      text,
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

    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const sheetMatch = trimmed.match(/^\[Sheet:\s*([^\]]+)\]/i);
    if (sheetMatch) {
      flushSheetBuffer();
      currentSheet = sheetMatch[1].trim();
      continue;
    }

    if (trimmed !== "") {
      buffer.push(trimmed);
      // Group every 10-15 rows into a coherent chunk
      if (buffer.length >= 15) {
        flushSheetBuffer();
      }
    }
  }

  if (buffer.length > 0) {
    flushSheetBuffer();
  }

  return chunks;
}

/**
 * Unified structure-aware extraction dispatcher.
 */
export function extractDocumentChunks(input: RawDocumentInput): DocumentChunk[] {
  const mime = (input.mimeType || "").toLowerCase();
  const title = (input.title || "").toLowerCase();

  if (mime.includes("spreadsheet") || mime.includes("excel") || title.endsWith(".xlsx") || title.endsWith(".xls")) {
    return extractSpreadsheetStructure(input);
  }

  // Default to Contract/Technical document structure extractor
  return extractContractStructure(input);
}
