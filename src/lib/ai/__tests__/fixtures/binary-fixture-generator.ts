import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { Document, Paragraph, HeadingLevel, Packer } from 'docx';

function stripAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Creates a compliant text PDF binary buffer using pdf-lib.
 */
export async function createSimplePdfBuffer(title: string, pagesText: string[][]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let p = 0; p < pagesText.length; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { height } = page.getSize();
    let y = height - 50;

    // Header / Title
    page.drawText(stripAccents(`${title} - Trang ${p + 1}`), {
      x: 50,
      y,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Page Lines
    for (const line of pagesText[p]) {
      page.drawText(stripAccents(line), {
        x: 50,
        y,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 20;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generates real XLSX binary buffer.
 */
export async function createRealXlsxBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  
  // Sheet 1: VatTuChinh
  const ws1 = wb.addWorksheet('VatTuChinh');
  ws1.addRow(['STT', 'Mã vật tư', 'Tên vật tư', 'ĐVT', 'Khối lượng thiết kế', 'Đơn giá (VNĐ)', 'Thành tiền (VNĐ)']);
  ws1.addRow([1, 'VT-CAT-01', 'Cát vàng đổ bê tông', 'm3', 1200, 380000, 456000000]);
  ws1.addRow([2, 'VT-DA-02', 'Đá 1x2 mác 250', 'm3', 2500, 420000, 1050000000]);
  ws1.addRow([3, 'VT-THEP-03', 'Thép Hòa Phát D20 mác CB400-V', 'tấn', 45, 16500000, 742500000]);
  ws1.addRow([4, 'VT-BT-04', 'Bê tông thương phẩm M350 R28', 'm3', 3800, 1450000, 5510000000]);

  // Sheet 2: KeHoachGiaiNgan
  const ws2 = wb.addWorksheet('KeHoachGiaiNgan');
  ws2.addRow(['Đợt', 'Nội dung giải ngân', 'Mốc hoàn thành', 'Tỷ lệ (%)', 'Số tiền giải ngân (VNĐ)']);
  ws2.addRow([1, 'Tạm ứng hợp đồng sau khi ký kết', '15/01/2026', 20, 25000000000]);
  ws2.addRow([2, 'Hoàn thành phần móng và kết cấu ngầm', '15/04/2026', 30, 37500000000]);
  ws2.addRow([3, 'Cất nóc công trình kết cấu thân', '15/07/2026', 30, 37500000000]);
  ws2.addRow([4, 'Nghiệm thu bàn giao đưa vào sử dụng', '30/09/2026', 15, 18750000000]);
  ws2.addRow([5, 'Bảo hành công trình 24 tháng', '30/09/2028', 5, 6250000000]);

  const rawBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}

/**
 * Generates real DOCX binary buffer.
 */
export async function createRealDocxBuffer(): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "THUYẾT MINH BIỆN PHÁP THI CÔNG HỐ MÓNG TẦNG HẦM (DRAFT)",
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          text: "Dự án: CT-2026-0009 — Trung tâm thương mại phức hợp Tây Hồ",
        }),
        new Paragraph({
          text: "Điều 1: Trình tự đào đất và biện pháp thi công",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "Điều 1.1: Quy trình đào đất hố móng sâu -8.50m chia làm 3 đợt. Đợt 1 đào đến cao độ -3.00m, lắp đặt hệ giằng shoring thứ nhất. Đợt 2 đào đến cao độ -6.00m, lắp giằng tầng 2. Đợt 3 đào đến đáy đài móng -8.50m.",
        }),
        new Paragraph({
          text: "Điều 1.2: Quan trắc lún và chuyển vị tường vây. Bố trí 8 mốc quan trắc lún xung quanh hố đào. Tần suất đo 1 lần/ngày trong giai đoạn đào đất và 2 ngày/lần sau khi đổ bê tông lót đáy móng.",
        }),
        new Paragraph({
          text: "Điều 2: Biện pháp đảm bảo an toàn lao động và môi trường",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "100% công nhân làm việc dưới hố sâu phải được trang bị dây cứu sinh, mũ bảo hộ và đèn chiếu sáng ban đêm.",
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
