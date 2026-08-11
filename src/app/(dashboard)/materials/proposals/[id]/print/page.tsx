import { redirect } from "next/navigation";

export default async function MaterialProposalPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/proposal-export/${id}?autoPrint=true`);
}
