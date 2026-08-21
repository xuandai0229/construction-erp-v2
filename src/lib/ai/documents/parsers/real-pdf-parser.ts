/**
 * REAL PDF BYTE PARSER & HIERARCHICAL EXTRACTOR
 * Extracts structured chunks directly from real binary PDF bytes (Buffer).
 */

import { DocumentChunk, DocumentIntelligenceStatus, DocumentAuthorityLevel } from '../document-brain-contracts';
import { createHash } from 'node:crypto';
import { PDFParse } from 'pdf-parse';

export interface RealPdfParseInput {
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

export interface RealPdfParseResult {
  documentId: string;
  pageCount: number;
  totalCharacters: number;
  hasTextLayer: boolean;
  ocrRequired: boolean;
  fileHash: string;
  chunks: DocumentChunk[];
  extractionQuality: "HIGH" | "MEDIUM" | "NO_TEXT_LAYER" | "OCR_REQUIRED";
}

/**
 * Parses raw PDF buffer and extracts hierarchy preserving Article, Clause, and Page structure.
 */
export async function parseRealPdfBuffer(input: RealPdfParseInput): Promise<RealPdfParseResult> {
  const fileHash = createHash('sha256').update(input.buffer).digest('hex');
  const asOf = input.asOf || new Date().toISOString();

  let textResult: { pages: Array<{ text: string; num: number }>; text: string; total: number };
  const parser = new PDFParse({ data: input.buffer });

  try {
    textResult = await parser.getText();
  } catch (err: any) {
    throw new Error(`Failed to parse PDF binary bytes for document ${input.documentId}: ${err.message}`);
  } finally {
    try {
      await parser.destroy();
    } catch {
      // Ignore destroy error
    }
  }

  const pageCount = textResult.total || (textResult.pages ? textResult.pages.length : 1);
  const rawText = (textResult.text || '').trim();
  const totalCharacters = rawText.length;

  // Determine if text layer is present or if file is a pure scanned image PDF
  const hasTextLayer = totalCharacters > 10 && textResult.pages.some(p => (p.text || '').trim().length > 0);
  const ocrRequired = !hasTextLayer;

  if (ocrRequired) {
    return {
      documentId: input.documentId,
      pageCount,
      totalCharacters,
      hasTextLayer: false,
      ocrRequired: true,
      fileHash,
      chunks: [],
      extractionQuality: "NO_TEXT_LAYER",
    };
  }

  // Parse page by page to guarantee accurate page numbers
  const chunks: DocumentChunk[] = [];

  for (const pageItem of textResult.pages) {
    const currentPage = pageItem.num;
    const pageLines = (pageItem.text || '').split(/\r?\n/);

    let currentClause = `Trang ${currentPage}`;
    let currentSection = "Thông tin văn bản";
    let buffer: string[] = [];

    const flushBuffer = (type: DocumentChunk["chunkType"] = "PARAGRAPH") => {
      if (buffer.length === 0) return;
      const text = buffer.join("\n").trim();
      if (!text) return;

      const textHash = createHash("sha256").update(text).digest("hex").slice(0, 16);
      const chunkId = `chk_${input.documentId}_p${currentPage}_${chunks.length + 1}`;

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
        extractionQuality: "HIGH",
        ocrUsed: false,
        asOf,
      });

      buffer = [];
    };

    for (const line of pageLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check Article / Clause header (Điều 1, Điều 2...)
      const clauseMatch = trimmed.match(/^(?:Điều|ĐIỀU)\s*(\d+[\.\d]*)\s*[:.\-–]?\s*(.*)/i);
      if (clauseMatch) {
        flushBuffer("CLAUSE");
        currentClause = `Điều ${clauseMatch[1]}`;
        currentSection = clauseMatch[2] || currentSection;
        buffer.push(trimmed);
        continue;
      }

      // Check Section header (Mục, Chương, Phần, Phụ lục)
      const sectionMatch = trimmed.match(/^(?:Chương|CHƯƠNG|Mục|MỤC|Phần|PHẦN|Phụ lục|PHỤ LỤC)\s*([IVXLCDM\d\.\s]+)\s*[:.\-–]?\s*(.*)/i);
      if (sectionMatch) {
        flushBuffer("HEADING");
        currentSection = trimmed;
        buffer.push(trimmed);
        continue;
      }

      buffer.push(trimmed);
      if (buffer.length >= 8) {
        flushBuffer("PARAGRAPH");
      }
    }

    if (buffer.length > 0) {
      flushBuffer("PARAGRAPH");
    }
  }

  return {
    documentId: input.documentId,
    pageCount,
    totalCharacters,
    hasTextLayer: true,
    ocrRequired: false,
    fileHash,
    chunks,
    extractionQuality: "HIGH",
  };
}
