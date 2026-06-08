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
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@construction.local' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      name: 'Admin (Dev)',
    },
    create: {
      email: 'admin@construction.local',
      password: hashedPassword,
      name: 'Admin (Dev)',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('Seed dev admin successfully:', admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
