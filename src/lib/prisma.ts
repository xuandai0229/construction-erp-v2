import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal_v5: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

function getPrismaClient() {
  let client = globalThis.prismaGlobal_v5;
  if (!client) {
    client = prismaClientSingleton();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prismaGlobal_v5 = client;
    }
  }
  return client;
}

const prisma = getPrismaClient();

export default prisma;
