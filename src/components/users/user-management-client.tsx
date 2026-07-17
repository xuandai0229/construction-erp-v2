"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search, ShieldCheck, Lock, Unlock, Key, Building2, X, Eye, Edit, Trash2, RefreshCcw } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import { createUser, toggleUserActive, assignProjectToUser, unassignProjectFromUser, resetUserPassword, updateUser, softDeleteUser, restoreUser } from "@/app/(dashboard)/users/actions";

interface UserData {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  role: string;
  roleDisplay: string;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  assignedProjects: { id: string; code: string; name: string; role: string; roleDisplay: string }[];
  supervisionScopeType?: "ALL_PROJECTS" | "SELECTED_PROJECTS" | null;
  supervisionProjectIds?: string[];
}

interface ProjectData {
  id: string;
  code: string;
  name: string;
  status: string;
}

type SortField = "name" | "role" | "status";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

function getAccountStatus(user: UserData) {
  if (user.deletedAt) return { label: "Ngừng sử dụng", variant: "danger" as const };
  if (user.isActive) return { label: "Đang hoạt động", variant: "success" as const };
  return { label: "Đã khóa", variant: "danger" as const };
}

export function UserManagementClient({ initialUsers, projects, currentUserId, currentUserRole, allowedRoles, projectRoleOptions, roleLevels }: {
  initialUsers: UserData[];
  projects: ProjectData[];
  currentUserId: string;
  currentUserRole: string;
  allowedRoles: { role: string; label: string }[];
  projectRoleOptions: { role: string; label: string }[];
  roleLevels: Record<string, number>;
}) {
  const actorLevel = roleLevels[currentUserRole] ?? 0;
  const canManageUser = (user: UserData) => {
    if (currentUserRole === "ADMIN") return true;
    return (roleLevels[user.role] ?? 0) < actorLevel;
  };
  const canPerformSensitiveAction = (user: UserData) => canManageUser(user) && user.id !== currentUserId;
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all_active");
  const [projectFilter, setProjectFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const operationRef = useRef(false);
  const [error, setError] = useState("");
  const [detailUser, setDetailUser] = useState<UserData | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const toast = useToast();

  const withOperation = async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (operationRef.current) return undefined;
    operationRef.current = true;
    setLoading(true);
    try {
      return await operation();
    } catch {
      toast.error("Không thể hoàn tất thao tác. Vui lòng kiểm tra kết nối và thử lại.");
      return undefined;
    } finally {
      operationRef.current = false;
      setLoading(false);
    }
  };

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    variant: "danger" | "warning" | "info" | "success";
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false, title: "", description: "", variant: "info", confirmText: "", onConfirm: () => {}
  });

  const [resetPwUser, setResetPwUser] = useState<UserData | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState(allowedRoles.length > 0 ? allowedRoles[0].role : "STAFF");
  const [formProjectIds, setFormProjectIds] = useState<string[]>([]);
  const [formProjectRoles, setFormProjectRoles] = useState<Record<string, string>>({});
  const [formNote, setFormNote] = useState("");
  const [formSupervisionScope, setFormSupervisionScope] = useState<"ALL_PROJECTS" | "SELECTED_PROJECTS">("SELECTED_PROJECTS");
  const [formSupervisionProjectIds, setFormSupervisionProjectIds] = useState<string[]>([]);

  // Assign project state
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignProjectRole, setAssignProjectRole] = useState("");

  const filtered = useMemo(() => initialUsers.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.username || "").toLowerCase().includes(search.toLowerCase()) || (u.phone || "").includes(search);
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchProject = !projectFilter || u.assignedProjects.some((project) => project.id === projectFilter);
    let matchStatus = true;
    if (statusFilter === "all_active") {
      matchStatus = u.deletedAt === null;
    } else if (statusFilter === "active") {
      matchStatus = u.deletedAt === null && u.isActive;
    } else if (statusFilter === "inactive") {
      matchStatus = u.deletedAt === null && !u.isActive;
    } else if (statusFilter === "deleted") {
      matchStatus = u.deletedAt !== null;
    }
    return matchSearch && matchRole && matchProject && matchStatus;
  }), [initialUsers, projectFilter, roleFilter, search, statusFilter]);

  const sortedUsers = useMemo(() => [...filtered].sort((a, b) => {
    const statusRank = (user: UserData) => user.deletedAt ? 2 : user.isActive ? 0 : 1;
    const comparison = sortField === "name"
      ? a.name.localeCompare(b.name, "vi")
      : sortField === "role"
        ? a.roleDisplay.localeCompare(b.roleDisplay, "vi")
        : statusRank(a) - statusRank(b);
    return sortDirection === "asc" ? comparison : -comparison;
  }), [filtered, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [projectFilter, roleFilter, search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!showCreate && !detailUser && !editUser && !assignUserId && !resetPwUser) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || confirmState.isOpen) return;
      if (resetPwUser) setResetPwUser(null);
      else if (assignUserId) setAssignUserId(null);
      else if (editUser) setEditUser(null);
      else if (detailUser) setDetailUser(null);
      else setShowCreate(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [assignUserId, confirmState.isOpen, detailUser, editUser, resetPwUser, showCreate]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleCreate = async () => {
    if (operationRef.current) return;
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    operationRef.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await createUser({
        name: formName,
        email: formEmail,
        username: formUsername || undefined,
        phone: formPhone || undefined,
        password: formPassword,
        role: formRole as "ADMIN" | "DIRECTOR" | "DEPUTY_DIRECTOR" | "CHIEF_COMMANDER" | "MANAGER" | "ENGINEER" | "STAFF" | "SUPERVISION_HEAD",
        projectIds: formProjectIds.length > 0 ? formProjectIds : undefined,
        projectRoles: formProjectRoles as Record<string, "PROJECT_MANAGER" | "SITE_COMMANDER" | "CHIEF_COMMANDER" | "ASSISTANT_COMMANDER" | "QA_QC" | "HSE" | "SUPERVISOR" | "VIEWER">,
        note: formNote || undefined,
        supervisionScopeType: formRole === "SUPERVISION_HEAD" ? formSupervisionScope : undefined,
        supervisionProjectIds: formRole === "SUPERVISION_HEAD" && formSupervisionScope === "SELECTED_PROJECTS" ? formSupervisionProjectIds : undefined,
      });
      if (result.error) { setError(result.error); return; }
      setShowCreate(false);
      resetForm();
      toast.success("Đã tạo tài khoản mới.");
      router.refresh();
    } catch {
      setError("Không thể tạo tài khoản. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      operationRef.current = false;
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormUsername(""); setFormPhone("");
    setFormPassword(""); setFormRole(allowedRoles.length > 0 ? allowedRoles[0].role : "STAFF");
    setFormProjectIds([]); setFormProjectRoles({}); setFormNote(""); setError("");
    setFormSupervisionScope("SELECTED_PROJECTS"); setFormSupervisionProjectIds([]);
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setConfirmState({
      isOpen: true,
      title: isActive ? "Khóa tài khoản?" : "Mở khóa tài khoản?",
      description: isActive 
        ? "Người dùng sẽ không thể đăng nhập sau khi bị khóa.\nDữ liệu cũ vẫn được giữ nguyên để truy vết." 
        : "Người dùng sẽ có thể đăng nhập lại bình thường.",
      variant: isActive ? "warning" : "info",
      confirmText: isActive ? "Khóa tài khoản" : "Mở khóa",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        const res = await withOperation(() => toggleUserActive(userId));
        if (!res) return;
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(`Đã ${isActive ? 'khóa' : 'mở khóa'} tài khoản thành công`);
        }
        router.refresh();
      }
    });
  };

  const handleSoftDelete = async (user: UserData) => {
    setConfirmState({
      isOpen: true,
      title: "Xóa mềm tài khoản?",
      description: "Tài khoản sẽ bị khóa đăng nhập và ẩn khỏi danh sách mặc định.\nDữ liệu cũ vẫn được giữ lại để truy vết.\nHành động này không xóa vĩnh viễn dữ liệu.",
      variant: "danger",
      confirmText: "Xóa mềm tài khoản",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        const res = await withOperation(() => softDeleteUser(user.id));
        if (!res) return;
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Đã xóa mềm tài khoản thành công");
        }
        router.refresh();
      }
    });
  };

  const handleRestore = async (user: UserData) => {
    setConfirmState({
      isOpen: true,
      title: "Khôi phục tài khoản?",
      description: "Tài khoản sẽ được hiển thị lại và có thể đăng nhập nếu đang hoạt động.",
      variant: "success",
      confirmText: "Khôi phục",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        const res = await withOperation(() => restoreUser(user.id));
        if (!res) return;
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Đã khôi phục tài khoản thành công");
        }
        router.refresh();
      }
    });
  };

  const handleEditSubmit = async () => {
    if (operationRef.current) return;
    if (!editUser) return;
    if (!formName.trim() || !formEmail.trim()) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setError("");
    const result = await withOperation(() => updateUser(editUser.id, {
      name: formName,
      email: formEmail,
      username: formUsername,
      phone: formPhone,
      role: formRole as "ADMIN" | "DIRECTOR" | "DEPUTY_DIRECTOR" | "CHIEF_COMMANDER" | "MANAGER" | "ENGINEER" | "STAFF" | "SUPERVISION_HEAD",
      projectIds: formProjectIds,
      projectRoles: formProjectRoles as Record<string, "PROJECT_MANAGER" | "SITE_COMMANDER" | "CHIEF_COMMANDER" | "ASSISTANT_COMMANDER" | "QA_QC" | "HSE" | "SUPERVISOR" | "VIEWER">,
      note: formNote || undefined,
      supervisionScopeType: formRole === "SUPERVISION_HEAD" ? formSupervisionScope : undefined,
      supervisionProjectIds: formRole === "SUPERVISION_HEAD" && formSupervisionScope === "SELECTED_PROJECTS" ? formSupervisionProjectIds : undefined,
    }));
      if (!result) return;
      if (result.error) { setError(result.error); return; }
      setEditUser(null);
      toast.success("Đã cập nhật thông tin tài khoản.");
      router.refresh();
  };

  const openEdit = (user: UserData) => {
    if (user.deletedAt) {
      toast.error("Tài khoản đã bị xóa mềm. Vui lòng khôi phục trước khi chỉnh sửa.");
      return;
    }
    setEditUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormUsername(user.username || "");
    setFormPhone(user.phone || "");
    setFormRole(user.role);
    setFormProjectIds(user.assignedProjects.map(p => p.id));
    setFormProjectRoles(Object.fromEntries(user.assignedProjects.map((project) => [project.id, project.role])));
    setFormNote(""); 
    setFormSupervisionScope(user.supervisionScopeType || "SELECTED_PROJECTS");
    setFormSupervisionProjectIds(user.supervisionProjectIds || []);
    setError("");
  };

  const handleAssignProject = async () => {
    if (!assignUserId || !assignProjectId) return;
    const result = await withOperation(() => assignProjectToUser(
      assignUserId,
      assignProjectId,
      assignProjectRole as "PROJECT_MANAGER" | "SITE_COMMANDER" | "CHIEF_COMMANDER" | "ASSISTANT_COMMANDER" | "QA_QC" | "HSE" | "SUPERVISOR" | "VIEWER",
    ));
    if (!result) return;
    if (result.error) { setError(result.error); setTimeout(() => setError(""), 3000); }
    setAssignUserId(null); setAssignProjectId(""); setAssignProjectRole("");
    router.refresh();
  };

  const handleUnassign = async (userId: string, projectId: string) => {
    setConfirmState({
      isOpen: true,
      title: "Gỡ công trình khỏi tài khoản?",
      description: "Người dùng sẽ không còn quyền truy cập công trình này.",
      variant: "danger",
      confirmText: "Gỡ công trình",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        const res = await withOperation(() => unassignProjectFromUser(userId, projectId));
        if (!res) return;
        if (res && res.error) {
          toast.error(res.error);
        } else {
          toast.success("Đã gỡ công trình thành công");
        }
        router.refresh();
      }
    });
  };

  const handleResetPwClick = (user: UserData) => {
    if (user.deletedAt) {
      toast.error("Tài khoản đã bị xóa mềm. Vui lòng khôi phục trước khi thao tác.");
      return;
    }
    setResetPwUser(user);
    setTempPassword(null);
  };

  const handleResetPwSubmit = async () => {
    if (!resetPwUser) return;
    
    const result = await withOperation(() => resetUserPassword(resetPwUser.id));
    if (!result) return;
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Đã tạo mật khẩu tạm thời thành công");
      setTempPassword(result.tempPassword || null);
    }
  };

  const getRoleBadge = (role: string, roleDisplay: string) => {
    switch (role) {
      case "ADMIN": return <StatusBadge variant="purple" size="sm">{roleDisplay}</StatusBadge>;
      case "DIRECTOR": return <StatusBadge variant="info" size="sm">{roleDisplay}</StatusBadge>;
      case "DEPUTY_DIRECTOR": return <StatusBadge variant="info" size="sm">{roleDisplay}</StatusBadge>;
      case "CHIEF_COMMANDER": return <StatusBadge variant="info" size="sm">{roleDisplay}</StatusBadge>;
      default: return <StatusBadge variant="neutral" size="sm">{roleDisplay}</StatusBadge>;
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <div className="surface-panel flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input id="user-search" type="text"  placeholder="Tìm tên, email, SĐT..." aria-label="Tìm kiếm người dùng" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400" />
        </div>
        <select id="user-role-filter" aria-label="Lọc theo vai trò" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900">
          <option value="">Tất cả vai trò</option>
          {allowedRoles.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
        </select>
        <select id="user-project-filter" aria-label="Lọc theo công trình" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900">
          <option value="">Tất cả công trình</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.code} — {project.name}</option>)}
        </select>
        <select id="user-status-filter" aria-label="Lọc theo trạng thái" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900">
          <option value="all_active">Tất cả đang dùng</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã khóa</option>
          <option value="deleted">Ngừng sử dụng</option>
        </select>
        <button onClick={() => { setShowCreate(true); resetForm(); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Thêm tài khoản
        </button>
      </div>

      <p className="text-xs text-slate-500" aria-live="polite">Hiển thị {sortedUsers.length} tài khoản phù hợp.</p>

      <div className="hidden lg:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900"><button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-blue-700">Người dùng <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-4 py-3 font-semibold text-slate-900">Đăng nhập / Email</th>
              <th className="px-4 py-3 font-semibold text-slate-900">SĐT</th>
              <th className="px-4 py-3 font-semibold text-slate-900"><button type="button" onClick={() => toggleSort("role")} className="inline-flex items-center gap-1 hover:text-blue-700">Vai trò hệ thống <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-4 py-3 font-semibold text-slate-900">Công trình được gán</th>
              <th className="px-4 py-3 font-semibold text-slate-900"><button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-blue-700">Trạng thái <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-4 py-3 font-semibold text-slate-900 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedUsers.map(user => {
              const status = getAccountStatus(user);
              return (
              <tr key={user.id} onClick={() => setDetailUser(user)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetailUser(user); } }} tabIndex={0} className="cursor-pointer hover:bg-blue-50/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
                <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">{user.username || "-"}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{user.phone || "-"}</td>
                <td className="px-4 py-3">{getRoleBadge(user.role, user.roleDisplay)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.assignedProjects.map(p => (
                      <span key={p.id} title={`Vai trò tại công trình: ${p.roleDisplay}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded font-medium">
                        {p.code}
                        <button onClick={(event) => { event.stopPropagation(); handleUnassign(user.id, p.id); }} className="hover:text-red-500 ml-0.5" aria-label={`Gỡ ${p.code}`}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <button onClick={(event) => { event.stopPropagation(); setAssignUserId(user.id); setAssignProjectId(""); setAssignProjectRole(""); }} className="inline-flex items-center px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50 rounded" aria-label="Gán công trình">
                      <Plus className="h-3 w-3 mr-0.5" />Gán
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge variant={status.variant} size="sm">{status.label}</StatusBadge></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={(event) => { event.stopPropagation(); setDetailUser(user); }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Xem chi tiết" aria-label={`Xem chi tiết tài khoản ${user.name}`}><Eye className="h-4 w-4" /></button>
                    {!user.deletedAt ? (
                      canManageUser(user) ? <>
                        <button onClick={(event) => { event.stopPropagation(); openEdit(user); }} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600" title="Sửa thông tin" aria-label={`Sửa thông tin tài khoản ${user.name}`}><Edit className="h-4 w-4" /></button>
                        {canPerformSensitiveAction(user) ? <>
                          <button onClick={(event) => { event.stopPropagation(); handleToggleActive(user.id, user.isActive); }} className={`p-1.5 rounded-md text-xs ${user.isActive ? "hover:bg-amber-50 text-amber-500" : "hover:bg-green-50 text-green-600"}`} title={user.isActive ? "Khóa" : "Mở khóa"} aria-label={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>{user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</button>
                          <button onClick={(event) => { event.stopPropagation(); handleResetPwClick(user); }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Đặt lại mật khẩu" aria-label="Đặt lại mật khẩu"><Key className="h-4 w-4" /></button>
                          <button onClick={(event) => { event.stopPropagation(); handleSoftDelete(user); }} className="p-1.5 rounded-md hover:bg-red-50 text-red-600" title="Ngừng sử dụng tài khoản" aria-label={`Ngừng sử dụng tài khoản ${user.name}`}><Trash2 className="h-4 w-4" /></button>
                        </> : null}
                      </> : <span className="text-[11px] text-slate-400 italic px-1">Không có quyền</span>
                    ) : canPerformSensitiveAction(user) ? (
                      <button onClick={(event) => { event.stopPropagation(); handleRestore(user); }} className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600" title="Khôi phục tài khoản" aria-label={`Khôi phục tài khoản ${user.name}`}><RefreshCcw className="h-4 w-4" /></button>
                    ) : <span className="text-[11px] text-slate-400 italic px-1">Không có quyền</span>}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {paginatedUsers.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Không tìm thấy tài khoản phù hợp với bộ lọc hiện tại.</div>}
      </div>

      <div className="space-y-3 lg:hidden">
        {paginatedUsers.map(user => {
          const status = getAccountStatus(user);
          return (
          <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={status.variant} size="sm">{status.label}</StatusBadge>
                {getRoleBadge(user.role, user.roleDisplay)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {user.assignedProjects.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded font-medium">
                  <Building2 className="h-3 w-3" />{p.code}
                  <button onClick={() => handleUnassign(user.id, p.id)} className="hover:text-red-500" aria-label={`Gỡ ${p.code}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <button onClick={() => { setAssignUserId(user.id); setAssignProjectId(""); setAssignProjectRole(""); }} className="text-xs text-blue-600 hover:underline" aria-label="Gán công trình">+ Gán</button>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setDetailUser(user)} className="h-9 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50" aria-label={`Xem chi tiết tài khoản ${user.name}`}>Xem</button>
              {!user.deletedAt ? (
                canManageUser(user) ? (
                  <>
                    <button onClick={() => openEdit(user)} className="h-9 rounded-lg border border-blue-200 text-xs font-semibold text-blue-600 hover:bg-blue-50" aria-label={`Sửa thông tin tài khoản ${user.name}`}>Sửa</button>
                    {canPerformSensitiveAction(user) ? <button onClick={() => handleToggleActive(user.id, user.isActive)} className={`h-9 rounded-lg border text-xs font-semibold ${user.isActive ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`} aria-label={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                      {user.isActive ? "Khóa" : "Mở khóa"}
                    </button> : null}
                    {canPerformSensitiveAction(user) ? <button onClick={() => handleSoftDelete(user)} className="h-9 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50" aria-label={`Ngừng sử dụng tài khoản ${user.name}`}>Ngừng dùng</button> : null}
                  </>
                ) : (
                  <span className="h-9 flex items-center justify-center text-xs text-slate-400 italic col-span-1">Không có quyền</span>
                )
              ) : (
                canPerformSensitiveAction(user) ? (
                  <button onClick={() => handleRestore(user)} className="h-9 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" aria-label={`Khôi phục tài khoản ${user.name}`}>Khôi phục</button>
                ) : (
                  <span className="h-9 flex items-center justify-center text-xs text-slate-400 italic col-span-1">Không có quyền</span>
                )
              )}
            </div>
          </div>
          );
        })}
        {paginatedUsers.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Không tìm thấy tài khoản phù hợp với bộ lọc hiện tại.</div>}
      </div>

      {sortedUsers.length > PAGE_SIZE && (
        <nav className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4" aria-label="Phân trang tài khoản">
          <span className="text-sm text-slate-500">Trang {currentPage}/{totalPages}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-4 w-4" />Trước</button>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Sau<ChevronRight className="h-4 w-4" /></button>
          </div>
        </nav>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowCreate(false)} />
          <div role="dialog" aria-modal="true" aria-label="Tạo tài khoản mới" className="relative max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">Tạo tài khoản mới</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md">{error}</div>}
              <div>
                <label htmlFor="create-name" className="block text-sm font-medium text-slate-700 mb-1">Họ tên *</label>
                <input id="create-name" type="text" autoComplete="off" value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input id="create-email" type="email" autoComplete="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="user@email.com" />
                  <p className="text-[11px] text-slate-500 mt-1">Dùng để đăng nhập. Hệ thống không gửi email thật.</p>
                </div>
                <div>
                  <label htmlFor="create-username" className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                  <input id="create-username" type="text"  value={formUsername} onChange={e => setFormUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="commander01" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-phone" className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input id="create-phone" type="tel" autoComplete="off" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="0901234567" />
                  <p className="text-[11px] text-slate-500 mt-1">Chưa xác minh OTP.</p>
                </div>
                <div>
                  <label htmlFor="create-password" className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu *</label>
                  <input id="create-password" type="password" autoComplete="current-password" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" />
                  <p className="text-[11px] text-slate-500 mt-1">Vui lòng gửi MK thủ công cho người dùng.</p>
                </div>
              </div>
              <div>
                <label htmlFor="create-role" className="block text-sm font-medium text-slate-700 mb-1">Vai trò hệ thống *</label>
                <select id="create-role" value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                  {allowedRoles.map(r => (
                    <option key={r.role} value={r.role}>{r.label}</option>
                  ))}
                </select>
              </div>

              {formRole === "SUPERVISION_HEAD" ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-4">
                  <h4 className="font-semibold text-blue-900 text-sm">Cấu hình Trưởng ban giám sát</h4>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Phạm vi giám sát</label>
                    <select aria-label="Phạm vi giám sát" value={formSupervisionScope} onChange={e => setFormSupervisionScope(e.target.value as any)} className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                      <option value="SELECTED_PROJECTS">Chỉ giám sát công trình được chọn</option>
                      <option value="ALL_PROJECTS">Giám sát toàn bộ công trình công ty</option>
                    </select>
                  </div>
                  {formSupervisionScope === "SELECTED_PROJECTS" && (
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">Công trình giám sát</label>
                      <div className="border border-blue-300 bg-white rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                        {projects.map(p => (
                          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                            <input type="checkbox" checked={formSupervisionProjectIds.includes(p.id)} onChange={e => {
                              if (e.target.checked) setFormSupervisionProjectIds([...formSupervisionProjectIds, p.id]);
                              else setFormSupervisionProjectIds(formSupervisionProjectIds.filter(id => id !== p.id));
                            }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-slate-700"><span className="font-semibold">{p.code}</span> - {p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-blue-700">Lưu ý: Không cần gán thêm &quot;Công trình được giao&quot; ở bên dưới trừ khi họ cũng tham gia thi công.</p>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Công trình được giao và vai trò tại công trình</label>
                <div className="border border-slate-300 rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {projects.map(p => (
                    <div key={p.id} className="rounded px-2 py-1.5 hover:bg-slate-50">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={formProjectIds.includes(p.id)} onChange={e => {
                          if (e.target.checked) {
                            setFormProjectIds([...formProjectIds, p.id]);
                          } else {
                            setFormProjectIds(formProjectIds.filter(id => id !== p.id));
                            setFormProjectRoles((current) => {
                              const remaining = { ...current };
                              delete remaining[p.id];
                              return remaining;
                            });
                          }
                        }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-slate-700"><span className="font-semibold">{p.code}</span> - {p.name}</span>
                      </label>
                      {formProjectIds.includes(p.id) ? (
                        <select aria-label={`Vai trò tại công trình ${p.code}`} value={formProjectRoles[p.id] ?? ""} onChange={(event) => setFormProjectRoles((current) => ({ ...current, [p.id]: event.target.value }))} className="mt-2 ml-6 w-[calc(100%-1.5rem)] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900">
                          <option value="" disabled>Chọn vai trò tại công trình</option>
                          {projectRoleOptions.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
                        </select>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              {formProjectIds.length > 0 && (
                <div>
                  <label htmlFor="create-note" className="block text-sm font-medium text-slate-700 mb-1">Ghi chú gán công trình</label>
                  <textarea id="create-note" value={formNote} onChange={e => setFormNote(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="Ghi chú về việc gán công trình này..." />
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3 rounded-b-2xl">
              <button onClick={() => setShowCreate(false)} className="flex-1 h-10 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={handleCreate} disabled={loading} className="flex-1 h-10 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail User Drawer */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setDetailUser(null)} />
          <aside role="dialog" aria-modal="true" aria-label="Chi tiết tài khoản" className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-slate-900">Chi tiết tài khoản</h2>
              <button onClick={() => setDetailUser(null)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Đóng chi tiết">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Họ tên</p>
                  <p className="text-sm font-semibold text-slate-900">{detailUser.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Tên đăng nhập</p>
                  <p className="text-sm text-slate-900">{detailUser.username || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Email</p>
                  <p className="text-sm text-slate-900">{detailUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Số điện thoại</p>
                  <p className="text-sm text-slate-900">{detailUser.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Trạng thái</p>
                  <div className="mt-1">
                    {detailUser.deletedAt
                      ? <StatusBadge variant="danger" size="sm">Đã xóa</StatusBadge>
                      : detailUser.isActive 
                        ? <StatusBadge variant="success" size="sm">Hoạt động</StatusBadge> 
                        : <StatusBadge variant="danger" size="sm">Đã khóa</StatusBadge>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Vai trò hệ thống</p>
                  <div className="mt-1">{getRoleBadge(detailUser.role, detailUser.roleDisplay)}</div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Ngày tạo</p>
                  <p className="text-sm text-slate-900">{new Date(detailUser.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Công trình được giao và vai trò tại công trình</p>
                {detailUser.assignedProjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detailUser.assignedProjects.map(p => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{p.code} - {p.name}</p>
                          <p className="text-xs text-slate-500">Vai trò tại công trình: {p.roleDisplay}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Chưa được giao công trình nào.</p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800">Bảo mật tài khoản</h4>
                    <p className="text-sm text-amber-700 mt-1">Mật khẩu hiện tại không thể xem lại vì được mã hóa một chiều. Nếu người dùng quên mật khẩu, hãy dùng chức năng đặt lại mật khẩu.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              <button onClick={() => setDetailUser(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200">Đóng</button>
              {canManageUser(detailUser) ? (
                <>
                  <button onClick={() => { setDetailUser(null); openEdit(detailUser); }} className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 flex items-center gap-2"><Edit className="h-4 w-4" />Chỉnh sửa</button>
                  {canPerformSensitiveAction(detailUser) ? <button
                    onClick={() => { setDetailUser(null); handleResetPwClick(detailUser); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Đặt lại mật khẩu
                  </button> : null}
                </>
              ) : (
                <div className="px-4 py-2 text-sm text-slate-400 flex items-center italic" title="Bạn không có quyền đặt lại mật khẩu tài khoản này.">
                  <Key className="h-4 w-4 mr-2" />
                  Không có quyền đặt lại mật khẩu
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setEditUser(null)} />
          <div role="dialog" aria-modal="true" aria-label="Sửa thông tin tài khoản" className="relative max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">Sửa thông tin tài khoản</h2>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md">{error}</div>}
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 mb-1">Họ tên *</label>
                <input id="edit-name" type="text"  value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input id="edit-email" type="email" autoComplete="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="user@email.com" />
                  <p className="text-[11px] text-slate-500 mt-1">Dùng để đăng nhập. Hệ thống không gửi email thật.</p>
                </div>
                <div>
                  <label htmlFor="edit-username" className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                  <input id="edit-username" type="text" autoComplete="off" value={formUsername} onChange={e => setFormUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="commander01" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input id="edit-phone" type="tel" autoComplete="off" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="0901234567" />
                </div>
                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-slate-700 mb-1">Vai trò hệ thống *</label>
                  <select id="edit-role" value={formRole} onChange={e => setFormRole(e.target.value)} disabled={editUser.id === currentUserId} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                    {allowedRoles.map(r => (
                      <option key={r.role} value={r.role}>{r.label}</option>
                    ))}
                    {/* Keep current role visible even if not allowed to change */}
                    {editUser && !allowedRoles.some(r => r.role === editUser.role) && (
                      <option value={editUser.role} disabled>{editUser.roleDisplay} (không đổi được)</option>
                    )}
                  </select>
                  {editUser.id === currentUserId ? <p className="mt-1 text-[11px] text-slate-500">Bạn không thể tự thay đổi vai trò của chính mình.</p> : null}
                  {editUser && !allowedRoles.some(r => r.role === editUser.role) && (
                    <p className="text-[11px] text-amber-600 mt-1">Bạn không có quyền thay đổi vai trò của tài khoản này.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Công trình được giao và vai trò tại công trình</label>
                <div className="border border-slate-300 rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {projects.map(p => (
                    <div key={p.id} className="rounded px-2 py-1.5 hover:bg-slate-50">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={formProjectIds.includes(p.id)} onChange={e => {
                          if (e.target.checked) {
                            setFormProjectIds([...formProjectIds, p.id]);
                          } else {
                            setFormProjectIds(formProjectIds.filter(id => id !== p.id));
                            setFormProjectRoles((current) => {
                              const remaining = { ...current };
                              delete remaining[p.id];
                              return remaining;
                            });
                          }
                        }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-slate-700"><span className="font-semibold">{p.code}</span> - {p.name}</span>
                      </label>
                      {formProjectIds.includes(p.id) ? (
                        <select aria-label={`Vai trò tại công trình ${p.code}`} value={formProjectRoles[p.id] ?? ""} onChange={(event) => setFormProjectRoles((current) => ({ ...current, [p.id]: event.target.value }))} className="mt-2 ml-6 w-[calc(100%-1.5rem)] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900">
                          <option value="" disabled>Chọn vai trò tại công trình</option>
                          {projectRoleOptions.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
                        </select>
                      ) : null}
                    </div>
                  ))}
                </div>
                {formRole === "CHIEF_COMMANDER" && formProjectIds.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">Cảnh báo: Chỉ huy trưởng hệ thống nên được giao ít nhất 1 công trình; vai trò tại từng công trình được chọn độc lập ở trên.</p>
                )}
              </div>
              {formProjectIds.length > 0 && (
                <div>
                  <label htmlFor="edit-note" className="block text-sm font-medium text-slate-700 mb-1">Ghi chú gán công trình</label>
                  <textarea id="edit-note" value={formNote} onChange={e => setFormNote(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="Ghi chú về việc gán công trình này..." />
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3 rounded-b-2xl">
              <button onClick={() => setEditUser(null)} className="flex-1 h-10 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={handleEditSubmit} disabled={loading} className="flex-1 h-10 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Project Modal */}
      {assignUserId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setAssignUserId(null)} />
          <div role="dialog" aria-modal="true" aria-label="Gán công trình" className="relative w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <h3 className="text-lg font-bold text-slate-900">Gán công trình</h3>
            <label htmlFor="assign-project" className="sr-only">Chọn công trình</label>
            <select id="assign-project" value={assignProjectId} onChange={e => setAssignProjectId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900">
              <option value="">Chọn công trình</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
            <div>
              <label htmlFor="assign-project-role" className="mb-1 block text-sm font-medium text-slate-700">Vai trò tại công trình</label>
              <select id="assign-project-role" value={assignProjectRole} onChange={(event) => setAssignProjectRole(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="" disabled>Chọn vai trò tại công trình</option>
                {projectRoleOptions.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-500">Vai trò tại công trình độc lập với vai trò hệ thống của tài khoản.</p>
            <div className="flex gap-3">
              <button onClick={() => setAssignUserId(null)} className="flex-1 h-10 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={handleAssignProject} disabled={!assignProjectId || !assignProjectRole || loading} className="flex-1 h-10 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Gán</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setResetPwUser(null)} />
          <div role="dialog" aria-modal="true" aria-label="Đổi mật khẩu" className="relative w-full max-w-sm overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 sm:rounded-2xl">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h3>
            </div>
            <div className="p-5 space-y-4">
              {!tempPassword ? (
                <>
                  <p className="text-sm text-slate-600">
                    Bạn sắp tạo một mật khẩu tạm thời cho tài khoản <span className="font-semibold text-slate-900">{resetPwUser.name}</span>.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                    <p>Mật khẩu tạm thời sẽ được tạo ngẫu nhiên và an toàn. Bạn sẽ cần sao chép và gửi cho người dùng.</p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-center space-y-2">
                    <p className="text-sm text-emerald-800 font-medium">Mật khẩu tạm thời đã được tạo:</p>
                    <div className="bg-white border border-emerald-300 rounded-md py-3 px-4 font-mono text-lg font-bold text-slate-900 tracking-wider flex items-center justify-between">
                      <span>{tempPassword}</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success("Đã sao chép mật khẩu."); }}
                        className="text-sm font-sans font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                    <p className="font-semibold">Cảnh báo quan trọng:</p>
                    <p className="mt-1">Mật khẩu tạm thời chỉ hiển thị một lần. Hãy sao chép và gửi riêng cho người dùng qua kênh an toàn ngay bây giờ.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button onClick={() => { setResetPwUser(null); setTempPassword(null); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                {tempPassword ? "Đóng" : "Hủy"}
              </button>
              {!tempPassword && (
                <button onClick={handleResetPwSubmit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Đang xử lý..." : "Tạo mật khẩu tạm thời"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        isLoading={loading}
      />
    </div>
  );
}


