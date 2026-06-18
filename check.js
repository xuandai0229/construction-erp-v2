const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function run() { console.log('Total:', await prisma.materialRequest.count()); } run();
