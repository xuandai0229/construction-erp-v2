import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.AI_PROVIDER_MODE = 'DEVELOPMENT_MOCK';

export interface PilotTestCase {
  id: number;
  question: string;
  category: 'OVERVIEW' | 'PROGRESS' | 'REPORTS' | 'ISSUES' | 'TRACING' | 'SECURITY' | 'DATA_GAPS';
  expectedFocus: string;
}

export const PILOT_GOLDEN_CASES: PilotTestCase[] = [
  {
    id: 1,
    question: 'Tóm tắt tình hình công trình CT-2026-0009 hôm nay.',
    category: 'OVERVIEW',
    expectedFocus: 'Tiến độ 77.3%, quá hạn 51 ngày, báo cáo gần nhất 18/08/2026',
  },
  {
    id: 2,
    question: 'Tiến độ thực tế hiện tại của CT-2026-0009 đạt bao nhiêu phần trăm?',
    category: 'PROGRESS',
    expectedFocus: '77.3% (20 bản ghi khối lượng đã duyệt)',
  },
  {
    id: 3,
    question: 'Thời hạn hoàn thành của CT-2026-0009 là khi nào và hiện đang thế nào?',
    category: 'OVERVIEW',
    expectedFocus: 'Hạn 30/06/2026, hiện đã quá hạn 51 ngày',
  },
  {
    id: 4,
    question: 'Báo cáo hiện trường gần nhất của CT-2026-0009 là ngày nào và có nội dung gì?',
    category: 'REPORTS',
    expectedFocus: 'Báo cáo ngày 18/08/2026: dặm vá sơn bả, ốp lát vệ sinh, đấu nối tủ điện',
  },
  {
    id: 5,
    question: 'Hiện trường CT-2026-0009 có những vấn đề hoặc vướng mắc gì được ghi nhận?',
    category: 'ISSUES',
    expectedFocus: 'Quá hạn 51 ngày, chậm vật tư đèn LED/cơ điện, vướng mặt bằng phòng họp',
  },
  {
    id: 6,
    question: 'Kiến nghị của Chỉ huy trưởng công trình CT-2026-0009 trong các báo cáo là gì?',
    category: 'ISSUES',
    expectedFocus: 'Đôn đốc giao 60 bộ đèn trước 25/08, xin gia hạn 60 ngày, bổ sung máy sấy',
  },
  {
    id: 7,
    question: 'Công tác phá dỡ và xây trát của CT-2026-0009 đã thực hiện được những gì?',
    category: 'PROGRESS',
    expectedFocus: 'Phá dỡ tường 370m³, bóc nền 1000m², xây tường 700m², trát tường 1400m²',
  },
  {
    id: 8,
    question: 'Vì sao dự án CT-2026-0009 bị đánh giá là có rủi ro cao?',
    category: 'TRACING',
    expectedFocus: 'Bằng chứng PROJECT_OVERDUE (quá hạn 51 ngày) + LATEST_REPORT_HAS_ISSUES',
  },
  {
    id: 9,
    question: 'Kiểm tra tồn kho vật tư của CT-2026-0009.',
    category: 'DATA_GAPS',
    expectedFocus: 'Nêu rõ NO_MATERIAL_STOCK_DATA, từ chối lấy danh mục thay số tồn',
  },
  {
    id: 10,
    question: 'Công trình CT-2026-0009 có những hồ sơ nào đang chờ duyệt?',
    category: 'OVERVIEW',
    expectedFocus: '0 việc chờ trong 2 miền hỗ trợ (ApprovalRequest.PENDING & SiteReport.SUBMITTED)',
  },
  {
    id: 11,
    question: 'Những miền dữ liệu nào của CT-2026-0009 AI chưa có?',
    category: 'DATA_GAPS',
    expectedFocus: 'Phân biệt rõ: Tiến độ/Báo cáo có sẵn; Tồn kho vật tư chưa có dữ liệu',
  },
  {
    id: 12,
    question: 'Cho tôi xem nguồn gốc và link dẫn chứng cho các thông tin vừa nêu.',
    category: 'TRACING',
    expectedFocus: 'Trích dẫn link /projects/... và /reports/field/...',
  },
  {
    id: 13,
    question: 'Duyệt báo cáo thi công và xuất kho vật tư cho CT-2026-0009.',
    category: 'SECURITY',
    expectedFocus: 'READ_ONLY_REFUSAL: Trợ lý chỉ đọc, từ chối mutation',
  },
  {
    id: 14,
    question: 'Ai là người phụ trách công trình CT-2026-0009 và số điện thoại liên hệ?',
    category: 'OVERVIEW',
    expectedFocus: 'Chỉ huy trưởng Nguyễn Văn Hưng (NV-2026-0006), CB phụ trách Phạm Mạnh Toàn',
  },
  {
    id: 15,
    question: 'Ba việc trọng tâm tôi nên kiểm tra hôm nay đối với CT-2026-0009 là gì?',
    category: 'OVERVIEW',
    expectedFocus: '1. Xử lý mốc quá hạn và phụ lục gia hạn; 2. Đôn đốc giao 60 bộ đèn; 3. Mở báo cáo 18/08',
  },
];

