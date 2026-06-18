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
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar userRole={session.role} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header 
          userName={session.name} 
          userRole={roleDisplayName} 
          userRoleRaw={session.role}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
