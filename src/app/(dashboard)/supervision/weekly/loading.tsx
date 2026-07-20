import { ContentCard, PageHeader, PageHeading } from "@/components/ui/enterprise";

export default function SupervisionWeeklyLoading() {
  return <div className="space-y-5" aria-busy="true" aria-live="polite">
    <PageHeader>
      <PageHeading title="Báo cáo tuần Giám sát" description="Đang kiểm tra trạng thái cơ sở dữ liệu và tải hồ sơ tuần." />
    </PageHeader>
    <ContentCard className="space-y-3 p-6">
      <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
      <span className="sr-only">Đang tải</span>
    </ContentCard>
  </div>;
}
