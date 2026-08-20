import { PrismaClient, FieldProgressItemType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: 'postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function setupWorkItems() {
  const project = await prisma.project.findUniqueOrThrow({
    where: { code: 'CT-2026-0009' },
  });
  const chiefCommander = await prisma.user.findFirstOrThrow({
    where: { username: 'NV-2026-0006' },
  });

  console.log(`Setting up Field Progress Template for ${project.code} (${project.name})...`);

  // 1. Create or get template
  let template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: project.id, deletedAt: null },
  });

  if (!template) {
    template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId: project.id,
        name: 'Bảng khối lượng thi công cải tạo Trung tâm giao dịch công nghệ Võ Chí Công',
        createdById: chiefCommander.id,
        status: 'ACTIVE',
      },
    });
    console.log(`Created template: ${template.id}`);
  }

  // 2. Define standard real work items
  const workItems = [
    {
      code: 'PHAD-01',
      categoryName: 'Phá dỡ & Cải tạo',
      workContent: 'Phá dỡ tường ngăn cũ, đục tẩy sàn và vận chuyển phế thải',
      constructionCrew: 'Đội phá dỡ 1',
      designQuantity: 450,
      unit: 'm³',
      note: 'Khu vực tầng 2 và tầng 3',
      sortOrder: 1,
    },
    {
      code: 'PHAD-02',
      categoryName: 'Phá dỡ & Cải tạo',
      workContent: 'Bóc dỡ gạch lát nền cũ và làm sạch mặt bằng',
      constructionCrew: 'Đội phá dỡ 1',
      designQuantity: 1200,
      unit: 'm²',
      note: 'Toàn bộ sảnh và phòng làm việc',
      sortOrder: 2,
    },
    {
      code: 'XT-01',
      categoryName: 'Xây trát hoàn thiện',
      workContent: 'Xây tường ngăn gạch không nung VRO/AAC dày 110mm',
      constructionCrew: 'Đội xây hoàn thiện 1',
      designQuantity: 850,
      unit: 'm²',
      note: 'Vách ngăn các phòng chức năng',
      sortOrder: 3,
    },
    {
      code: 'XT-02',
      categoryName: 'Xây trát hoàn thiện',
      workContent: 'Trát tường trong nhà vữa xi măng mác 75 dày 15mm',
      constructionCrew: 'Đội xây hoàn thiện 1',
      designQuantity: 1700,
      unit: 'm²',
      note: 'Trát 2 mặt tường ngăn và tường bao',
      sortOrder: 4,
    },
    {
      code: 'TTC-01',
      categoryName: 'Trần & Sơn bả',
      workContent: 'Lắp đặt khung xương và tấm trần thạch cao chìm chịu ẩm',
      constructionCrew: 'Đội thạch cao Hà Nội',
      designQuantity: 1150,
      unit: 'm²',
      note: 'Hệ khung Vĩnh Tường, tấm chống ẩm 9mm',
      sortOrder: 5,
    },
    {
      code: 'SB-01',
      categoryName: 'Trần & Sơn bả',
      workContent: 'Bả mastic và sơn phủ nội thất cao cấp 1 lót 2 màu',
      constructionCrew: 'Đội sơn bả hoàn thiện',
      designQuantity: 2850,
      unit: 'm²',
      note: 'Sơn Dulux Professional',
      sortOrder: 6,
    },
    {
      code: 'OL-01',
      categoryName: 'Ốp lát',
      workContent: 'Lát nền gạch granite 600x600mm mài bóng chống trơn',
      constructionCrew: 'Đội ốp lát 2',
      designQuantity: 950,
      unit: 'm²',
      note: 'Khu sảnh giao dịch và hành lang chung',
      sortOrder: 7,
    },
    {
      code: 'OL-02',
      categoryName: 'Ốp lát',
      workContent: 'Ốp lát gạch men ceramic khu vệ sinh và phòng kỹ thuật',
      constructionCrew: 'Đội ốp lát 2',
      designQuantity: 320,
      unit: 'm²',
      note: 'Gạch 300x600 Viglacera',
      sortOrder: 8,
    },
    {
      code: 'ME-01',
      categoryName: 'Cơ điện M&E',
      workContent: 'Lắp đặt ống luồn và kéo rải dây cáp điện cấp nguồn, chiếu sáng',
      constructionCrew: 'Đội cơ điện 1',
      designQuantity: 4500,
      unit: 'm',
      note: 'Cáp Cadisun Cu/PVC/PVC',
      sortOrder: 9,
    },
    {
      code: 'ME-02',
      categoryName: 'Cơ điện M&E',
      workContent: 'Lắp đặt tủ điện phân tầng DB và thiết bị đóng cắt MCB/MCCB',
      constructionCrew: 'Đội cơ điện 1',
      designQuantity: 12,
      unit: 'tủ',
      note: 'Tủ điện sơn tĩnh điện, thiết bị Schneider',
      sortOrder: 10,
    },
    {
      code: 'ME-03',
      categoryName: 'Cơ điện M&E',
      workContent: 'Lắp đặt đèn LED panel 600x600 48W và đèn downlight âm trần',
      constructionCrew: 'Đội cơ điện 1',
      designQuantity: 350,
      unit: 'bộ',
      note: 'Đèn Rạng Đông LED Smart',
      sortOrder: 11,
    },
  ];

  for (const item of workItems) {
    const existing = await prisma.fieldProgressItem.findFirst({
      where: { templateId: template.id, code: item.code, deletedAt: null },
    });
    if (!existing) {
      const created = await prisma.fieldProgressItem.create({
        data: {
          templateId: template.id,
          projectId: project.id,
          itemType: 'WORK' as FieldProgressItemType,
          code: item.code,
          categoryName: item.categoryName,
          workContent: item.workContent,
          constructionCrew: item.constructionCrew,
          designQuantity: item.designQuantity,
          unit: item.unit,
          note: item.note,
          sortOrder: item.sortOrder,
          createdById: chiefCommander.id,
        },
      });
      console.log(`  + Created item [${created.code}] ${created.workContent} (${created.designQuantity} ${created.unit})`);
    } else {
      console.log(`  = Item [${existing.code}] already exists`);
    }
  }

  console.log('\nField Progress Foundation Setup Complete!');
  await prisma['$disconnect']();
  await pool.end();
}

setupWorkItems().catch(console.error);
