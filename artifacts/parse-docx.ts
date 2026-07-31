import fs from 'fs';
import path from 'path';
import jszip from 'jszip';

async function parseDocxXml(filePath: string) {
  const fileData = fs.readFileSync(filePath);
  const zip = await jszip.loadAsync(fileData);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  return documentXml || '';
}

async function analyzeTemplates() {
  const reportPath = 'docs/official-templates/01-Bao cao tu danh gia cong tac ATLĐ-PCCC-VSMT.docx';
  const planPath = 'docs/official-templates/02-Ke hoach va Ket qua kiem tra ATLĐ-PCCC-VSMT hang tuan.docx';

  const reportXml = await parseDocxXml(reportPath);
  const planXml = await parseDocxXml(planPath);

  // Extract text nodes from XML
  const extractTexts = (xml: string) => {
    const matches = xml.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
    return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
  };

  console.log('--- REPORT XML TEXT SAMPLE ---');
  console.log(extractTexts(reportXml).substring(0, 1000));

  console.log('\n--- PLAN XML TEXT SAMPLE ---');
  console.log(extractTexts(planXml).substring(0, 1000));
}

analyzeTemplates();
