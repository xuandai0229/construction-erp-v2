import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  return <div className="w-full">{children}</div>;
}

