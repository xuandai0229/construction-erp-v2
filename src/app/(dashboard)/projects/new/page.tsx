import { ProjectForm } from "@/components/projects/project-form";
import { Building2 } from "lucide-react";
import { requireManagementAccessOrRedirect } from "@/lib/rbac";

export default async function NewProjectPage() {
  await requireManagementAccessOrRedirect();
  return (
    <div className="app-page space-y-6">
      <div className="flex items-center space-x-2">
        <Building2 className="h-6 w-6 text-[var(--muted-foreground)]" />
        <h1 className="page-heading">Tạo mới công trình</h1>
      </div>
      
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
        <ProjectForm />
      </div>
    </div>
  );
}
