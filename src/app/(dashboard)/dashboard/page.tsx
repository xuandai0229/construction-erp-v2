import { requireAuth } from '@/lib/rbac';
import { getDashboardData } from '@/lib/dashboard/dashboard-queries';
import { OperationalDashboard } from '@/components/dashboard/operational-dashboard';
import { ExecutiveDashboard } from '@/components/dashboard/executive/executive-dashboard';
import { getGlobalProjectContext } from '@/lib/project-context';

type DashboardPageProps = {
  searchParams: Promise<{ period?: string; projectId?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const currentSession = await requireAuth();
  const params = await searchParams;
  
  // Resolve projectId globally (URL > Cookie)
  const globalContext = await getGlobalProjectContext(currentSession, params.projectId);
  
  const data = await getDashboardData(currentSession, params.period, globalContext.selectedProjectId || undefined);

  const isHighLevel = ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'].includes(currentSession.role);

  if (isHighLevel) {
    return <ExecutiveDashboard data={data} />;
  }

  return <OperationalDashboard data={data} />;
}
