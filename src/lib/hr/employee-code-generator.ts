import { PrismaClient } from "@prisma/client";

// Transaction client type (compatible with both PrismaClient and tx from $transaction)
type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type PrismaLike = PrismaClient | PrismaTransactionClient;

/**
 * Gets current year in Asia/Ho_Chi_Minh timezone.
 */
export function getCurrentVietnamYear(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  });
  return Number.parseInt(formatter.format(date), 10);
}

/**
 * Formats sequence number to 4-digit zero-padded string.
 * NV-YYYY-NNNN (e.g., NV-2026-0001)
 */
export function formatEmployeeCode(year: number, sequence: number): string {
  const padded = String(sequence).padStart(4, "0");
  return `NV-${year}-${padded}`;
}

/**
 * Internal helper: atomically increments and returns the next sequence for the given year.
 * Accepts either PrismaClient or a transaction client (tx).
 */
async function incrementSequence(client: PrismaLike, year: number): Promise<number> {
  // Ensure record exists for current year
  await client.$executeRaw`
    INSERT INTO "EmployeeCodeSequence" ("year", "currentSequence", "updatedAt")
    VALUES (${year}, 0, NOW())
    ON CONFLICT ("year") DO NOTHING;
  `;

  // Row-lock the sequence row for UPDATE
  const rows = await client.$queryRaw<{ currentSequence: number }[]>`
    SELECT "currentSequence"
    FROM "EmployeeCodeSequence"
    WHERE "year" = ${year}
    FOR UPDATE;
  `;

  const current = rows[0]?.currentSequence ?? 0;
  const nextVal = current + 1;

  await client.$executeRaw`
    UPDATE "EmployeeCodeSequence"
    SET "currentSequence" = ${nextVal}, "updatedAt" = NOW()
    WHERE "year" = ${year};
  `;

  return nextVal;
}

/**
 * Generates the next atomic employee code for the given date/year.
 * Can be called with a top-level PrismaClient (wraps in its own transaction)
 * or from within an existing transaction client (uses it directly).
 */
export async function generateNextEmployeeCode(
  prisma: PrismaLike,
  targetDate: Date = new Date()
): Promise<string> {
  const year = getCurrentVietnamYear(targetDate);

  // Detect if we're already inside a transaction by checking for $transaction method
  const isTransactionClient = !("$transaction" in prisma);

  if (isTransactionClient) {
    // Already inside a transaction — use client directly
    const newSeq = await incrementSequence(prisma, year);
    return formatEmployeeCode(year, newSeq);
  }

  // Top-level call — wrap in transaction for atomicity
  const newSeq = await (prisma as PrismaClient).$transaction(async (tx) => {
    return incrementSequence(tx, year);
  });

  return formatEmployeeCode(year, newSeq);
}

/**
 * Wrapper with automatic retry on unique constraint conflicts.
 */
export async function generateEmployeeCodeWithRetry(
  prisma: PrismaLike,
  maxRetries: number = 5,
  targetDate: Date = new Date()
): Promise<string> {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      return await generateNextEmployeeCode(prisma, targetDate);
    } catch (err: any) {
      attempts++;
      if (attempts >= maxRetries) {
        throw new Error(`Failed to generate unique employee code after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
  throw new Error("Failed to generate employee code");
}
