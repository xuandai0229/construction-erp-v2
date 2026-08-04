import React from "react";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
