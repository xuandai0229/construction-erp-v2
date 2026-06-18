import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10)
  const testPassword = await bcrypt.hash('Test@123456', 10)
  
  // 1. Dev Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@construction.local' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      name: 'Admin (Dev)',
      username: 'dev_admin_test',
    },
    create: {
      email: 'admin@construction.local',
      password: hashedPassword,
      name: 'Admin (Dev)',
      role: 'ADMIN',
      isActive: true,
      username: 'dev_admin_test',
    },
  })
  console.log('✓ Seed admin:', admin.email)

  // 2. Director
  const director = await prisma.user.upsert({
    where: { email: 'director@construction.local' },
    update: { password: testPassword, role: 'DIRECTOR', isActive: true, name: 'Giám đốc Test', username: 'director_test' },
    create: { email: 'director@construction.local', password: testPassword, name: 'Giám đốc Test', role: 'DIRECTOR', isActive: true, username: 'director_test' },
  })
  console.log('✓ Seed director:', director.email)

  // 3. Deputy Director
  const deputy = await prisma.user.upsert({
    where: { email: 'deputy@construction.local' },
    update: { password: testPassword, role: 'DEPUTY_DIRECTOR', isActive: true, name: 'Phó GĐ Test', username: 'deputy_director_test' },
    create: { email: 'deputy@construction.local', password: testPassword, name: 'Phó GĐ Test', role: 'DEPUTY_DIRECTOR', isActive: true, username: 'deputy_director_test' },
  })
  console.log('✓ Seed deputy director:', deputy.email)

  // 4. Test projects
  const ct001 = await prisma.project.upsert({
    where: { code: 'QA_RBAC_CT_001' },
    update: { name: 'Công trình RBAC Test 001' },
    create: { code: 'QA_RBAC_CT_001', name: 'Công trình RBAC Test 001', status: 'ACTIVE' },
  })
  console.log('✓ Seed project:', ct001.code)

  const ct002 = await prisma.project.upsert({
    where: { code: 'QA_RBAC_CT_002' },
    update: { name: 'Công trình RBAC Test 002' },
    create: { code: 'QA_RBAC_CT_002', name: 'Công trình RBAC Test 002', status: 'ACTIVE' },
  })
  console.log('✓ Seed project:', ct002.code)

  // 5. Commander 1 -> assigned to CT_001
  const cmd1 = await prisma.user.upsert({
    where: { email: 'commander1@construction.local' },
    update: { password: testPassword, role: 'CHIEF_COMMANDER', isActive: true, name: 'Chỉ huy trưởng CT001', username: 'commander_ct001_test' },
    create: { email: 'commander1@construction.local', password: testPassword, name: 'Chỉ huy trưởng CT001', role: 'CHIEF_COMMANDER', isActive: true, username: 'commander_ct001_test' },
  })
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: ct001.id, userId: cmd1.id } },
    update: { role: 'CHIEF_COMMANDER', isActive: true, assignedById: admin.id },
    create: { projectId: ct001.id, userId: cmd1.id, role: 'CHIEF_COMMANDER', assignedById: admin.id, isActive: true },
  })
  console.log('✓ Seed commander1 -> CT_001')

  // 6. Commander 2 -> assigned to CT_002
  const cmd2 = await prisma.user.upsert({
    where: { email: 'commander2@construction.local' },
    update: { password: testPassword, role: 'CHIEF_COMMANDER', isActive: true, name: 'Chỉ huy trưởng CT002', username: 'commander_ct002_test' },
    create: { email: 'commander2@construction.local', password: testPassword, name: 'Chỉ huy trưởng CT002', role: 'CHIEF_COMMANDER', isActive: true, username: 'commander_ct002_test' },
  })
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: ct002.id, userId: cmd2.id } },
    update: { role: 'CHIEF_COMMANDER', isActive: true, assignedById: admin.id },
    create: { projectId: ct002.id, userId: cmd2.id, role: 'CHIEF_COMMANDER', assignedById: admin.id, isActive: true },
  })
  console.log('✓ Seed commander2 -> CT_002')

  console.log('\n✅ All test users seeded successfully')
  console.log('Passwords: admin=123456, others=Test@123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
