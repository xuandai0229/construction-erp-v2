import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { DashboardDocumentItem } from "@/lib/dashboard/dashboard-queries";
import { formatDateVNShort } from "@/lib/dashboard/dashboard-formatters";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { ContentCard } from "@/components/ui/enterprise";

export function DashboardRecentDocuments({ documents }: { documents: DashboardDocumentItem[] }) {
  return (
    <ContentCard className="flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-950">Tài liệu mới</h2>
        <Link href="/documents" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
          Xem <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-4">
        {documents.length === 0 ? (
          <DashboardEmptyState title="Chưa có tài liệu mới" className="min-h-[160px]" />
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <Link key={document.id} href={document.href} className="flex gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-bold text-slate-950">{document.title}</span>
                  <span className="mt-1 block text-xs font-medium text-slate-600">{document.projectName} · {document.uploadedBy}</span>
                  <span className="mt-1 block text-xs text-slate-600">{document.extension.toUpperCase()} · {formatDateVNShort(document.createdAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentCard>
  );
}
