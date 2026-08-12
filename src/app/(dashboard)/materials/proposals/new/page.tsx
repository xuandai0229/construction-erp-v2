import { getActiveProjects } from "@/app/(dashboard)/materials/actions";
import { getSession } from "@/lib/auth";
import { getMaterialProposal } from "@/lib/material-proposals/actions";
import { isHighLevel } from "@/lib/material-proposals/permissions";
import { MaterialProposalForm } from "@/components/materials/material-proposal-form";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NewMaterialProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; edit?: string; returnTo?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const projects = await getActiveProjects();
  const params = await searchParams;

  const catalogItemsRaw = await prisma.materialItem.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
      manufacturer: true,
      origin: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  let initialProposal = undefined;
  if (params.edit) {
    const rawProposal = await getMaterialProposal(params.edit).catch(() => null);
    if (rawProposal && (rawProposal.requestedById === session.id || isHighLevel(session.role))) {
      initialProposal = {
        id: rawProposal.id,
        proposalNo: rawProposal.proposalNo,
        projectId: rawProposal.projectId,
        projectNameSnapshot: rawProposal.projectNameSnapshot,
        projectLocationSnapshot: rawProposal.projectLocationSnapshot,
        requestedById: rawProposal.requestedById,
        requesterNameSnapshot: rawProposal.requesterNameSnapshot,
        requesterRoleSnapshot: rawProposal.requesterRoleSnapshot,
        proposalDate: rawProposal.proposalDate,
        purchaseReason: rawProposal.purchaseReason,
        requiredDeliveryDate: rawProposal.requiredDeliveryDate,
        items: rawProposal.items.map((item) => ({
          id: item.id,
          sequence: item.sequence,
          sectionName: item.sectionName,
          materialItemId: item.materialItemId,
          materialCodeSnapshot: item.materialCodeSnapshot,
          materialName: item.materialName,
          unit: item.unit,
          contractQuantityText: item.contractQuantityText,
          actualQuantity: Number(item.actualQuantity),
          specification: item.specification,
          manufacturerOrigin: item.manufacturerOrigin,
          note: item.note,
        })),
      };
    }
  }

  const initialProjectId = initialProposal?.projectId || params.projectId || projects[0]?.id || "";

  return (
    <MaterialProposalForm
      initialProposal={initialProposal}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        code: project.code,
        location: project.location,
      }))}
      catalogItems={catalogItemsRaw}
      currentUserId={session.id}
      currentUserName={session.name || session.email || "Người dùng"}
      currentUserRole={session.role}
      initialProjectId={initialProjectId}
      returnTo={params.returnTo}
    />
  );
}
