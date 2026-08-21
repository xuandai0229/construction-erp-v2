import { createSimplePdfBuffer } from '../src/lib/ai/__tests__/fixtures/binary-fixture-generator';
const { PDFParse } = require('pdf-parse');

async function debug() {
  const buf = createSimplePdfBuffer('Hop Dong', [
    ['Dieu 1: Pham vi cong viec', 'Nha thau thi cong coc khoan nhoi'],
    ['Dieu 2: Gia tri hop dong', 'Tong gia tri 125 ty dong'],
  ]);

  const parser = new PDFParse({ data: buf });
  const res = await parser.getText();
  console.log('debug text:', JSON.stringify(res, null, 2));
  await parser.destroy();
}

debug().catch(console.error);
