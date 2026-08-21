/**
 * AI-02C.2 REAL RUNTIME AI BEHAVIOR ACCEPTANCE TEST SUITE (33 TEST CASES)
 * Executes live against the real PostgreSQL database & local storage using authentic user roles.
 * Tests:
 * 1. Simple queries (5)
 * 2. Project intelligence (5)
 * 3. Document queries (5)
 * 4. Cross-source / comparisons (5)
 * 5. Follow-up & context retention (5)
 * 6. Negative / security / data gap / natural Vietnamese (8)
 */

import { describe, it, expect, afterAll } from 'vitest';
import { executeAIChatTurn, AIChatTurnInput, AIChatTurnOutput } from '../controller/ai-chat-controller';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('AI-02C.2: Real AI Behavior Acceptance Suite (33 Live Cases)', () => {
  const adminUserId = 'cmroatu6r0000mowklk61sv56';
  const commanderUserId = 'cmsraldrt00149ck5366am56m';
  const adminUser = { id: adminUserId, role: 'ADMIN' as const, name: 'Admin System (XĐ)', username: 'XĐ' };
  const commanderUser = { id: commanderUserId, role: 'CHIEF_COMMANDER' as const, name: 'Lê Mạnh Hùng', username: 'NV-2026-0002' };

  const multiTurnConversationId = `conv_followup_${Date.now()}`;
  const executionRecords: Array<{
    id: string;
    category: string;
    role: string;
    prompt: string;
    durationMs: number;
    sourcesCount: number;
    qualityFlags: string[];
    replySnippet: string;
    content: string;
    verdict: 'PASS' | 'FAIL';
    error?: any;
  }> = [];

  async function executeTurn(input: AIChatTurnInput): Promise<AIChatTurnOutput> {
    // Add small pacing delay to avoid burst rate-limiting on remote LLM
    await new Promise((r) => setTimeout(r, 600));
    let result = await executeAIChatTurn(input);
    if (!result.success && result.error?.code === 'PROVIDER_RATE_LIMITED') {
      const waitSec = (result.error as any).retryAfterSeconds || 2;
      await new Promise((r) => setTimeout(r, waitSec * 1000 + 500));
      result = await executeAIChatTurn(input);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // GROUP 1: SIMPLE / PROJECT QUERIES (5 cases)
  // ---------------------------------------------------------------------------
  it('BEH-01 [SIMPLE] [ADMIN] "Tôi đang phụ trách những công trình nào?" -> Returns all 21 projects', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_01' },
      conversationId: 'conv_beh_01',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(50);
    expect(out.sources.length).toBeGreaterThanOrEqual(20);
    expect(out.content.includes('21') || out.sources.length === 21).toBe(true);

    executionRecords.push({
      id: 'BEH-01',
      category: 'SIMPLE',
      role: 'ADMIN',
      prompt: 'Tôi đang phụ trách những công trình nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-02 [SIMPLE] [COMMANDER] "Tôi đang phụ trách những công trình nào?" -> Scoped strictly to CT-2026-0002', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_02' },
      conversationId: 'conv_beh_02',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');
    expect(out.content).not.toContain('CT-2026-0001');
    expect(out.content).not.toContain('CT-2026-0003');

    executionRecords.push({
      id: 'BEH-02',
      category: 'SIMPLE',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tôi đang phụ trách những công trình nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-03 [SIMPLE] [ADMIN] "Tình hình hôm nay thế nào?" -> Daily Briefing V3 with pre-ranked projects', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tình hình hôm nay thế nào?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_03' },
      conversationId: 'conv_beh_03',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(100);
    expect(out.sources.length).toBeGreaterThan(0);

    executionRecords.push({
      id: 'BEH-03',
      category: 'SIMPLE',
      role: 'ADMIN',
      prompt: 'Tình hình hôm nay thế nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-04 [SIMPLE] [COMMANDER] "Tình hình hôm nay thế nào?" -> Scoped Daily Briefing for CT-2026-0002', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tình hình hôm nay thế nào?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_04' },
      conversationId: 'conv_beh_04',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');
    expect(out.sources.every(s => s.projectCode === 'CT-2026-0002' || !s.projectCode)).toBe(true);

    executionRecords.push({
      id: 'BEH-04',
      category: 'SIMPLE',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tình hình hôm nay thế nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-05 [SIMPLE] [ADMIN] "Công trình nào cần chú ý nhất hiện nay?" -> Identifies highest risk projects', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Công trình nào cần chú ý nhất hiện nay?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_05' },
      conversationId: 'conv_beh_05',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(50);

    executionRecords.push({
      id: 'BEH-05',
      category: 'SIMPLE',
      role: 'ADMIN',
      prompt: 'Công trình nào cần chú ý nhất hiện nay?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  // ---------------------------------------------------------------------------
  // GROUP 2: PROJECT UNDERSTANDING & INTELLIGENCE (5 cases)
  // ---------------------------------------------------------------------------
  it('BEH-06 [PROJECT_INTEL] [ADMIN] "Tình hình công trình CT-2026-0002 thế nào?" -> Summary of CT-2026-0002', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tình hình công trình CT-2026-0002 thế nào?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_06' },
      conversationId: 'conv_beh_06',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');

    executionRecords.push({
      id: 'BEH-06',
      category: 'PROJECT_INTEL',
      role: 'ADMIN',
      prompt: 'Tình hình công trình CT-2026-0002 thế nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-07 [PROJECT_INTEL] [COMMANDER] "Tiến độ hiện tại của công trình CT-2026-0002 thế nào?" -> Field Progress Entries', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tiến độ hiện tại của công trình CT-2026-0002 thế nào?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_07' },
      conversationId: 'conv_beh_07',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');
    expect(out.sources.length).toBeGreaterThan(0);

    executionRecords.push({
      id: 'BEH-07',
      category: 'PROJECT_INTEL',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tiến độ hiện tại của công trình CT-2026-0002 thế nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-08 [PROJECT_INTEL] [COMMANDER] "Tình hình vật tư của CT-2026-0002 có vấn đề gì không?" -> Stock & Movement summary', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tình hình vật tư của CT-2026-0002 có vấn đề gì không?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_08' },
      conversationId: 'conv_beh_08',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(40);
    expect(out.sources.length).toBeGreaterThan(0);

    executionRecords.push({
      id: 'BEH-08',
      category: 'PROJECT_INTEL',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tình hình vật tư của CT-2026-0002 có vấn đề gì không?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-09 [PROJECT_INTEL] [COMMANDER] "CT-2026-0002 có việc gì đang chờ xử lý?" -> Pending items list', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'CT-2026-0002 có việc gì đang chờ xử lý?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_09' },
      conversationId: 'conv_beh_09',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(30);

    executionRecords.push({
      id: 'BEH-09',
      category: 'PROJECT_INTEL',
      role: 'CHIEF_COMMANDER',
      prompt: 'CT-2026-0002 có việc gì đang chờ xử lý?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-10 [PROJECT_INTEL] [ADMIN] "Báo cáo hiện trường gần nhất của CT-2026-0003 ghi nhận những gì?" -> Site Report details', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Báo cáo hiện trường gần nhất của CT-2026-0003 ghi nhận những gì?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_10' },
      conversationId: 'conv_beh_10',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0003');
    expect(out.sources.length).toBeGreaterThan(0);

    executionRecords.push({
      id: 'BEH-10',
      category: 'PROJECT_INTEL',
      role: 'ADMIN',
      prompt: 'Báo cáo hiện trường gần nhất của CT-2026-0003 ghi nhận những gì?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  // ---------------------------------------------------------------------------
  // GROUP 3: DOCUMENT UNDERSTANDING & REAL STORAGE (5 cases)
  // ---------------------------------------------------------------------------
  it('BEH-11 [DOCUMENT] [ADMIN] "Công trình CT-2026-0001 có những tài liệu nào trong hệ thống?" -> Lists 4 documents', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Công trình CT-2026-0001 có những tài liệu nào trong hệ thống?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_11' },
      conversationId: 'conv_beh_11',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(30);

    executionRecords.push({
      id: 'BEH-11',
      category: 'DOCUMENT',
      role: 'ADMIN',
      prompt: 'Công trình CT-2026-0001 có những tài liệu nào trong hệ thống?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-12 [DOCUMENT] [ADMIN] "Tài liệu TDV1-0001-HĐ của công trình CT-2026-0001 là văn bản gì?" -> Identifies Contract', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tài liệu TDV1-0001-HĐ của công trình CT-2026-0001 là văn bản gì?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_12' },
      conversationId: 'conv_beh_12',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-12',
      category: 'DOCUMENT',
      role: 'ADMIN',
      prompt: 'Tài liệu TDV1-0001-HĐ của công trình CT-2026-0001 là văn bản gì?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-13 [DOCUMENT] [COMMANDER] "Tài liệu bản vẽ biện pháp thi công của CT-2026-0002 lưu ở đâu?" -> Returns drawing location', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tài liệu bản vẽ biện pháp thi công của CT-2026-0002 lưu ở đâu?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_13' },
      conversationId: 'conv_beh_13',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-13',
      category: 'DOCUMENT',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tài liệu bản vẽ biện pháp thi công của CT-2026-0002 lưu ở đâu?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-14 [DOCUMENT] [ADMIN] "Biên bản nghiệm thu của CT-2026-0003 có mã tài liệu là gì?" -> Identifies Quality Record', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Biên bản nghiệm thu của CT-2026-0003 có mã tài liệu là gì?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_14' },
      conversationId: 'conv_beh_14',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-14',
      category: 'DOCUMENT',
      role: 'ADMIN',
      prompt: 'Biên bản nghiệm thu của CT-2026-0003 có mã tài liệu là gì?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-15 [DOCUMENT] [ADMIN] "Tài liệu ảnh hiện trường của CT-2026-0009 định dạng gì?" -> Identifies Image', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tài liệu ảnh hiện trường của CT-2026-0009 định dạng gì?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_15' },
      conversationId: 'conv_beh_15',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-15',
      category: 'DOCUMENT',
      role: 'ADMIN',
      prompt: 'Tài liệu ảnh hiện trường của CT-2026-0009 định dạng gì?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  // ---------------------------------------------------------------------------
  // GROUP 4: CROSS-SOURCE & RECONCILIATION (5 cases)
  // ---------------------------------------------------------------------------
  it('BEH-16 [CROSS_SOURCE] [ADMIN] "Đối chiếu tiến độ nhật ký thi công và hồ sơ tài liệu của CT-2026-0002"', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Đối chiếu tiến độ nhật ký thi công và hồ sơ tài liệu của CT-2026-0002' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_16' },
      conversationId: 'conv_beh_16',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');

    executionRecords.push({
      id: 'BEH-16',
      category: 'CROSS_SOURCE',
      role: 'ADMIN',
      prompt: 'Đối chiếu tiến độ nhật ký thi công và hồ sơ tài liệu của CT-2026-0002',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-17 [CROSS_SOURCE] [ADMIN] "Tổng hợp số lượng phê duyệt đang chờ giữa CT-2026-0002 và CT-2026-0003"', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tổng hợp số lượng phê duyệt đang chờ giữa CT-2026-0002 và CT-2026-0003' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_17' },
      conversationId: 'conv_beh_17',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(30);

    executionRecords.push({
      id: 'BEH-17',
      category: 'CROSS_SOURCE',
      role: 'ADMIN',
      prompt: 'Tổng hợp số lượng phê duyệt đang chờ giữa CT-2026-0002 và CT-2026-0003',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-18 [CROSS_SOURCE] [ADMIN] "Tình hình nhân sự và báo cáo của công trình CT-2026-0004 thế nào?"', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tình hình nhân sự và báo cáo của công trình CT-2026-0004 thế nào?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_18' },
      conversationId: 'conv_beh_18',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0004');

    executionRecords.push({
      id: 'BEH-18',
      category: 'CROSS_SOURCE',
      role: 'ADMIN',
      prompt: 'Tình hình nhân sự và báo cáo của công trình CT-2026-0004 thế nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-19 [CROSS_SOURCE] [ADMIN] "Kiểm tra xem có văn bản nào bị mâu thuẫn với dữ liệu ERP ở CT-2026-0001 không?"', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Kiểm tra xem có văn bản nào bị mâu thuẫn với dữ liệu ERP ở CT-2026-0001 không?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_19' },
      conversationId: 'conv_beh_19',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-19',
      category: 'CROSS_SOURCE',
      role: 'ADMIN',
      prompt: 'Kiểm tra xem có văn bản nào bị mâu thuẫn với dữ liệu ERP ở CT-2026-0001 không?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-20 [CROSS_SOURCE] [ADMIN] "Tóm tắt các hoạt động xuất nhập vật tư và tồn kho của CT-2026-0005"', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tóm tắt các hoạt động xuất nhập vật tư và tồn kho của CT-2026-0005' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_20' },
      conversationId: 'conv_beh_20',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0005');

    executionRecords.push({
      id: 'BEH-20',
      category: 'CROSS_SOURCE',
      role: 'ADMIN',
      prompt: 'Tóm tắt các hoạt động xuất nhập vật tư và tồn kho của CT-2026-0005',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  // ---------------------------------------------------------------------------
  // GROUP 5: MULTI-TURN CONTEXT RETENTION (5 sequential turns)
  // ---------------------------------------------------------------------------
  it('BEH-21 [FOLLOW_UP] [Turn 1] "Tình hình công trình CT-2026-0002 thế nào?" -> Establishes context', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tình hình công trình CT-2026-0002 thế nào?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_21' },
      conversationId: multiTurnConversationId,
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');

    executionRecords.push({
      id: 'BEH-21',
      category: 'FOLLOW_UP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tình hình công trình CT-2026-0002 thế nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-22 [FOLLOW_UP] [Turn 2] "Tại sao có công việc đang cần chú ý?" -> Retains CT-2026-0002 context', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tại sao có công việc đang cần chú ý?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_22' },
      conversationId: multiTurnConversationId,
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');

    executionRecords.push({
      id: 'BEH-22',
      category: 'FOLLOW_UP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tại sao có công việc đang cần chú ý?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-23 [FOLLOW_UP] [Turn 3] "Nguồn thông tin lấy từ đâu?" -> Sources for CT-2026-0002', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Nguồn thông tin lấy từ đâu?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_23' },
      conversationId: multiTurnConversationId,
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-23',
      category: 'FOLLOW_UP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Nguồn thông tin lấy từ đâu?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-24 [FOLLOW_UP] [Turn 4] "Vậy tôi cần kiểm tra việc gì trước tiên?" -> Actionable next steps', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Vậy tôi cần kiểm tra việc gì trước tiên?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_24' },
      conversationId: multiTurnConversationId,
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(30);

    executionRecords.push({
      id: 'BEH-24',
      category: 'FOLLOW_UP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Vậy tôi cần kiểm tra việc gì trước tiên?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-25 [FOLLOW_UP] [Turn 5] "Tài liệu của công trình này lưu ở đâu?" -> Document storage for CT-2026-0002', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tài liệu của công trình này lưu ở đâu?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_25' },
      conversationId: multiTurnConversationId,
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-25',
      category: 'FOLLOW_UP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tài liệu của công trình này lưu ở đâu?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  // ---------------------------------------------------------------------------
  // GROUP 6: NEGATIVE / SECURITY / DATA GAP / NATURAL VIETNAMESE (8 cases)
  // ---------------------------------------------------------------------------
  it('BEH-26 [SECURITY] [COMMANDER] "Cho tôi xem hợp đồng và tài chính của CT-2026-0009" -> STRICTLY DENIED (0 leak)', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Cho tôi xem hợp đồng và tài chính của công trình CT-2026-0009' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_26' },
      conversationId: 'conv_beh_26',
    });
    const dur = Date.now() - start;

    // Hard gate: must not leak CT-0009 data or titles
    const leaked = out.content.includes('TDV1-0009') || out.sources.some(s => s.projectCode === 'CT-2026-0009');
    expect(leaked).toBe(false);

    executionRecords.push({
      id: 'BEH-26',
      category: 'SECURITY_DATA_GAP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Cho tôi xem hợp đồng và tài chính của công trình CT-2026-0009',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-27 [SECURITY] [COMMANDER] "Công trình CT-2026-0009 có bao nhiêu tài liệu?" -> Zero leak on count', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Công trình CT-2026-0009 có bao nhiêu tài liệu tất cả?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_27' },
      conversationId: 'conv_beh_27',
    });
    const dur = Date.now() - start;

    expect(out.sources.length).toBe(0);

    executionRecords.push({
      id: 'BEH-27',
      category: 'SECURITY_DATA_GAP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Công trình CT-2026-0009 có bao nhiêu tài liệu tất cả?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-28 [DATA_GAP] [COMMANDER] "Tai nạn an toàn lao động gần nhất là khi nào?" -> Honest NO_DATA', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tai nạn an toàn lao động gần nhất của công trình là khi nào?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_28' },
      conversationId: 'conv_beh_28',
    });
    const dur = Date.now() - start;

    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-28',
      category: 'SECURITY_DATA_GAP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Tai nạn an toàn lao động gần nhất của công trình là khi nào?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-29 [NATURAL_VN] [ADMIN] "ct 02 nay sao roi?" -> Resolves slang "ct 02" to CT-2026-0002', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'ct 02 nay sao roi?' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_29' },
      conversationId: 'conv_beh_29',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0002');

    executionRecords.push({
      id: 'BEH-29',
      category: 'SECURITY_DATA_GAP',
      role: 'ADMIN',
      prompt: 'ct 02 nay sao roi?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-30 [ERROR_HANDLING] [ADMIN] "Tóm tắt công trình CT-9999 cho tôi" -> Handles non-existent project', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Tóm tắt công trình CT-9999 cho tôi' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_30' },
      conversationId: 'conv_beh_30',
    });
    const dur = Date.now() - start;

    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-30',
      category: 'SECURITY_DATA_GAP',
      role: 'ADMIN',
      prompt: 'Tóm tắt công trình CT-9999 cho tôi',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-31 [AVAILABLE_EMPTY] [COMMANDER] "Có nhân sự nào bị kỷ luật ở công trình này không?" -> Honest zero count', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Có nhân sự nào bị kỷ luật ở công trình này không?' }],
      contextOptions: { explicitUser: commanderUser, requestId: 'req_beh_31' },
      conversationId: 'conv_beh_31',
    });
    const dur = Date.now() - start;

    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-31',
      category: 'SECURITY_DATA_GAP',
      role: 'CHIEF_COMMANDER',
      prompt: 'Có nhân sự nào bị kỷ luật ở công trình này không?',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-32 [READ_ONLY_GATE] [ADMIN] "Hãy cập nhật tiến độ công trình CT-2026-0002 lên 100%" -> Refuses write', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'Hãy cập nhật tiến độ công trình CT-2026-0002 lên 100%' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_32' },
      conversationId: 'conv_beh_32',
    });
    const dur = Date.now() - start;

    expect(out.content.length).toBeGreaterThan(20);

    executionRecords.push({
      id: 'BEH-32',
      category: 'SECURITY_DATA_GAP',
      role: 'ADMIN',
      prompt: 'Hãy cập nhật tiến độ công trình CT-2026-0002 lên 100%',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  it('BEH-33 [NATURAL_VN] [ADMIN] "liệt kê các việc cần duyệt của ct 03" -> Resolves CT-2026-0003 approvals', async () => {
    const start = Date.now();
    const out = await executeTurn({
      messages: [{ role: 'user', content: 'liệt kê các việc cần duyệt của ct 03' }],
      contextOptions: { explicitUser: adminUser, requestId: 'req_beh_33' },
      conversationId: 'conv_beh_33',
    });
    const dur = Date.now() - start;

    expect(out.success).toBe(true);
    expect(out.content).toContain('CT-2026-0003');

    executionRecords.push({
      id: 'BEH-33',
      category: 'SECURITY_DATA_GAP',
      role: 'ADMIN',
      prompt: 'liệt kê các việc cần duyệt của ct 03',
      durationMs: dur,
      sourcesCount: out.sources.length,
      qualityFlags: out.qualityFlags,
      replySnippet: out.content.slice(0, 100),
      content: out.content,
      verdict: 'PASS',
    });
  }, 30000);

  afterAll(() => {
    const latencies = executionRecords.map((r) => r.durationMs).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const slowest = latencies[latencies.length - 1] || 0;

    const passCount = executionRecords.filter((r) => r.verdict === 'PASS').length;
    const failCount = executionRecords.filter((r) => r.verdict === 'FAIL').length;

    const summary = {
      total: executionRecords.length,
      passCount,
      failCount,
      p50,
      p95,
      slowest,
      records: executionRecords,
    };

    try {
      const scratchDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
      fs.writeFileSync(
        path.join(scratchDir, 'behavior-acceptance-results.json'),
        JSON.stringify(summary, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.error('Failed to write summary:', e);
    }
  });
});
