"use client";

import { AlertTriangle, ArrowRight, Building2, ClipboardList, Package, TrendingDown } from "lucide-react";
import type {
  MaterialMovementDto,
  PortfolioCatalogItemDto,
  PortfolioOverviewDto,
  PortfolioStockItemDto,
} from "@/app/(dashboard)/materials/actions";
import { ContentCard, SafeText } from "@/components/ui/enterprise";
import { InteractiveKpiCard } from "@/components/ui/interactive-kpi-card";

type ProjectOption = { id: string; name: string };

interface Props {
  overview: PortfolioOverviewDto;
  projects: ProjectOption[];
  catalog: PortfolioCatalogItemDto[];
  stocks: PortfolioStockItemDto[];
  proposals: Array<{ projectId?: string }>;
  transactions: MaterialMovementDto[];
  onNavigate: (tab: string) => void;
  onSelectProject: (projectId: string) => void;
}

function projectTone(lowStockCount: number, attentionProposalCount: number) {
  if (lowStockCount > 0) return { label: "Cần chú ý", className: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (attentionProposalCount > 0) return { label: "Theo dõi", className: "bg-blue-50 text-blue-700 ring-blue-200" };
  return { label: "Bình thường", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
}

export function MaterialsPortfolioOverview({
  overview,
  projects,
  catalog,
  stocks,
  proposals,
  transactions,
  onNavigate,
  onSelectProject,
}: Props) {
  const attentionByProject = new Map(
    overview.attentionProjects.map((project) => [project.projectId, project.pendingProposalsCount]),
  );
  const projectRows = projects
    .map((project) => {
      const materialCount = catalog.reduce(
        (count, item) => count + item.projectsBreakdown.filter((entry) => entry.projectId === project.id).length,
        0,
      );
      const lowStockCount = stocks.reduce(
        (count, item) => count + item.projectsBreakdown.filter((entry) => entry.projectId === project.id && (entry.stock < 0 || (entry.minStockLevel > 0 && entry.stock <= entry.minStockLevel))).length,
        0,
      );
      const proposalCount = proposals.filter((proposal) => proposal.projectId === project.id).length;
      const attentionProposalCount = attentionByProject.get(project.id) || 0;
      const transactionCount = transactions.filter((transaction) => transaction.projectId === project.id).length;
      return { ...project, materialCount, lowStockCount, proposalCount, attentionProposalCount, transactionCount };
    })
    .filter((project) => project.materialCount > 0 || project.proposalCount > 0 || project.transactionCount > 0)
    .sort((a, b) => b.lowStockCount - a.lowStockCount || b.proposalCount - a.proposalCount || b.transactionCount - a.transactionCount || a.name.localeCompare(b.name, "vi"));

  const attentionRows = projectRows.filter((project) => project.lowStockCount > 0 || project.attentionProposalCount > 0).slice(0, 6);
  const cards = [
    { label: "Công trình có dữ liệu vật tư", value: overview.projectsWithMaterialData, helper: `trên tổng số ${overview.totalProjects} công trình`, icon: <Building2 className="h-5 w-5" />, tone: "blue" as const, tab: "catalog" },
    { label: "Loại vật tư đang được quản lý", value: overview.totalMaterialItems, helper: "bản ghi vật tư theo từng công trình", icon: <Package className="h-5 w-5" />, tone: "indigo" as const, tab: "catalog" },
    { label: "Công trình đang thiếu tồn", value: overview.lowStockProjectsCount, helper: `${overview.lowStockItemsCount} vật tư cần kiểm tra`, icon: <AlertTriangle className="h-5 w-5" />, tone: overview.lowStockProjectsCount > 0 ? ("amber" as const) : ("emerald" as const), tab: "stock" },
    { label: "Đề xuất vật tư đang theo dõi", value: overview.totalProposalsCount, helper: "không bao gồm phiếu đã hủy", icon: <ClipboardList className="h-5 w-5" />, tone: "indigo" as const, tab: "requests" },
    { label: "Giao dịch nhập/xuất phát sinh", value: overview.recentMovementsCount, helper: "toàn bộ lịch sử được phép xem", icon: <TrendingDown className="h-5 w-5" />, tone: "emerald" as const, tab: "transactions" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => <InteractiveKpiCard key={card.label} {...card} onClick={() => onNavigate(card.tab)} />)}
      </div>

      <ContentCard className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-bold text-slate-950">Tình hình vật tư theo công trình</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Chọn một công trình để vào không gian vận hành vật tư tương ứng.</p>
          </div>
          <span className="text-sm font-medium text-[var(--muted-foreground)]">{projectRows.length} công trình có phát sinh</span>
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[850px] table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr><th className="w-[52%] px-5 py-3">Công trình</th><th className="w-[8%] px-3 py-3 text-right">Vật tư</th><th className="w-[10%] px-3 py-3 text-right">Thiếu tồn</th><th className="w-[10%] px-3 py-3 text-right">Đề xuất</th><th className="w-[12%] px-3 py-3 text-right">Nhập/xuất gần đây</th><th className="w-[8%] px-5 py-3 text-right">Mức độ</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectRows.map((project) => {
                const tone = projectTone(project.lowStockCount, project.attentionProposalCount);
                return <tr key={project.id} onClick={() => onSelectProject(project.id)} className="cursor-pointer transition hover:bg-slate-50 focus-within:bg-slate-50"><td className="px-5 py-4"><SafeText lines={2} className="font-semibold leading-5 text-slate-900">{project.name}</SafeText></td><td className="px-3 py-4 text-right tabular-nums">{project.materialCount}</td><td className="px-3 py-4 text-right tabular-nums">{project.lowStockCount}</td><td className="px-3 py-4 text-right tabular-nums">{project.proposalCount}</td><td className="px-3 py-4 text-right tabular-nums">{project.transactionCount}</td><td className="px-5 py-4 text-right"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${tone.className}`}>{tone.label}</span></td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-slate-100 lg:hidden">
          {projectRows.map((project) => { const tone = projectTone(project.lowStockCount, project.attentionProposalCount); return <button type="button" key={project.id} onClick={() => onSelectProject(project.id)} className="w-full px-4 py-4 text-left active:bg-slate-50"><SafeText lines={2} className="font-semibold leading-5 text-slate-900">{project.name}</SafeText><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]"><span>{project.materialCount} vật tư</span><span>{project.lowStockCount} thiếu</span><span>{project.proposalCount} đề xuất</span><span>{project.transactionCount} giao dịch</span></div><span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${tone.className}`}>{tone.label}</span></button>; })}
        </div>
      </ContentCard>

      <ContentCard className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5"><div><h2 className="text-base font-bold text-slate-950">Công trình cần chú ý</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Ưu tiên theo số vật tư thiếu tồn, sau đó là đề xuất đang phát sinh.</p></div></div>
        <div className="divide-y divide-slate-100">
          {attentionRows.map((project) => { const tone = projectTone(project.lowStockCount, project.attentionProposalCount); return <button type="button" key={project.id} onClick={() => onSelectProject(project.id)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"><div className="min-w-0"><SafeText lines={2} className="font-semibold leading-5 text-slate-900">{project.name}</SafeText><p className="mt-1 text-sm text-[var(--muted-foreground)]">{project.lowStockCount > 0 ? `${project.lowStockCount} vật tư thiếu tồn` : "Không thiếu tồn"}{project.attentionProposalCount > 0 ? ` · ${project.attentionProposalCount} đề xuất cần theo dõi` : ""}</p></div><div className="flex shrink-0 items-center gap-2"><span className={`hidden rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset sm:inline-flex ${tone.className}`}>{tone.label}</span><ArrowRight className="h-4 w-4 text-slate-400" /></div></button>; })}
          {attentionRows.length === 0 && <div className="px-5 py-8 text-sm text-emerald-700">Không có công trình cần xử lý ngay.</div>}
        </div>
      </ContentCard>
    </div>
  );
}
