import { redirect } from "next/navigation";

export default async function MaterialRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Redirect to the centralized materials module
  redirect(`/materials?tab=requests&projectId=${id}`);
}