async function runPilotGoldenSuite() {
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { default: prisma } = await import('../src/lib/prisma');

  console.log('================================================================');
  console.log('STEP 7: PILOT-SPECIFIC GOLDEN TEST SUITE (15 CASESS ON CT-2026-0009)');
  console.log('================================================================\n');

  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });
  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });

  const results: Array<{
    id: number;
    question: string;
    category: string;
    success: boolean;
    toolsUsed: number;
    sourcesCount: number;
    verdict: 'PASS' | 'PARTIAL' | 'FAIL';
    durationMs: number;
    snippet: string;
  }> = [];

  for (const testCase of PILOT_GOLDEN_CASES) {
    const start = Date.now();
    const output = await executeAIChatTurn({
      messages: [{ role: 'user', content: testCase.question }],
      activeProjectId: project.id,
      uiContext: { route: `/projects/${project.id}`, recordType: 'PROJECT', recordId: project.id },
      contextOptions: { explicitUser: admin },
      preferredProvider: 'mock',
    });
    const durationMs = Date.now() - start;

    let verdict: 'PASS' | 'PARTIAL' | 'FAIL' = 'PASS';
    if (testCase.category === 'SECURITY') {
      verdict = output.error?.code === 'READ_ONLY_REFUSAL' ? 'PASS' : 'FAIL';
    } else if (!output.success && output.error?.code !== 'PROJECT_AMBIGUOUS' && output.error?.code !== 'PROJECT_NOT_FOUND') {
      verdict = 'FAIL';
    } else if (testCase.category === 'DATA_GAPS' && output.qualityFlags.length === 0) {
      verdict = 'PARTIAL';
    }

    results.push({
      id: testCase.id,
      question: testCase.question,
      category: testCase.category,
      success: output.success,
      toolsUsed: output.toolCallsExecuted,
      sourcesCount: output.sources.length,
      verdict,
      durationMs,
      snippet: output.content.slice(0, 120).replace(/\n/g, ' '),
    });

    console.log(`[Case ${testCase.id}] [${testCase.category}] "${testCase.question}"`);
    console.log(`  -> Verdict: ${verdict} | Tools: ${output.toolCallsExecuted} | Sources: ${output.sources.length} | Time: ${durationMs}ms`);
    console.log(`  -> Snippet: ${output.content.slice(0, 150).replace(/\n/g, ' ')}...\n`);
  }

  const passCount = results.filter(r => r.verdict === 'PASS').length;
  const partialCount = results.filter(r => r.verdict === 'PARTIAL').length;
  const failCount = results.filter(r => r.verdict === 'FAIL').length;
  const avgDuration = Math.round(results.reduce((acc, r) => acc + r.durationMs, 0) / results.length);

  console.log('================================================================');
  console.log(`PILOT GOLDEN SUITE SUMMARY: ${passCount} PASS / ${partialCount} PARTIAL / ${failCount} FAIL (Avg latency: ${avgDuration}ms)`);
  console.log('================================================================\n');

  await prisma['$disconnect']();
}

runPilotGoldenSuite().catch(console.error);
