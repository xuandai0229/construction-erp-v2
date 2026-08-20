import { PrismaClient, UserRole } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createSiteReportWithAudit } from '../src/lib/reports/report-create-service';
import { submitSiteReportTransition, approveSiteReportTransition } from '../src/lib/reports/report-transition-service';

const pool = new Pool({ connectionString: 'postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createAndApproveSiteReports() {
  console.log('================================================================');
  console.log('STEP 3: ENTERING REAL OPERATIONAL SITE REPORTS (ERP WORKFLOW)');
  console.log('================================================================\n');

  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });
  const chiefCommander = await prisma.user.findFirstOrThrow({ where: { username: 'NV-2026-0006' } });
  const admin = await prisma.user.findFirstOrThrow({ where: { email: 'daicongtu2910@gmail.com', isActive: true } });

  const items = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id, deletedAt: null },
  });
  const itemMap = new Map(items.map(i => [i.code, i]));

  const reportsDef = [
    {
      reportDate: new Date('2026-04-10T07:00:00.000Z'),
      weatherCondition: 'SUNNY' as const,
      weatherTemperature: 28,
      summary: 'Tiến hành phá dỡ các vách tường ngăn tầng 2 và bóc dỡ gạch lát nền hành lang. Mặt bằng chật hẹp, kết hợp vận chuyển phế thải ra xe vào ban đêm để tránh ùn tắc đường Võ Chí Công.',
      labor: '18 công nhân (Đội phá dỡ 10, Đội dọn dẹp vận chuyển 8)',
      materials: 'Đã tập kết bao tải đóng phế thải, bạt che chắn bụi khu vực hành lang liên cơ.',
      quality: 'Đã che chắn kín khu vực bụi, không ảnh hưởng đến các tầng đang làm việc của khối liên cơ.',
      issues: 'Ban quản lý tòa nhà yêu cầu hạn chế tiếng ồn cơ giới từ 11h30 - 13h30 trưa.',
      recommendations: 'Tăng cường thêm 1 xe tải chở phế thải vào ca đêm để đẩy nhanh giải phóng mặt bằng.',
      lines: [
        { code: 'PHAD-01', quantityToday: 120, note: 'Phá dỡ tường ngăn phòng làm việc tầng 2' },
        { code: 'PHAD-02', quantityToday: 350, note: 'Bóc gạch lát nền hành lang trục 1-4' },
      ],
    },
    {
      reportDate: new Date('2026-05-05T07:00:00.000Z'),
      weatherCondition: 'CLOUDY' as const,
      weatherTemperature: 30,
      summary: 'Hoàn tất 90% công tác phá dỡ. Tập trung xây tường ngăn gạch nhẹ khu văn phòng chuyên gia và kéo rải ống luồn, cáp điện cấp nguồn dọc trục hành lang chính.',
      labor: '26 công nhân (Đội xây trát 12, Đội cơ điện 8, Đội thạch cao 6)',
      materials: 'Đã nhập 400m2 gạch nhẹ VRO, 120 bao xi măng Vicem Hoàng Thạch, 2000m ống luồn SP.',
      quality: 'Mạch vữa xây đều, thẳng hàng, đã neo râu thép râu tường vào cột bê tông hiện hữu đúng thiết kế.',
      issues: 'Khu vực tầng 3 xuất hiện hiện tượng thấm dột nhẹ từ hộp kỹ thuật thoát nước cũ của tòa nhà.',
      recommendations: 'Đề nghị Ban QLDA cử cán bộ kỹ thuật kiểm tra và phê duyệt phương án xử lý chống thấm dột cục bộ trước khi trát tường.',
      lines: [
        { code: 'PHAD-01', quantityToday: 250, note: 'Phá dỡ nốt tường khu hội trường tầng 3' },
        { code: 'PHAD-02', quantityToday: 650, note: 'Bóc gạch lát sảnh trung tâm' },
        { code: 'XT-01', quantityToday: 320, note: 'Xây tường ngăn phòng họp và phòng chuyên gia' },
        { code: 'ME-01', quantityToday: 1400, note: 'Kéo rải ống luồn dây điện trục hành lang' },
      ],
    },
    {
      reportDate: new Date('2026-05-28T07:00:00.000Z'),
      weatherCondition: 'LIGHT_RAIN' as const,
      weatherTemperature: 27,
      summary: 'Thi công trát hoàn thiện tường các phòng họp và lắp đặt hệ khung xương trần thạch cao chìm. Triển khai đi ống luồn dây tín hiệu mạng LAN và điện nhẹ.',
      labor: '28 công nhân (Đội xây trát 14, Đội thạch cao 8, Đội cơ điện 6)',
      materials: 'Đã nghiệm thu khung xương Vĩnh Tường và tấm thạch cao chống ẩm Gyproc 9mm.',
      quality: 'Độ phẳng mặt trát đạt yêu cầu TCVN, khung xương trần được treo ty ren giằng chống rung lắc vững chắc.',
      issues: 'Mưa lớn gây ẩm cục bộ gần cửa sổ hướng Tây, phải che chắn nilon bảo vệ khung xương thạch cao.',
      recommendations: 'Bổ sung máy sấy công nghiệp hỗ trợ khô bề mặt vữa trát nhanh để chuẩn bị công tác bả mastic.',
      lines: [
        { code: 'XT-01', quantityToday: 380, note: 'Xây tường bao khu vệ sinh và phòng kỹ thuật' },
        { code: 'XT-02', quantityToday: 620, note: 'Trát tường phòng họp và văn phòng tầng 2' },
        { code: 'TTC-01', quantityToday: 450, note: 'Lắp khung xương trần sảnh và phòng giao dịch' },
        { code: 'ME-01', quantityToday: 1600, note: 'Kéo dây điện chiếu sáng và ổ cắm tầng 2' },
      ],
    },
    {
      reportDate: new Date('2026-06-25T07:00:00.000Z'),
      weatherCondition: 'SUNNY' as const,
      weatherTemperature: 34,
      summary: 'Tập trung cao độ hoàn thiện sơn bả nước 1, lát nền sảnh giao dịch và lắp đặt thiết bị chiếu sáng. Tiến độ bị ảnh hưởng do mặt bằng liên cơ một số phòng chưa bàn giao dứt điểm.',
      labor: '32 công nhân (Sơn bả 12, Ốp lát 10, Cơ điện 6, Vệ sinh công nghiệp 4)',
      materials: 'Đã nhập 80 thùng sơn Dulux Professional, 600m2 gạch granite Đồng Tâm 600x600.',
      quality: 'Mặt sơn bả láng mịn không gợn sóng, gạch lát mạch khít 2mm dùng ke cân bằng chữ thập.',
      issues: 'Chủ đầu tư chưa nghiệm thu bàn giao khu vực phòng họp hội thảo tầng 2 để thi công nội thất, nguy cơ trễ hạn bàn giao toàn bộ.',
      recommendations: 'Chỉ huy trưởng đã gửi tờ trình xin gia hạn tiến độ thực tế thêm 60 ngày do vướng giải phóng mặt bằng nội bộ.',
      lines: [
        { code: 'XT-02', quantityToday: 780, note: 'Trát hoàn thiện tầng 3' },
        { code: 'TTC-01', quantityToday: 500, note: 'Bắn tấm thạch cao tầng 3' },
        { code: 'SB-01', quantityToday: 1450, note: 'Bả mastic và xả nhám trần, tường tầng 2' },
        { code: 'OL-01', quantityToday: 520, note: 'Lát gạch sảnh chính và hành lang tầng 2' },
        { code: 'ME-03', quantityToday: 180, note: 'Lắp đèn LED panel âm trần tầng 2' },
      ],
    },
    {
      reportDate: new Date('2026-08-18T07:00:00.000Z'),
      weatherCondition: 'SUNNY' as const,
      weatherTemperature: 33,
      summary: 'Tiếp tục công tác dặm vá sơn bả nước 2, ốp lát hoàn thiện các khu vệ sinh và đấu nối tủ điện phân tầng. Đang đợi phê duyệt phụ lục gia hạn hợp đồng từ Ban QLDA.',
      labor: '22 công nhân (Sơn bả 8, Ốp lát 6, Cơ điện 6, Quản lý 2)',
      materials: 'Đã tập kết thiết bị vệ sinh Inax, phụ kiện đấu nối tủ điện Schneider.',
      quality: 'Công tác ốp lát vệ sinh đạt độ dốc thoát sàn tốt, hệ thống điện đã đo cách điện đạt tiêu chuẩn.',
      issues: 'Công trình đã vượt thời hạn hợp đồng gốc (30/06/2026) 51 ngày; vật tư đèn LED và phụ kiện cơ điện một số mã đặc thù chậm về công trường.',
      recommendations: 'Đôn đốc nhà cung cấp vật tư giao nốt 60 bộ đèn còn lại trước ngày 25/08/2026 để tổng vệ sinh và chạy thử liên động.',
      lines: [
        { code: 'SB-01', quantityToday: 850, note: 'Sơn phủ màu hoàn thiện tầng 2 và tầng 3' },
        { code: 'OL-01', quantityToday: 280, note: 'Lát gạch hành lang tầng 3' },
        { code: 'OL-02', quantityToday: 260, note: 'Ốp lát toàn bộ khu vệ sinh nam nữ' },
        { code: 'ME-02', quantityToday: 8, note: 'Lắp đặt và đấu nối tủ điện phân tầng' },
        { code: 'ME-03', quantityToday: 110, note: 'Lắp đặt đèn downlight và đèn sự cố' },
      ],
    },
  ];

  for (let i = 0; i < reportsDef.length; i++) {
    const def = reportsDef[i];
    console.log(`\n--- Processing Report ${i + 1}/${reportsDef.length} (${def.reportDate.toISOString().slice(0, 10)}) ---`);

    // 1. Create Report as Chief Commander (DRAFT)
    const dailyLines = def.lines.map((l, idx) => {
      const item = itemMap.get(l.code)!;
      return {
        projectId: project.id,
        fieldProgressItemId: item.id,
        workContent: item.workContent,
        workName: item.workContent,
        area: item.categoryName,
        constructionCrew: item.constructionCrew,
        quantityToday: l.quantityToday as any,
        unit: item.unit,
        designQuantity: item.designQuantity as any,
        quantityBefore: 0 as any,
        quantityCumulative: l.quantityToday as any,
        progressPercent: ((l.quantityToday / Number(item.designQuantity)) * 100) as any,
        note: l.note,
        sortOrder: idx,
      };
    });

    const report = await createSiteReportWithAudit(
      prisma,
      { id: chiefCommander.id, name: chiefCommander.name, role: 'CHIEF_COMMANDER' as UserRole },
      {
        projectId: project.id,
        type: 'DAILY',
        reportDate: def.reportDate,
        weatherCondition: def.weatherCondition,
        weatherTemperature: def.weatherTemperature,
        summary: def.summary,
        labor: def.labor,
        materials: def.materials,
        quality: def.quality,
        issues: def.issues,
        recommendations: def.recommendations,
        status: 'DRAFT',
        lines: { create: dailyLines },
      }
    );
    console.log(`  1. Created DRAFT Report: ${report.reportNo} (ID: ${report.id})`);

    // 2. Submit Report as Chief Commander (SUBMITTED)
    const submitted = await submitSiteReportTransition(
      prisma,
      report.id,
      { id: chiefCommander.id, name: chiefCommander.name, role: 'CHIEF_COMMANDER' as UserRole }
    );
    console.log(`  2. Transitioned to SUBMITTED: ${submitted.reportNo}`);

    // 3. Approve Report as Admin (APPROVED)
    const approved = await approveSiteReportTransition(
      prisma,
      report.id,
      { id: admin.id, name: admin.name, role: 'ADMIN' as UserRole },
      'Đã thẩm định khối lượng và phê duyệt nhật ký thi công.'
    );
    console.log(`  3. Transitioned to APPROVED by Admin: ${approved.reportNo}`);
  }

  console.log('\n================================================================');
  console.log('ALL 5 SITE REPORTS SUCCESSFULLY CREATED, SUBMITTED & APPROVED!');
  console.log('================================================================\n');

  await prisma['$disconnect']();
  await pool.end();
}

createAndApproveSiteReports().catch(console.error);
