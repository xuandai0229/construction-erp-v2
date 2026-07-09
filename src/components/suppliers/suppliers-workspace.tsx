"use client";

import { useMemo, useState } from "react";
import { Pencil, Phone, Search, Trash2, UserPlus, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EnterpriseTable, FilterBar, KpiCard, PageHeader, ContentCard } from "@/components/ui/enterprise";
import type { SupplierDto } from "@/app/(dashboard)/suppliers/actions";
import type { SupplierPermissionSet } from "@/lib/suppliers/suppliers-permissions";
import { SupplierFormDialog } from "./supplier-form-dialog";
import { SupplierDetailDrawer } from "./supplier-detail-drawer";
import { createSupplier, updateSupplier, deleteSupplier } from "@/app/(dashboard)/suppliers/actions";
import { useToast } from "@/components/ui/toast-context";
import { useRouter } from "next/navigation";

interface SuppliersWorkspaceProps {
  suppliers: SupplierDto[];
  permissions: SupplierPermissionSet;
}

export function SuppliersWorkspace({ suppliers, permissions }: SuppliersWorkspaceProps) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<SupplierDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.code, s.phone || "", s.taxCode || "", s.contactPerson || ""].some(
        (v) => v.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [suppliers, normalizedSearch]);

  // Summary stats
  const totalCount = suppliers.length;
  const withContract = suppliers.filter((s) => s.contractCount > 0).length;
  const withPhone = suppliers.filter((s) => s.phone).length;

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (supplier: SupplierDto) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: {
    code?: string;
    name: string;
    taxCode?: string;
    address?: string;
    phone?: string;
    email?: string;
    contactPerson?: string;
  }) => {
    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, data);
        toast.success("Đã cập nhật");
      } else {
        await createSupplier(data);
        toast.success("Đã thêm đối tác");
      }
      setIsFormOpen(false);
      setEditingSupplier(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (supplier: SupplierDto) => {
    setIsSubmitting(true);
    try {
      await deleteSupplier(supplier.id);
      toast.success("Đã xóa");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryCards = [
    { label: "Tổng đối tác", value: totalCount, unit: "", tone: "blue" as const },
    { label: "Có hợp đồng", value: withContract, unit: "", tone: "emerald" as const },
    { label: "Có SĐT", value: withPhone, unit: "", tone: "indigo" as const },
  ];

  const toneIconMap = {
    blue: Users,
    emerald: UserPlus,
    indigo: Phone,
  };

  return (
    <div className="app-page mx-auto max-w-[1400px] space-y-5">
      {/* Header */}
      <PageHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Nhà cung cấp & thầu phụ</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Quản lý danh bạ đối tác cung ứng và đơn vị thi công.
            </p>
          </div>
          {permissions.canCreate && (
            <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              Thêm đối tác
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Summary Cards */}
      {suppliers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = toneIconMap[card.tone];
            return (
              <KpiCard
                key={card.label}
                label={card.label}
                value={card.value}
                tone={card.tone}
                icon={<Icon className="h-5 w-5" />}
              />
            );
          })}
        </div>
      )}

      {/* Search & Filter */}
      {suppliers.length > 0 && (
        <FilterBar className="grid gap-3 md:grid-cols-[minmax(0,420px)_auto] md:items-center md:justify-between">
          <div className="relative">
            <label htmlFor="suppliers-search" className="sr-only">Tìm tên, SĐT, MST...</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="suppliers-search"
              type="text"
              placeholder="Tìm tên, SĐT, MST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="text-sm font-medium text-slate-500">
            {filtered.length} / {suppliers.length} đối tác
          </div>
        </FilterBar>
      )}

      {/* Desktop Table */}
      {suppliers.length > 0 && (
        <EnterpriseTable className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Đối tác</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">SĐT</th>
                  <th className="px-4 py-3">MST</th>
                  <th className="px-4 py-3 text-right">Hợp đồng</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((supplier) => (
                  <tr key={supplier.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">{supplier.code}</td>
                    <td className="px-4 py-3">
                      <button 
                        type="button" 
                        className="font-semibold text-slate-950 hover:text-blue-600 hover:underline transition-colors text-left"
                        onClick={() => setViewingSupplier(supplier)}
                      >
                        {supplier.name}
                      </button>
                      {supplier.address && (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{supplier.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{supplier.contactPerson || <span className="text-slate-400">-</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{supplier.phone || <span className="text-slate-400">-</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{supplier.taxCode || <span className="text-slate-400">-</span>}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-950">
                      {supplier.contractCount > 0 ? supplier.contractCount : <span className="text-xs font-medium font-sans text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingSupplier(supplier)}
                          className="h-8 w-8 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {permissions.canUpdate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(supplier)}
                            className="h-8 w-8 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                            title="Sửa đối tác"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {permissions.canDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(supplier)}
                            disabled={isSubmitting || supplier.contractCount > 0}
                            className="h-8 w-8 text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={supplier.contractCount > 0 ? "Không thể xóa khi có hợp đồng" : "Xóa đối tác"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      Không tìm thấy đối tác phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </EnterpriseTable>
      )}

      {/* Mobile Cards */}
      {suppliers.length > 0 && (
        <div className="space-y-3 md:hidden">
          {filtered.map((supplier) => (
            <ContentCard key={supplier.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button 
                    type="button" 
                    className="font-bold text-slate-950 hover:text-blue-600 text-left transition-colors"
                    onClick={() => setViewingSupplier(supplier)}
                  >
                    {supplier.name}
                  </button>
                  <div className="mt-1 font-mono text-xs font-semibold text-slate-500">{supplier.code}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewingSupplier(supplier)}
                    className="h-8 w-8 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {permissions.canUpdate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(supplier)}
                      className="h-8 w-8 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                      title="Sửa đối tác"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {permissions.canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(supplier)}
                      disabled={isSubmitting || supplier.contractCount > 0}
                      className="h-8 w-8 text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={supplier.contractCount > 0 ? "Không thể xóa khi có hợp đồng" : "Xóa đối tác"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs font-semibold text-slate-500">Liên hệ</div>
                  <div className="mt-1 font-bold text-slate-900">{supplier.contactPerson || "-"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs font-semibold text-slate-500">SĐT</div>
                  <div className="mt-1 font-bold text-slate-900">{supplier.phone || "-"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs font-semibold text-slate-500">MST</div>
                  <div className="mt-1 truncate font-mono text-xs font-bold text-slate-900">{supplier.taxCode || "-"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-right">
                  <div className="text-xs font-semibold text-slate-500">Hợp đồng</div>
                  <div className="mt-1 font-mono font-bold text-slate-900">{supplier.contractCount}</div>
                </div>
              </div>
              {supplier.address && (
                <div className="mt-2 truncate text-xs text-slate-500">{supplier.address}</div>
              )}
            </ContentCard>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-[14px] lg:rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Không tìm thấy đối tác phù hợp.
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {suppliers.length === 0 && (
        <EmptyState
          title="Chưa có đối tác"
          description="Thêm nhà cung cấp hoặc thầu phụ để quản lý danh bạ dùng chung."
          icon={<Users className="h-6 w-6 text-slate-500" />}
          action={
            permissions.canCreate ? (
              <Button onClick={handleOpenCreate} variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Thêm đối tác
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Form dialog */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <SupplierFormDialog
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingSupplier(null);
          }}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          initialData={editingSupplier}
        />
      )}

      {/* Detail Drawer */}
      <SupplierDetailDrawer
        isOpen={!!viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        supplier={viewingSupplier}
        permissions={permissions}
        onEdit={(s) => {
          setViewingSupplier(null);
          handleOpenEdit(s);
        }}
        onDelete={(s) => {
          setViewingSupplier(null);
          handleDelete(s);
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
