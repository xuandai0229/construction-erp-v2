import {
  createSimplePdfBuffer,
  createRealDocxBuffer,
  createRealXlsxBuffer,
} from '../src/lib/ai/__tests__/fixtures/binary-fixture-generator';
import { parseRealDocumentBuffer } from '../src/lib/ai/documents/parsers/real-document-parser-dispatcher';

async function testParsers() {
  console.log('Testing Real PDF Parser...');
  const pdfBuffer = await createSimplePdfBuffer('HỢP ĐỒNG THI CÔNG XÂY DỰNG SỐ 12/2025/HĐ-XD', [
    [
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc',
      'HỢP ĐỒNG THI CÔNG XÂY DỰNG',
      'Số: 12/2025/HĐ-XD',
      'Công trình: CT-2026-0009 - TTTM Tây Hồ',
      'Điều 1: Phạm vi công việc và nội dung hợp đồng',
      'Nhà thầu cam kết thi công toàn bộ phần cọc khoan nhồi và kết cấu ngầm.',
    ],
    [
      'Điều 2: Giá trị hợp đồng và phương thức thanh toán',
      'Tổng giá trị hợp đồng trọn gói là 125.000.000.000 VNĐ (Một trăm hai mươi lăm tỷ đồng).',
      'Điều 3: Tạm ứng và thu hồi tạm ứng',
      'Tỷ lệ tạm ứng hợp đồng là 20% tương đương 25.000.000.000 VNĐ.',
      'Điều 4: Thời hạn và tiến độ thi công',
      'Thời hạn hoàn thành bàn giao toàn bộ công trình trước ngày 15/08/2026.',
    ],
    [
      'Điều 5: Phạt vi phạm hợp đồng và bồi thường thiệt hại',
      'Trường hợp chậm tiến độ do lỗi của Nhà thầu, mức phạt là 0.05% giá trị hợp đồng cho mỗi ngày chậm trễ, tối đa không quá 8%.',
      'Điều 6: Bảo hành công trình',
      'Thời gian bảo hành công trình là 24 tháng tính từ ngày nghiệm thu bàn giao.',
    ],
  ]);

  const pdfRes = await parseRealDocumentBuffer({
    buffer: pdfBuffer,
    fileName: 'hop-dong-12-2025.pdf',
    mimeType: 'application/pdf',
    documentId: 'DOC-REAL-PDF-001',
    documentFamilyId: 'FAM-HD-CT009',
    projectId: 'cm75j0j3x0009v7m0q009proj',
    projectCode: 'CT-2026-0009',
    title: 'Hợp đồng thi công số 12/2025/HĐ-XD',
    version: 1,
    status: 'APPROVED',
    authorityLevel: 'CURRENT_APPROVED_CONTRACT',
  });

  console.log('PDF Result:', {
    parser: pdfRes.parserUsed,
    pages: pdfRes.pageCount,
    characters: pdfRes.totalCharacters,
    chunks: pdfRes.chunks.length,
    fileHash: pdfRes.fileHash.slice(0, 16),
  });
  console.log('Sample PDF chunk #1 text:\n', pdfRes.chunks[0]?.text);

  console.log('\nTesting Real DOCX Parser...');
  const docxBuffer = await createRealDocxBuffer();
  const docxRes = await parseRealDocumentBuffer({
    buffer: docxBuffer,
    fileName: 'bptc-ho-mong.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    documentId: 'DOC-REAL-DOCX-001',
    documentFamilyId: 'FAM-BPTC-CT009',
    projectId: 'cm75j0j3x0009v7m0q009proj',
    projectCode: 'CT-2026-0009',
    title: 'Biện pháp thi công hố móng tầng hầm',
    version: 1,
    status: 'DRAFT',
    authorityLevel: 'AUTHORIZED_DRAFT',
  });

  console.log('DOCX Result:', {
    parser: docxRes.parserUsed,
    characters: docxRes.totalCharacters,
    chunks: docxRes.chunks.length,
    fileHash: docxRes.fileHash.slice(0, 16),
  });
  console.log('Sample DOCX chunk #1 text:\n', docxRes.chunks[0]?.text);

  console.log('\nTesting Real XLSX Parser...');
  const xlsxBuffer = await createRealXlsxBuffer();
  const xlsxRes = await parseRealDocumentBuffer({
    buffer: xlsxBuffer,
    fileName: 'du-toan-vat-tu.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    documentId: 'DOC-REAL-XLSX-001',
    documentFamilyId: 'FAM-SCHEDULE-CT009',
    projectId: 'cm75j0j3x0009v7m0q009proj',
    projectCode: 'CT-2026-0009',
    title: 'Bảng dự toán và tiến độ cung ứng vật tư 2026',
    version: 1,
    status: 'APPROVED',
    authorityLevel: 'APPROVED_METHOD_STATEMENT',
  });

  console.log('XLSX Result:', {
    parser: xlsxRes.parserUsed,
    sheets: xlsxRes.sheetCount,
    chunks: xlsxRes.chunks.length,
    fileHash: xlsxRes.fileHash.slice(0, 16),
  });
  console.log('Sample XLSX chunk #1 text:\n', xlsxRes.chunks[0]?.text);
}

testParsers().catch(console.error);
