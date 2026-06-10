require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing database connection...');
    const count = await prisma.project.count();
    console.log(`✓ Database connected. Found ${count} projects.`);
    
    if (count > 0) {
      const project = await prisma.project.findFirst({
        select: { id: true, code: true, name: true }
      });
      console.log(`✓ Sample project: ${project.code} - ${project.name} (ID: ${project.id})`);
    } else {
      console.log('⚠ No projects in database - may need to create test data');
    }
  } catch (e) {
    console.log('✗ ERROR:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
