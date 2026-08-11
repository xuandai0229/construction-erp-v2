import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMaterialProposal } from "@/lib/material-proposals/actions";
import { MaterialProposalDocumentView } from "@/components/materials/material-proposal-document-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Đề xuất vật tư | ERP Công trình" };

export default async function MaterialProposalStandaloneDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoPrint?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const { id } = await params;
  const { autoPrint } = await searchParams;

  let proposal;
  try {
    proposal = await getMaterialProposal(id);
  } catch (error) {
    console.error("[MaterialProposalStandaloneDocumentPage] Load failed:", error);
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

  const shouldAutoPrint = autoPrint === "true";

  return (
    <main
      data-proposal-document-root="true"
      data-document-ready="true"
      className="w-full min-h-screen bg-white text-slate-900 p-0 m-0 print:p-0 print:bg-white"
    >
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          [data-app-shell],
          header,
          aside,
          nav,
          [data-preview-toolbar],
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Auto print script trigger if ?autoPrint=true */}
      {shouldAutoPrint && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                setTimeout(function() {
                  window.print();
                }, 300);
              });
            `,
          }}
        />
      )}

      <div className="mx-auto w-[297mm] p-[10mm] bg-white print:p-[10mm] print:w-[297mm] print:max-w-none print:shadow-none">
        <MaterialProposalDocumentView proposal={formattedProposal} />
      </div>
    </main>
  );
}
