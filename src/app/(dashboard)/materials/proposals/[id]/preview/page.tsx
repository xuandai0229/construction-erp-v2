import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMaterialProposal } from "@/lib/material-proposals/actions";
import { MaterialProposalPreviewToolbar } from "@/components/materials/material-proposal-preview-toolbar";
import { MaterialProposalDocumentView } from "@/components/materials/material-proposal-document-view";

export const metadata = { title: "Xem trước đề xuất vật tư | ERP Công trình" };

export default async function MaterialProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const { id } = await params;

  let proposal;
  try {
    proposal = await getMaterialProposal(id);
  } catch (error) {
    console.error("[MaterialProposalPreviewPage] Load failed:", error);
    notFound();
  }

  if (!proposal) notFound();

  const formattedProposal = {
    ...proposal,
    proposalDate: proposal.proposalDate.toISOString(),
    requiredDeliveryDate: proposal.requiredDeliveryDate ? proposal.requiredDeliveryDate.toISOString() : null,
    items: proposal.items.map((item) => ({
      ...item,
      actualQuantity: Number(item.actualQuantity),
    })),
  };

  return (
    <div
      className="w-full min-h-screen bg-slate-200/80 p-4 sm:p-8 print:p-0 print:bg-white"
      data-proposal-preview-page="true"
    >
      <div className="max-w-[297mm] mx-auto">
        <MaterialProposalPreviewToolbar
          proposalId={proposal.id}
          proposalNo={proposal.proposalNo}
          backHref={`/materials/proposals/new?edit=${proposal.id}`}
        />
        <div className="canvas-container w-full overflow-x-auto print:overflow-visible">
          <main className="document-paper shadow-2xl border border-slate-300 rounded-sm bg-white p-[15mm] mx-auto min-w-[297mm] max-w-[297mm] print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full">
            <MaterialProposalDocumentView proposal={formattedProposal} />
          </main>
        </div>
      </div>
    </div>
  );
}
