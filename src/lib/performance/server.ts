import "server-only";

import { headers } from "next/headers";
import {
  isPerformanceProfilingEnabled,
  logPerformanceEvent,
  type PerfEvent,
} from "./perf-core";

type PerfContext = Pick<PerfEvent, "requestId" | "route">;

export async function getPerformanceRequestContext(): Promise<PerfContext> {
  if (!isPerformanceProfilingEnabled()) return {};

  try {
    const requestHeaders = await headers();
    return {
      requestId: requestHeaders.get("x-perf-request-id") ?? undefined,
      route: requestHeaders.get("x-perf-route") ?? undefined,
    };
  } catch {
    // Calls made outside a Next request (scripts/tests) remain safe and unlogged.
    return {};
  }
}

export async function measureServerPhase<T>(phase: string, run: () => T): Promise<Awaited<T>> {
  if (!isPerformanceProfilingEnabled()) return await run();

  const context = await getPerformanceRequestContext();
  const startedAt = performance.now();
  try {
    return await run();
  } finally {
    logPerformanceEvent({
      ...context,
      phase,
      durationMs: performance.now() - startedAt,
    });
  }
}

export async function logPrismaQuery(model: string, operation: string, durationMs: number) {
  if (!isPerformanceProfilingEnabled()) return;

  const context = await getPerformanceRequestContext();
  logPerformanceEvent({
    ...context,
    phase: "prisma-query",
    model,
    operation,
    durationMs,
  });
}
