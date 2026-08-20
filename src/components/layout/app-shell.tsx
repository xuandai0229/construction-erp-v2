import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { MobileProjectContextBar } from './mobile-project-context-bar';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ROLE_DISPLAY_NAMES } from '@/lib/rbac';
import { getGlobalProjectContext } from '@/lib/project-context';
import { serializePrisma } from '@/lib/serialize';
import { checkUserHasAnyHrPermission } from '@/lib/hr/hr-auth-guard';
import { measureServerPhase } from '@/lib/performance/server';
import { ClientRenderProfiler } from '@/components/performance/client-render-profiler';

import { AutoRevalidateListener } from '@/components/common/auto-revalidate-listener';
import { AIAssistantDrawer } from '@/components/ai/ai-assistant-drawer';
import { isUserInPilotCohort } from '@/lib/ai/pilot/ai-pilot-cohort';

export async function AppShell({ children }: { children: React.ReactNode }) {
  return measureServerPhase('app-shell', async () => {
    const session = await getSession();

    if (!session) {
      redirect("/login?reason=session_expired");
    }

    const roleDisplayName = ROLE_DISPLAY_NAMES[session.role] || session.role;
    const [globalContextRaw, canAccessHr] = await Promise.all([
      getGlobalProjectContext(session),
      checkUserHasAnyHrPermission(session.id, session.role),
    ]);
    const globalContext = serializePrisma(globalContextRaw);

    return (
      <ClientRenderProfiler id="AppShell">
        <AutoRevalidateListener />
        <div className="flex min-h-dvh min-w-0 w-full max-w-full bg-background text-foreground" data-app-shell>
          <div className="hidden lg:block sticky top-0 h-dvh shrink-0" data-app-sidebar>
            <ClientRenderProfiler id="Sidebar">
              <Sidebar userRole={session.role} canAccessHr={canAccessHr} />
            </ClientRenderProfiler>
          </div>
          <div className="flex h-dvh min-w-0 max-w-full flex-1 flex-col overflow-y-auto bg-background" data-app-frame>
            <div data-app-header>
              <ClientRenderProfiler id="Header">
                <Header
                  userName={session.name}
                  userRole={roleDisplayName}
                  userRoleRaw={session.role}
                  globalContext={globalContext}
                />
              </ClientRenderProfiler>
            </div>
            <div data-app-mobile-context><MobileProjectContextBar globalContext={globalContext} /></div>
            <main className="min-w-0 max-w-full flex-1 bg-background" data-app-main>
              <div className="app-page-container p-3 pb-[calc(72px+env(safe-area-inset-bottom))] sm:p-5 lg:p-6 lg:pb-6 xl:p-7 xl:pb-7" data-app-content>
                {children}
              </div>
            </main>
            <div data-app-bottom-nav><MobileBottomNav userRole={session.role} canAccessHr={canAccessHr} /></div>
            {isUserInPilotCohort(session) && (() => {
              const activeProject = globalContext?.accessibleProjects.find(
                (p) => p.id === globalContext.selectedProjectId
              );
              return (
                <AIAssistantDrawer
                  activeProjectId={activeProject?.id}
                  activeProjectName={activeProject?.displayName || activeProject?.name}
                />
              );
            })()}
          </div>
        </div>
      </ClientRenderProfiler>
    );
  });
}
