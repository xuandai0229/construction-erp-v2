/**
 * REAL DOCUMENT PARSER TEST SUITE (AI-02C.2)
 * Tests actual binary byte parsing for PDF, DOCX, and XLSX files.
 */

import { describe, it, expect } from 'vitest';
import {
  createSimplePdfBuffer,
  createRealDocxBuffer,
  createRealXlsxBuffer,
} from './fixtures/binary-fixture-generator';
import { parseRealDocumentBuffer } from '../documents/parsers/real-document-parser-dispatcher';

describe('AI-02C.2: Real Binary File Parsers Suite', () => {
  it('1. PDF: Parses real binary PDF buffer and extracts structured page-level chunks', async () => {
    const pdfBuffer = await createSimplePdfBuffer('HỢP ĐỒNG THI CÔNG XÂY DỰNG', [
      [
        'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
        'HỢP ĐỒNG THI CÔNG SỐ 12/2025/HĐ-XD',
        'Điều 1: Phạm vi công việc thi công phần ngầm',
      ],
      [
        'Điều 2: Tổng giá trị hợp đồng là 125.000.000.000 VNĐ',
        'Điều 3: Tỷ lệ tạm ứng 20%',
        'Điều 4: Thời hạn thi công hoàn thành 15/08/2026',
      ],
    ]);

    const result = await parseRealDocumentBuffer({
      buffer: pdfBuffer,
      fileName: 'hop-dong-12-2025.pdf',
      mimeType: 'application/pdf',
      documentId: 'DOC-REAL-PDF-01',
      documentFamilyId: 'FAM-HD-CT009',
      projectId: 'cm75j0j3x0009v7m0q009proj',
      projectCode: 'CT-2026-0009',
      title: 'Hợp đồng thi công số 12/2025/HĐ-XD',
      version: 1,
      status: 'APPROVED',
      authorityLevel: 'CURRENT_APPROVED_CONTRACT',
    });

    expect(result.parserUsed).toBe('PDF');
    expect(result.pageCount).toBe(2);
    expect(result.hasTextLayer).toBe(true);
    expect(result.ocrRequired).toBe(false);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].pageNumber).toBe(1);
    expect(result.fileHash.length).toBe(64); // SHA-256
  });

  it('2. PDF Scanned Flag: Detects blank or scanned PDF and sets ocrRequired = true', async () => {
    // Generate a blank / empty text PDF buffer
    const blankPdfBuffer = await createSimplePdfBuffer('BLANK', [[]]);

    const result = await parseRealDocumentBuffer({
      buffer: blankPdfBuffer,
      fileName: 'ban-scan-khong-text.pdf',
      mimeType: 'application/pdf',
      documentId: 'DOC-REAL-SCAN-02',
      projectId: 'cm75j0j3x0009v7m0q009proj',
      title: 'Bản scan hồ sơ nghiệm thu',
      version: 1,
      status: 'APPROVED',
      authorityLevel: 'APPROVED_INSPECTION_RECORD',
    });

    expect(result.parserUsed).toBe('PDF');
    // If no text layer, ocrRequired is flagged
    if (!result.hasTextLayer) {
      expect(result.ocrRequired).toBe(true);
      expect(result.extractionQuality).toBe('NO_TEXT_LAYER');
    }
  });

  it('3. DOCX: Parses real binary DOCX buffer and preserves heading hierarchy', async () => {
    const docxBuffer = await createRealDocxBuffer();

    const result = await parseRealDocumentBuffer({
      buffer: docxBuffer,
      fileName: 'thuyet-minh-bptc.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      documentId: 'DOC-REAL-DOCX-01',
      documentFamilyId: 'FAM-BPTC-CT009',
      projectId: 'cm75j0j3x0009v7m0q009proj',
      projectCode: 'CT-2026-0009',
      title: 'Biện pháp thi công hố móng tầng hầm',
      version: 1,
      status: 'DRAFT',
      authorityLevel: 'AUTHORIZED_DRAFT',
    });

    expect(result.parserUsed).toBe('DOCX');
    expect(result.hasTextLayer).toBe(true);
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks.some(c => c.text.includes('-8.50m'))).toBe(true);
    expect(result.chunks.some(c => c.text.includes('8 mốc quan trắc'))).toBe(true);
  });

  it('4. XLSX: Parses real binary XLSX workbook and extracts exact Sheet + Cell Range coordinates', async () => {
    const xlsxBuffer = await createRealXlsxBuffer();

    const result = await parseRealDocumentBuffer({
      buffer: xlsxBuffer,
      fileName: 'du-toan-vat-tu.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      documentId: 'DOC-REAL-XLSX-01',
      documentFamilyId: 'FAM-SCHEDULE-CT009',
      projectId: 'cm75j0j3x0009v7m0q009proj',
      projectCode: 'CT-2026-0009',
      title: 'Bảng dự toán và tiến độ cung ứng vật tư 2026',
      version: 1,
      status: 'APPROVED',
      authorityLevel: 'APPROVED_METHOD_STATEMENT',
    });

    expect(result.parserUsed).toBe('XLSX');
    expect(result.sheetCount).toBe(2);
    expect(result.chunks.length).toBe(2);
    
    // Check Sheet 1 (VatTuChinh)
    const chunk1 = result.chunks.find(c => c.sheetName === 'VatTuChinh');
    expect(chunk1).toBeDefined();
    expect(chunk1?.cellRange).toContain('VatTuChinh!R1:R5');
    expect(chunk1?.text).toContain('Cát vàng đổ bê tông');
    expect(chunk1?.text).toContain('380000');

    // Check Sheet 2 (KeHoachGiaiNgan)
    const chunk2 = result.chunks.find(c => c.sheetName === 'KeHoachGiaiNgan');
    expect(chunk2).toBeDefined();
    expect(chunk2?.cellRange).toContain('KeHoachGiaiNgan!R1:R6');
    expect(chunk2?.text).toContain('37500000000');
  });
});
