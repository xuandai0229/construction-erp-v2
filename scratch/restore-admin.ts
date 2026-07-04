import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';

async function main() {
  const data = JSON.parse(fs.readFileSync('D:\\construction-erp-v2\\backups\\business-data-wipe\\json-export-2026-07-03T10-25-31-887Z\\user.json', 'utf8'));
  const activeAdmin = data.find((u: any) => u.email === 'daicongtu2910@gmail.com');
  
  if (activeAdmin) {
    // Delete if already exists just in case
    await prisma.user.deleteMany({ where: { email: activeAdmin.email } });
    
    await prisma.user.create({
      data: activeAdmin
    });
    console.log('Restored active admin:', activeAdmin.email);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
