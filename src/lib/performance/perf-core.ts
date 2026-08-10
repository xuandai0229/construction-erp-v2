export type PerfEvent = {
  requestId?: string;
  route?: string;
  phase: string;
  durationMs: number;
  model?: string;
  operation?: string;
};

export function isPerformanceProfilingEnabled() {
  return process.env.PERF_PROFILE === "1";
}

export function createPerformanceRequestId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

export function logPerformanceEvent(event: PerfEvent) {
  if (!isPerformanceProfilingEnabled()) return;

  console.info(`[perf] ${JSON.stringify({
    requestId: event.requestId ?? "unknown",
    route: event.route ?? "unknown",
    phase: event.phase,
    durationMs: Math.round(event.durationMs * 100) / 100,
    ...(event.model ? { model: event.model } : {}),
    ...(event.operation ? { operation: event.operation } : {}),
  })}`);
}
