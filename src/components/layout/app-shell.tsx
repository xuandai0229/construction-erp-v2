import { Sidebar } from './sidebar';
import { Header } from './header';
import { getSession } from '@/lib/auth';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={session?.name} userRole={session?.role} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
