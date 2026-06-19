import { ProjectForm } from "@/components/projects/project-form";
import prisma from "@/lib/prisma";
import { requireManagementAccessOrRedirect } from "@/lib/rbac";
import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagementAccessOrRedirect();
  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id, deletedAt: null }
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Building2 className="h-6 w-6 text-slate-500" />
        <h1 className="text-2xl font-bold text-slate-900">Sửa công trình: {project.name}</h1>
      </div>
      
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProjectForm initialData={project} />
      </div>
    </div>
  );
}
