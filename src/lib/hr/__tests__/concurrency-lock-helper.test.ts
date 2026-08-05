import { describe, it, expect, vi } from "vitest";
import { executeWithAdvisoryLock, ConcurrencyLockError } from "../concurrency-lock-helper";

describe("PostgreSQL Concurrency Advisory Lock Helper (DEC-02)", () => {
  it("1. should execute callback with advisory lock successfully on first try", async () => {
    const mockTx = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const result = await executeWithAdvisoryLock(
      mockPrisma as any,
      "emp-123",
      async (tx) => {
        return { success: true, employeeId: "emp-123" };
      }
    );

    expect(result).toEqual({ success: true, employeeId: "emp-123" });
    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith("SET LOCAL lock_timeout = '5s'");
  });

  it("2. should retry on lock error (55P03) up to 3 times", async () => {
    let attempts = 0;

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (cb) => {
        attempts++;
        if (attempts <= 2) {
          const err = new Error("lock_not_available") as any;
          err.code = "55P03";
          throw err;
        }
        const mockTx = {
          $executeRawUnsafe: vi.fn().mockResolvedValue(1),
          $executeRaw: vi.fn().mockResolvedValue(1),
          $queryRaw: vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
        };
        return cb(mockTx);
      }),
    };

    const result = await executeWithAdvisoryLock(
      mockPrisma as any,
      "emp-123",
      async () => "success-after-retry",
      { initialBackoffMs: 10, maxRetries: 3 }
    );

    expect(attempts).toBe(3);
    expect(result).toBe("success-after-retry");
  });

  it("3. should NOT retry on domain/validation errors", async () => {
    let attempts = 0;

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (cb) => {
        attempts++;
        const mockTx = {
          $executeRawUnsafe: vi.fn().mockResolvedValue(1),
          $executeRaw: vi.fn().mockResolvedValue(1),
          $queryRaw: vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
        };
        return cb(mockTx);
      }),
    };

    await expect(
      executeWithAdvisoryLock(
        mockPrisma as any,
        "emp-123",
        async () => {
          throw new Error("VALIDATION_ERROR: Invalid date");
        },
        { initialBackoffMs: 10, maxRetries: 3 }
      )
    ).rejects.toThrow("VALIDATION_ERROR: Invalid date");

    expect(attempts).toBe(1); // No retries for domain error!
  });

  it("4. should throw CONCURRENCY_LOCK_TIMEOUT after max retries exceeded", async () => {
    let attempts = 0;

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async () => {
        attempts++;
        const err = new Error("lock_not_available") as any;
        err.code = "55P03";
        throw err;
      }),
    };

    await expect(
      executeWithAdvisoryLock(
        mockPrisma as any,
        "emp-123",
        async () => "never-reached",
        { initialBackoffMs: 10, maxRetries: 3 }
      )
    ).rejects.toThrow(ConcurrencyLockError);

    expect(attempts).toBe(4); // 1 initial + 3 retries = 4
  });
});
