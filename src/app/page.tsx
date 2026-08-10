import { requireAuth } from "@/lib/rbac";
import { getDefaultRouteForRole } from "@/lib/roles/role-workspace-policy";
import { redirect } from 'next/navigation';
import { measureServerPhase } from "@/lib/performance/server";

export default async function RootPage() {
  return measureServerPhase("root-role-redirect", async () => {
    const session = await requireAuth();
    redirect(getDefaultRouteForRole(session.role));
  });
}
