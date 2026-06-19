import { Building2 } from "lucide-react";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="h-8 w-48 bg-slate-200 rounded-md"></div>
        <div className="h-10 w-36 bg-slate-200 rounded-md"></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-3 md:p-4 bg-white">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="h-10 flex-1 bg-slate-100 rounded-md border border-slate-200"></div>
            <div className="h-10 w-full sm:w-40 bg-slate-100 rounded-md border border-slate-200"></div>
            <div className="h-10 w-full sm:w-24 bg-slate-200 rounded-md"></div>
          </div>
        </div>

        {/* Desktop View Skeleton */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <th key={i} className="px-5 py-3.5"><div className="h-4 bg-slate-200 rounded w-24"></div></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-200 rounded w-20"></div></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-200 rounded w-48"></div></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded w-32"></div></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-100 rounded w-32"></div></td>
                  <td className="px-5 py-4"><div className="h-6 bg-slate-200 rounded-full w-24"></div></td>
                  <td className="px-5 py-4 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-24"></div>
                    <div className="h-3 bg-slate-100 rounded w-24"></div>
                  </td>
                  <td className="px-5 py-4"><div className="h-8 bg-slate-100 rounded w-24 ml-auto"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Skeleton */}
        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border border-slate-200 rounded-xl space-y-4">
              <div className="flex justify-between">
                <div className="h-5 bg-slate-200 rounded w-16"></div>
                <div className="h-6 bg-slate-200 rounded-full w-24"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
              </div>
              <div className="h-10 bg-slate-100 rounded w-full mt-4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
