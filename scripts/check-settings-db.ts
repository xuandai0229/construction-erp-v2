import prisma from '../src/lib/prisma';
import { DEFAULT_SYSTEM_SETTINGS } from '../src/lib/settings/settings-validation';

async function main() {
  console.log('1. Checking prisma.systemSetting delegate:', typeof prisma.systemSetting);

  let setting = await prisma.systemSetting.findFirst();
  if (!setting) {
    console.log('2. No setting found, creating default...');
    setting = await prisma.systemSetting.create({
      data: {
        ...DEFAULT_SYSTEM_SETTINGS,
      }
    });
    console.log('Created default setting with ID:', setting.id);
  } else {
    console.log('2. Found existing setting with ID:', setting.id);
  }

  console.log('3. Updating maintenanceWindow field...');
  const updated = await prisma.systemSetting.update({
    where: { id: setting.id },
    data: {
      maintenanceWindow: '23:00 - 04:00'
    }
  });

  console.log('4. Read back updated setting maintenanceWindow:', updated.maintenanceWindow);
}

main().catch(console.error).finally(() => prisma.$disconnect());
