/**
 * REAL DOCX BYTE PARSER & HIERARCHICAL EXTRACTOR
 * Extracts structured chunks directly from real binary DOCX bytes (Buffer).
 */

import { DocumentChunk, DocumentIntelligenceStatus, DocumentAuthorityLevel } from '../document-brain-contracts';
import { createHash } from 'node:crypto';
import mammoth from 'mammoth';

export interface RealDocxParseInput {
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

export interface RealDocxParseResult {
  documentId: string;
  totalCharacters: number;
  fileHash: string;
  chunks: DocumentChunk[];
  extractionQuality: "HIGH" | "MEDIUM";
}

/**
 * Parses raw DOCX buffer and extracts hierarchical chunks.
 */
export async function parseRealDocxBuffer(input: RealDocxParseInput): Promise<RealDocxParseResult> {
  const fileHash = createHash('sha256').update(input.buffer).digest('hex');
  const asOf = input.asOf || new Date().toISOString();

  let extractedResult: { value: string; messages: any[] };
  try {
    extractedResult = await mammoth.extractRawText({ buffer: input.buffer });
  } catch (err: any) {
    throw new Error(`Failed to parse DOCX binary bytes for document ${input.documentId}: ${err.message}`);
  }

  const rawText = extractedResult.value || '';
  const totalCharacters = rawText.trim().length;
  const lines = rawText.split(/\r?\n/);

  const chunks: DocumentChunk[] = [];
  let currentSection = "Nội dung chung DOCX";
  let currentClause = "PHẦN_MỞ_ĐẦU";
  let buffer: string[] = [];

  const flushBuffer = (type: DocumentChunk["chunkType"] = "PARAGRAPH") => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n").trim();
    if (!text) return;

    const textHash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    const chunkId = `chk_${input.documentId}_docx_${chunks.length + 1}`;

    chunks.push({
      chunkId,
      documentId: input.documentId,
      documentFamilyId: input.documentFamilyId,
      projectId: input.projectId,
      projectCode: input.projectCode,
      documentTitle: input.title,
      documentVersion: input.version,
      pageNumber: null,
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check Article / Clause / Section
    const clauseMatch = trimmed.match(/^(?:Điều|ĐIỀU|Mục|MỤC|Phần|PHẦN|Chương|CHƯƠNG)\s*([IVXLCDM\d\.\s]+)\s*[:.\-–]?\s*(.*)/i);
    if (clauseMatch) {
      flushBuffer("CLAUSE");
      currentClause = `${clauseMatch[0]}`;
      currentSection = clauseMatch[2] || trimmed;
      buffer.push(trimmed);
      continue;
    }

    buffer.push(trimmed);
    if (buffer.length >= 10) {
      flushBuffer("PARAGRAPH");
    }
  }

  if (buffer.length > 0) {
    flushBuffer("PARAGRAPH");
  }

  return {
    documentId: input.documentId,
    totalCharacters,
    fileHash,
    chunks,
    extractionQuality: "HIGH",
  };
}
