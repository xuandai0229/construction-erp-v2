import { PrismaClient } from "@prisma/client";

export class ConcurrencyLockError extends Error {
  constructor(message: string, public readonly code: string = "CONCURRENCY_LOCK_TIMEOUT") {
    super(message);
    this.name = "ConcurrencyLockError";
  }
}

export interface LockOptions {
  lockTimeoutSeconds?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
}

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const RETRYABLE_SQL_STATES = new Set(["55P03", "40001", "40P01"]);

/**
 * Executes a Prisma transaction under PostgreSQL advisory xact lock on employeeId (DEC-02).
 * Features:
 * - SET LOCAL lock_timeout = '5s'
 * - pg_advisory_xact_lock with hashtextextended(employeeId, 0)
 * - Exponential backoff retry on SQLSTATE 55P03, 40001, 40P01 (max 3 retries)
 * - Immediate abort on domain/validation errors
 */
export async function executeWithAdvisoryLock<T>(
  prisma: PrismaClient,
  employeeId: string,
  fn: (tx: TransactionClient) => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const { lockTimeoutSeconds = 5, maxRetries = 3, initialBackoffMs = 100 } = options;

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Set local lock timeout
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${lockTimeoutSeconds}s'`);

        // Acquire PostgreSQL transaction-level advisory lock on employeeId hash
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${employeeId}, 0))`;

        // Execute domain function
        return await fn(tx);
      });
    } catch (error: any) {
      const sqlState = error?.code || error?.meta?.code;
      const isRetryable = RETRYABLE_SQL_STATES.has(sqlState) || /lock_not_available|deadlock|serialization/i.test(error?.message || "");

      if (isRetryable && attempt < maxRetries) {
        attempt++;
        const backoff = initialBackoffMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      if (isRetryable && attempt >= maxRetries) {
        throw new ConcurrencyLockError(
          `Không thể thu được khóa đồng thời cho nhân viên (${employeeId}) sau ${maxRetries} lần thử. Hệ thống đang bận, vui lòng thử lại.`
        );
      }

      // Non-retryable domain/validation error
      throw error;
    }
  }

  throw new ConcurrencyLockError("Concurrency lock failed");
}
