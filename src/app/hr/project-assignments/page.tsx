import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getProjectAssignmentsQuery,
  getAssignmentFormOptionsQuery,
} from "./actions/project-assignment-actions";
import { ProjectAssignmentWorkspace } from "@/components/hr/project-assignments/project-assignment-workspace";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    projectId?: string;
    employeeId?: string;
    status?: string;
  }>;
}

export default async function HrProjectAssignmentsPage(props: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const projectId = searchParams.projectId || undefined;
  const employeeId = searchParams.employeeId || undefined;
  const status = searchParams.status && searchParams.status !== "ALL" ? (searchParams.status as any) : undefined;

  const [listRes, optionsRes] = await Promise.all([
    getProjectAssignmentsQuery({ page, pageSize: 20, projectId, employeeId, status }),
    getAssignmentFormOptionsQuery(),
  ]);

  if (!listRes.success) {
    if (listRes.code === "PERMISSION_DENIED" || listRes.code === "AUTHENTICATION_REQUIRED") {
      return (
        <div className="p-6">
          <HrAccessDenied message={listRes.error} />
        </div>
      );
    }
  }

  const items = listRes.success ? listRes.data.items : [];
  const total = listRes.success ? listRes.data.total : 0;

  const options = optionsRes.success
    ? optionsRes.data
    : {
        employees: [],
        projects: [],
        roles: [],
        capabilities: {
          canCreate: false,
          canUpdate: false,
          canRelease: false,
          canOverride: false,
          userRole: session.role,
        },
      };

  return (
    <ProjectAssignmentWorkspace
      initialItems={items}
      total={total}
      currentPage={page}
      pageSize={20}
      employees={options.employees}
      projects={options.projects}
      roles={options.roles}
      capabilities={options.capabilities}
    />
  );
}
