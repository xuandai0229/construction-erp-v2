import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { isPerformanceProfilingEnabled } from '@/lib/performance/perf-core'
import { logPrismaQuery } from '@/lib/performance/server'

const connectionString = `${process.env.DATABASE_URL}`

const prismaClientSingleton = (): PrismaClient => {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({ adapter })

  if (!isPerformanceProfilingEnabled()) return client

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startedAt = performance.now()
          try {
            return await query(args)
          } finally {
            await logPrismaQuery(model, operation, performance.now() - startedAt)
          }
        },
      },
    },
  }) as unknown as PrismaClient
}

declare const globalThis: {
  prismaGlobal_v5: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

function getPrismaClient() {
  let client = globalThis.prismaGlobal_v5;
  if (!client || (process.env.NODE_ENV !== 'production' && !(client as any).safetyWeeklyFile)) {
    client = prismaClientSingleton();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prismaGlobal_v5 = client;
    }
  }
  return client;
}

const prisma = getPrismaClient();

export default prisma;
