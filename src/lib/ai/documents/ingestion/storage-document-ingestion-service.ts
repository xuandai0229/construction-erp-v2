/**
 * ERP STORAGE DOCUMENT INGESTION SERVICE
 * Securely fetches authorized document binary bytes from ERP storage provider and triggers parsing.
 */

import { storageProvider } from '../../../storage';
import { parseRealDocumentBuffer, UnifiedParseResult } from '../parsers/real-document-parser-dispatcher';
import { DocumentIntelligenceStatus, DocumentAuthorityLevel } from '../document-brain-contracts';

export interface StorageIngestionRequest {
  documentId: string;
  documentFamilyId?: string;
  projectId: string;
  projectCode?: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  version: number;
  status: DocumentIntelligenceStatus;
  authorityLevel: DocumentAuthorityLevel;
  supersedesDocId?: string | null;
  supersededByDocId?: string | null;
  isLatestApprovedInFamily?: boolean;
  effectiveDate?: string | null;
  expectedFileHash?: string;
}

export interface IngestionResult {
  success: boolean;
  documentId: string;
  fileHash: string;
  parserResult?: UnifiedParseResult;
  error?: string;
}

/**
 * Ingests a document by reading its physical bytes from ERP storage and parsing its structure.
 */
export async function ingestDocumentFromStorage(request: StorageIngestionRequest): Promise<IngestionResult> {
  // 1. Validate Storage Existence
  const exists = await storageProvider.exists(request.storagePath);
  if (!exists) {
    return {
      success: false,
      documentId: request.documentId,
      fileHash: '',
      error: `Physical document file not found at storage path: ${request.storagePath}`,
    };
  }

  // 2. Read Raw Binary File Bytes
  let fileBuffer: Buffer;
  try {
    fileBuffer = await storageProvider.readFile(request.storagePath);
  } catch (err: any) {
    return {
      success: false,
      documentId: request.documentId,
      fileHash: '',
      error: `Failed to read file from storage provider: ${err.message}`,
    };
  }

  // 3. Dispatch to Real Parser
  try {
    const parserResult = await parseRealDocumentBuffer({
      buffer: fileBuffer,
      fileName: request.originalName,
      mimeType: request.mimeType,
      documentId: request.documentId,
      documentFamilyId: request.documentFamilyId,
      projectId: request.projectId,
      projectCode: request.projectCode,
      title: request.originalName,
      version: request.version,
      status: request.status,
      authorityLevel: request.authorityLevel,
      supersedesDocId: request.supersedesDocId,
      supersededByDocId: request.supersededByDocId,
      isLatestApprovedInFamily: request.isLatestApprovedInFamily,
      effectiveDate: request.effectiveDate,
    });

    return {
      success: true,
      documentId: request.documentId,
      fileHash: parserResult.fileHash,
      parserResult,
    };
  } catch (err: any) {
    return {
      success: false,
      documentId: request.documentId,
      fileHash: '',
      error: `Parsing failed: ${err.message}`,
    };
  }
}
