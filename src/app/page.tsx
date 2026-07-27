import { requireAuth } from "@/lib/rbac";
import { getDefaultRouteForRole } from "@/lib/roles/role-workspace-policy";
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const session = await requireAuth();
  redirect(getDefaultRouteForRole(session.role));
}
