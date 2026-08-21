import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { executeAIChatTurn } from '../src/lib/ai/controller/ai-chat-controller';

async function diagnose() {
  const adminUser = { id: 'cmroatu6r0000mowklk61sv56', role: 'ADMIN' as const, name: 'Admin System (XĐ)', username: 'XĐ' };
  const commanderUser = { id: 'cmsraldrt00149ck5366am56m', role: 'CHIEF_COMMANDER' as const, name: 'Lê Mạnh Hùng', username: 'NV-2026-0002' };

  console.log('--- Diagnosing BEH-33: "liệt kê các việc cần duyệt của ct 03" ---');
  const res33 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'liệt kê các việc cần duyệt của ct 03' }],
    contextOptions: { explicitUser: adminUser, requestId: 'diag_33' },
  });
  console.log('res33:', { success: res33.success, content: res33.content, flags: res33.qualityFlags });

  console.log('\n--- Diagnosing BEH-17: "Tổng hợp số lượng phê duyệt đang chờ giữa CT-2026-0002 và CT-2026-0003" ---');
  const res17 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tổng hợp số lượng phê duyệt đang chờ giữa CT-2026-0002 và CT-2026-0003' }],
    contextOptions: { explicitUser: adminUser, requestId: 'diag_17' },
  });
  console.log('res17:', { success: res17.success, content: res17.content, flags: res17.qualityFlags, error: (res17 as any).error });

  console.log('\n--- Diagnosing BEH-18: "Tình hình nhân sự và báo cáo của công trình CT-2026-0004 thế nào?" ---');
  const res18 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tình hình nhân sự và báo cáo của công trình CT-2026-0004 thế nào?' }],
    contextOptions: { explicitUser: adminUser, requestId: 'diag_18' },
  });
  console.log('res18:', { success: res18.success, content: res18.content, flags: res18.qualityFlags, error: (res18 as any).error });

  console.log('\n--- Diagnosing BEH-19: "Kiểm tra xem có văn bản nào bị mâu thuẫn với dữ liệu ERP ở CT-2026-0001 không?" ---');
  const res19 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Kiểm tra xem có văn bản nào bị mâu thuẫn với dữ liệu ERP ở CT-2026-0001 không?' }],
    contextOptions: { explicitUser: adminUser, requestId: 'diag_19' },
  });
  console.log('res19:', { success: res19.success, content: res19.content, flags: res19.qualityFlags, error: (res19 as any).error });
}

diagnose().catch(console.error);
