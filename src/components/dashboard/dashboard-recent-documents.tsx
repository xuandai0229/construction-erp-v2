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
      <div className="p-3 sm:p-4">
        {documents.length === 0 ? (
          <DashboardEmptyState title="Chưa có tài liệu mới" className="min-h-[120px] sm:min-h-[160px]" />
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {documents.map((document) => (
              <Link key={document.id} href={document.href} className="flex gap-2.5 sm:gap-3 rounded-xl border border-slate-200 p-2.5 sm:p-3 hover:bg-slate-50 transition-colors">
                <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-700">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-[13px] sm:text-sm font-bold text-slate-950">{document.title}</span>
                  <span className="mt-0.5 sm:mt-1 block text-[11px] sm:text-xs font-medium text-slate-600 truncate">{document.projectName} · {document.uploadedBy}</span>
                  <span className="mt-0.5 sm:mt-1 block text-[11px] sm:text-xs text-slate-500">{document.extension.toUpperCase()} · {formatDateVNShort(document.createdAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentCard>
  );
}
