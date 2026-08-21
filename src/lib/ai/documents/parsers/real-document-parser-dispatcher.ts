/**
 * REAL DOCUMENT PARSER DISPATCHER
 * Routes raw binary file Buffers to PDF, DOCX, or XLSX parsers with file signature validation.
 */

import { DocumentChunk, DocumentIntelligenceStatus, DocumentAuthorityLevel } from '../document-brain-contracts';
import { parseRealPdfBuffer, RealPdfParseResult } from './real-pdf-parser';
import { parseRealDocxBuffer, RealDocxParseResult } from './real-docx-parser';
import { parseRealXlsxBuffer, RealXlsxParseResult } from './real-xlsx-parser';

export interface ParseFileInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
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

export interface UnifiedParseResult {
  documentId: string;
  parserUsed: "PDF" | "DOCX" | "XLSX" | "UNKNOWN";
  fileHash: string;
  totalCharacters?: number;
  pageCount?: number;
  sheetCount?: number;
  hasTextLayer: boolean;
  ocrRequired: boolean;
  chunks: DocumentChunk[];
  extractionQuality: "HIGH" | "MEDIUM" | "NO_TEXT_LAYER" | "OCR_REQUIRED";
}

/**
 * Dispatches real file buffers to the matching binary parser.
 */
export async function parseRealDocumentBuffer(input: ParseFileInput): Promise<UnifiedParseResult> {
  const mime = (input.mimeType || "").toLowerCase();
  const name = (input.fileName || "").toLowerCase();

  // 1. PDF Dispatch
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const pdfRes = await parseRealPdfBuffer({
      buffer: input.buffer,
      documentId: input.documentId,
      documentFamilyId: input.documentFamilyId,
      projectId: input.projectId,
      projectCode: input.projectCode,
      title: input.title,
      version: input.version,
      status: input.status,
      authorityLevel: input.authorityLevel,
      supersedesDocId: input.supersedesDocId,
      supersededByDocId: input.supersededByDocId,
      isLatestApprovedInFamily: input.isLatestApprovedInFamily,
      effectiveDate: input.effectiveDate,
      asOf: input.asOf,
    });

    return {
      documentId: input.documentId,
      parserUsed: "PDF",
      fileHash: pdfRes.fileHash,
      totalCharacters: pdfRes.totalCharacters,
      pageCount: pdfRes.pageCount,
      hasTextLayer: pdfRes.hasTextLayer,
      ocrRequired: pdfRes.ocrRequired,
      chunks: pdfRes.chunks,
      extractionQuality: pdfRes.extractionQuality,
    };
  }

  // 2. XLSX Dispatch
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    const xlsxRes = await parseRealXlsxBuffer({
      buffer: input.buffer,
      documentId: input.documentId,
      documentFamilyId: input.documentFamilyId,
      projectId: input.projectId,
      projectCode: input.projectCode,
      title: input.title,
      version: input.version,
      status: input.status,
      authorityLevel: input.authorityLevel,
      supersedesDocId: input.supersedesDocId,
      supersededByDocId: input.supersededByDocId,
      isLatestApprovedInFamily: input.isLatestApprovedInFamily,
      effectiveDate: input.effectiveDate,
      asOf: input.asOf,
    });

    return {
      documentId: input.documentId,
      parserUsed: "XLSX",
      fileHash: xlsxRes.fileHash,
      sheetCount: xlsxRes.sheetCount,
      hasTextLayer: true,
      ocrRequired: false,
      chunks: xlsxRes.chunks,
      extractionQuality: xlsxRes.extractionQuality,
    };
  }

  // 3. DOCX Dispatch
  if (
    mime.includes("wordprocessingml") ||
    mime.includes("msword") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    const docxRes = await parseRealDocxBuffer({
      buffer: input.buffer,
      documentId: input.documentId,
      documentFamilyId: input.documentFamilyId,
      projectId: input.projectId,
      projectCode: input.projectCode,
      title: input.title,
      version: input.version,
      status: input.status,
      authorityLevel: input.authorityLevel,
      supersedesDocId: input.supersedesDocId,
      supersededByDocId: input.supersededByDocId,
      isLatestApprovedInFamily: input.isLatestApprovedInFamily,
      effectiveDate: input.effectiveDate,
      asOf: input.asOf,
    });

    return {
      documentId: input.documentId,
      parserUsed: "DOCX",
      fileHash: docxRes.fileHash,
      totalCharacters: docxRes.totalCharacters,
      hasTextLayer: true,
      ocrRequired: false,
      chunks: docxRes.chunks,
      extractionQuality: docxRes.extractionQuality,
    };
  }

  throw new Error(`Unsupported file type for real binary parser: ${input.mimeType} (${input.fileName})`);
}
