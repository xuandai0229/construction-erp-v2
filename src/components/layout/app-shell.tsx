import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { MobileProjectContextBar } from './mobile-project-context-bar';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ROLE_DISPLAY_NAMES } from '@/lib/rbac';
import { getGlobalProjectContext } from '@/lib/project-context';
import { serializePrisma } from '@/lib/serialize';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login?reason=session_expired");
  }

  const roleDisplayName = ROLE_DISPLAY_NAMES[session.role] || session.role;
  const globalContext = serializePrisma(await getGlobalProjectContext(session));

  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground" data-app-shell>
      <div className="hidden lg:block sticky top-0 h-dvh shrink-0" data-app-sidebar>
        <Sidebar userRole={session.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col h-dvh overflow-y-auto bg-background" data-app-frame>
        <Header 
          userName={session.name} 
          userRole={roleDisplayName} 
          userRoleRaw={session.role}
          globalContext={globalContext}
        />
        <div data-app-mobile-context><MobileProjectContextBar globalContext={globalContext} /></div>
        <main className="min-w-0 flex-1 bg-background" data-app-main>
          <div className="app-page-container p-3 pb-[calc(72px+env(safe-area-inset-bottom))] sm:p-5 lg:p-6 lg:pb-6" data-app-content>
            {children}
          </div>
        </main>
        <MobileBottomNav userRole={session.role} />
      </div>
    </div>
  );
}
