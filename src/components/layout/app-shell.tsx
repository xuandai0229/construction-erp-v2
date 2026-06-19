import { Sidebar } from './sidebar';
import { Header } from './header';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ROLE_DISPLAY_NAMES } from '@/lib/rbac';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const roleDisplayName = ROLE_DISPLAY_NAMES[session.role] || session.role;

  return (
    <div className="flex min-h-dvh w-full bg-slate-50">
      <div className="hidden lg:block sticky top-0 h-dvh shrink-0">
        <Sidebar userRole={session.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <Header 
          userName={session.name} 
          userRole={roleDisplayName} 
          userRoleRaw={session.role}
        />
        <main className="flex-1 bg-slate-50">
          <div className="min-h-full bg-slate-50 p-4 sm:p-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
