"use client";

import { Profiler, type ReactNode } from "react";

type RenderSample = {
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
};

declare global {
  interface Window {
    __perfReactRenderSamples__?: RenderSample[];
  }
}

const enabled = process.env.NEXT_PUBLIC_PERF_PROFILE === "1";

export function ClientRenderProfiler({ id, children }: { id: string; children: ReactNode }) {
  if (!enabled) return children;

  return (
    <Profiler
      id={id}
      onRender={(profileId, phase, actualDuration, baseDuration, startTime, commitTime) => {
        const samples = (window.__perfReactRenderSamples__ ??= []);
        samples.push({ id: profileId, phase, actualDuration, baseDuration, startTime, commitTime });
      }}
    >
      {children}
    </Profiler>
  );
}
