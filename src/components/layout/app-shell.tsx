import { Sidebar } from './sidebar';
import { Header } from './header';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ROLE_DISPLAY_NAMES } from '@/lib/rbac';
import { getGlobalProjectContext } from '@/lib/project-context';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const roleDisplayName = ROLE_DISPLAY_NAMES[session.role] || session.role;
  const globalContext = await getGlobalProjectContext(session);

  return (
    <div className="flex min-h-dvh w-full bg-slate-50 text-slate-900">
      <div className="hidden lg:block sticky top-0 h-dvh shrink-0">
        <Sidebar userRole={session.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <Header 
          userName={session.name} 
          userRole={roleDisplayName} 
          userRoleRaw={session.role}
          globalContext={globalContext}
        />
        <main className="min-w-0 flex-1 bg-slate-50">
          <div className="app-page-container p-4 pb-[calc(24px+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(24px+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
