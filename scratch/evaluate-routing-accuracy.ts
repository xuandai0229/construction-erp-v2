import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface RoutingTestCase {
  id: number;
  query: string;
  expectedIntent: string;
  expectedTools: string[];
  expectedFastPath: boolean;
}

async function evaluateRoutingAccuracy() {
  const { routeUserIntent } = await import('../src/lib/ai/routing/dynamic-capability-router');

  const testCases: RoutingTestCase[] = [
    // 1. Directory / Fast Path
    {
      id: 1,
      query: 'Tôi đang phụ trách những công trình nào?',
      expectedIntent: 'PROJECT_DIRECTORY',
      expectedTools: ['get_my_projects'],
      expectedFastPath: true,
    },
    {
      id: 2,
      query: 'Danh sách công trình của tôi',
      expectedIntent: 'PROJECT_DIRECTORY',
      expectedTools: ['get_my_projects'],
      expectedFastPath: true,
    },
    {
      id: 3,
      query: 'Các công trình của tôi',
      expectedIntent: 'PROJECT_DIRECTORY',
      expectedTools: ['get_my_projects'],
      expectedFastPath: true,
    },
    {
      id: 4,
      query: 'danh sách dự án đang mở',
      expectedIntent: 'PROJECT_DIRECTORY',
      expectedTools: ['get_my_projects'],
      expectedFastPath: true,
    },

    // 2. Field Activity / Reports
    {
      id: 5,
      query: 'Báo cáo hiện trường gần nhất của công trình?',
      expectedIntent: 'RECENT_FIELD_ACTIVITY',
      expectedTools: ['get_latest_field_reports', 'get_project_summary'],
      expectedFastPath: false,
    },
    {
      id: 6,
      query: 'Nhật ký thi công hôm qua làm gì?',
      expectedIntent: 'RECENT_FIELD_ACTIVITY',
      expectedTools: ['get_latest_field_reports', 'get_project_summary'],
      expectedFastPath: false,
    },
    {
      id: 7,
      query: 'Thời tiết công trường tuần này ra sao?',
      expectedIntent: 'RECENT_FIELD_ACTIVITY',
      expectedTools: ['get_latest_field_reports', 'get_project_summary'],
      expectedFastPath: false,
    },

    // 3. Materials & Stock
    {
      id: 8,
      query: 'Tồn kho xi măng công trình thế nào?',
      expectedIntent: 'MATERIAL_HEALTH',
      expectedTools: ['get_project_material_summary', 'get_project_summary'],
      expectedFastPath: false,
    },
    {
      id: 9,
      query: 'Công trường còn bao nhiêu thép?',
      expectedIntent: 'MATERIAL_HEALTH',
      expectedTools: ['get_project_material_summary', 'get_project_summary'],
      expectedFastPath: false,
    },
    {
      id: 10,
      query: 'Kho dự án có bị thiếu vật tư không?',
      expectedIntent: 'MATERIAL_HEALTH',
      expectedTools: ['get_project_material_summary', 'get_project_summary'],
      expectedFastPath: false,
    },

    // 4. Pending Decisions
    {
      id: 11,
      query: 'Có việc gì đang chờ xử lý?',
      expectedIntent: 'PENDING_DECISIONS',
      expectedTools: ['get_pending_items'],
      expectedFastPath: false,
    },
    {
      id: 12,
      query: 'Có tờ trình nào chờ tôi duyệt không?',
      expectedIntent: 'PENDING_DECISIONS',
      expectedTools: ['get_pending_items'],
      expectedFastPath: false,
    },
    {
      id: 13,
      query: 'Những công việc đang chờ phê duyệt',
      expectedIntent: 'PENDING_DECISIONS',
      expectedTools: ['get_pending_items'],
      expectedFastPath: false,
    },

    // 5. Portfolio Briefing
    {
      id: 14,
      query: 'Tình hình hôm nay thế nào?',
      expectedIntent: 'PORTFOLIO_DATA_HEALTH',
      expectedTools: ['get_my_projects', 'get_project_summary', 'get_pending_items', 'get_latest_field_reports', 'get_project_material_summary'],
      expectedFastPath: false,
    },
    {
      id: 15,
      query: 'Điểm nóng hôm nay cần chú ý?',
      expectedIntent: 'PORTFOLIO_DATA_HEALTH',
      expectedTools: ['get_my_projects', 'get_project_summary', 'get_pending_items', 'get_latest_field_reports', 'get_project_material_summary'],
      expectedFastPath: false,
    },
    {
      id: 16,
      query: 'Công trình nào đang đáng lo nhất?',
      expectedIntent: 'PORTFOLIO_DATA_HEALTH',
      expectedTools: ['get_my_projects', 'get_project_summary', 'get_pending_items', 'get_latest_field_reports', 'get_project_material_summary'],
      expectedFastPath: false,
    },
    {
      id: 17,
      query: 'Xem tất cả dự án và xếp hạng rủi ro thi công',
      expectedIntent: 'PORTFOLIO_DATA_HEALTH',
      expectedTools: ['get_my_projects', 'get_project_summary', 'get_pending_items', 'get_latest_field_reports', 'get_project_material_summary'],
      expectedFastPath: false,
    },

    // 6. Project Specific Summary
    {
      id: 18,
      query: 'Tóm tắt CT-2026-0009.',
      expectedIntent: 'PROJECT_SUMMARY',
      expectedTools: ['get_project_summary', 'get_latest_field_reports', 'get_project_material_summary'],
      expectedFastPath: false,
    },
    {
      id: 19,
      query: 'Tiến độ và thông tin CT-2026-0002',
      expectedIntent: 'PROJECT_SUMMARY',
      expectedTools: ['get_project_summary', 'get_latest_field_reports', 'get_project_material_summary'],
      expectedFastPath: false,
    },

    // 7. General / Low-Confidence Safe Routing
    {
      id: 20,
      query: 'Xin chào trợ lý, bạn có thể giúp gì?',
      expectedIntent: 'GENERAL_CONSTRUCTION_QUERY',
      expectedTools: ['get_my_projects', 'get_project_summary', 'get_pending_items', 'get_latest_field_reports', 'get_project_material_summary'],
      expectedFastPath: false,
    },
  ];

  console.log('================================================================');
  console.log(`EVALUATING ROUTING ACCURACY ACROSS ${testCases.length} GOLDEN INTENT CASES`);
  console.log('================================================================');

  let correctCount = 0;
  let lowConfidenceCount = 0;
  let wrongCapabilityCount = 0;

  for (const tc of testCases) {
    const decision = routeUserIntent(tc.query);
    const intentMatch = decision.intent === tc.expectedIntent;
    const fastPathMatch = decision.isDeterministicFastPath === tc.expectedFastPath;
    const toolsMatch = JSON.stringify(decision.toolsToExpose.sort()) === JSON.stringify(tc.expectedTools.sort());

    const isPass = intentMatch && fastPathMatch && toolsMatch;
    if (isPass) {
      correctCount += 1;
      console.log(`[PASS] Case #${tc.id}: "${tc.query}" -> ${decision.intent} (Conf: ${decision.confidence})`);
    } else {
      console.error(`[FAIL] Case #${tc.id}: "${tc.query}"`);
      console.error(`       Expected: ${tc.expectedIntent}, Got: ${decision.intent}`);
      console.error(`       Expected FastPath: ${tc.expectedFastPath}, Got: ${decision.isDeterministicFastPath}`);
      wrongCapabilityCount += 1;
    }

    if (decision.confidence < 0.7) {
      lowConfidenceCount += 1;
    }
  }

  const accuracy = (correctCount / testCases.length) * 100;
  const lowConfRate = (lowConfidenceCount / testCases.length) * 100;
  const wrongCapRate = (wrongCapabilityCount / testCases.length) * 100;

  console.log('\n=== ROUTING EVALUATION SUMMARY ===');
  console.log(`Total Cases: ${testCases.length}`);
  console.log(`ROUTING_ACCURACY: ${accuracy.toFixed(1)}% (${correctCount}/${testCases.length})`);
  console.log(`LOW_CONFIDENCE_RATE: ${lowConfRate.toFixed(1)}% (${lowConfidenceCount}/${testCases.length})`);
  console.log(`WRONG_CAPABILITY_RATE: ${wrongCapRate.toFixed(1)}% (${wrongCapabilityCount}/${testCases.length})`);
}

evaluateRoutingAccuracy().catch(console.error);
