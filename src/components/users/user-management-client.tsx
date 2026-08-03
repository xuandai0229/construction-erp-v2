"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search, ShieldCheck, 
  Lock, Unlock, Key, Building2, X, Eye, EyeOff, Edit, Trash2, RefreshCcw, 
  MoreVertical, Check, Filter, Sparkles
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import { notifyOverlayOpen } from "@/components/ui/global-overlay-manager";
import { 
  createUser, toggleUserActive, assignProjectToUser, unassignProjectFromUser, 
  resetUserPassword, updateUser, softDeleteUser, restoreUser 
} from "@/app/(dashboard)/users/actions";

interface AssignedProject {
  id: string;
  code: string;
  name: string;
  displayName?: string;
  location?: string | null;
  role: string;
  roleDisplay: string;
}

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
  assignedProjects: AssignedProject[];
  supervisionScopeType?: "ALL_PROJECTS" | "SELECTED_PROJECTS" | null;
  supervisionProjectIds?: string[];
}

interface ProjectData {
  id: string;
  code: string;
  name: string;
  displayName?: string;
  location?: string | null;
  status: string;
}

type SortField = "name" | "role" | "status";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 10;

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Toàn quyền quản trị hệ thống và cấu hình tài khoản",
  DIRECTOR: "Xem và quản lý tất cả công trình, báo cáo và phê duyệt toàn công ty",
  DEPUTY_DIRECTOR: "Hỗ trợ Ban giám đốc điều hành và theo dõi toàn bộ dự án",
  CHIEF_COMMANDER: "Điều hành trực tiếp tại các công trình được phân công",
  SUPERVISION_HEAD: "Trưởng ban giám sát chất lượng và an toàn công trình",
  CONSTRUCTION_SUPERVISOR: "Giám sát kỹ thuật và hồ sơ tại công trình",
  MANAGER: "Quản lý chuyên môn theo phòng ban",
  ENGINEER: "Kỹ sư thi công và quản lý khối lượng",
  STAFF: "Nhân viên thực hiện nghiệp vụ",
};

function renderUserSubtext(phone?: string | null, username?: string | null) {
  const parts: string[] = [];
  if (phone && phone.trim()) {
    parts.push(phone.trim());
  } else {
    parts.push("Chưa cập nhật SĐT");
  }
  if (username && username.trim()) {
    parts.push(`@${username.trim()}`);
  }
  return parts.join(" · ");
}

function getAccountStatus(user: UserData) {
  if (user.deletedAt) return { label: "Ngừng sử dụng", variant: "danger" as const };
  if (user.isActive) return { label: "Đang hoạt động", variant: "success" as const };
  return { label: "Đã khóa", variant: "danger" as const };
}

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let pass = "Ct2026#";
  for (let i = 0; i < 4; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export function UserManagementClient({ 
  initialUsers, 
  projects, 
  currentUserId, 
  currentUserRole, 
  allowedRoles, 
  projectRoleOptions, 
  roleLevels 
}: {
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
  const toast = useToast();

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
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [expandedProjectsUserId, setExpandedProjectsUserId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState(allowedRoles.length > 0 ? allowedRoles[0].role : "STAFF");
  const [formProjectIds, setFormProjectIds] = useState<string[]>([]);
  const [formProjectRoles, setFormProjectRoles] = useState<Record<string, string>>({});
  const [formNote, setFormNote] = useState("");
  const [formSupervisionScope, setFormSupervisionScope] = useState<"ALL_PROJECTS" | "SELECTED_PROJECTS">("SELECTED_PROJECTS");
  const [formSupervisionProjectIds, setFormSupervisionProjectIds] = useState<string[]>([]);

  // Project Picker Search & Filter inside Form
  const [modalProjectSearch, setModalProjectSearch] = useState("");
  const [modalProjectTab, setModalProjectTab] = useState<"all" | "selected" | "unselected">("all");

  // Assign project state
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignProjectRole, setAssignProjectRole] = useState("");

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

  const filtered = useMemo(() => initialUsers.filter(u => {
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      u.name.toLowerCase().includes(searchLower) || 
      u.email.toLowerCase().includes(searchLower) || 
      (u.username || "").toLowerCase().includes(searchLower) || 
      (u.phone || "").includes(search);
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

  // Single active non-modal overlay coordination & outside dismissal
  useEffect(() => {
    const handleOverlayOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string }>).detail;
      if (detail?.id) {
        if (!detail.id.startsWith("projects-popover-")) setExpandedProjectsUserId(null);
        if (!detail.id.startsWith("action-menu-")) setOpenActionMenuId(null);
      }
    };
    const handleCloseAll = () => {
      setExpandedProjectsUserId(null);
      setOpenActionMenuId(null);
    };

    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest("[data-action-menu]")) {
        setOpenActionMenuId(null);
      }
      if (!target.closest("[data-projects-popover]")) {
        setExpandedProjectsUserId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedProjectsUserId(null);
        setOpenActionMenuId(null);
      }
    };

    window.addEventListener("app-overlay-open", handleOverlayOpen);
    window.addEventListener("app-overlay-close-all", handleCloseAll);
    window.addEventListener("close-overlays", handleCloseAll);
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("app-overlay-open", handleOverlayOpen);
      window.removeEventListener("app-overlay-close-all", handleCloseAll);
      window.removeEventListener("close-overlays", handleCloseAll);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const validatePhone = (phoneStr: string): boolean => {
    if (!phoneStr.trim()) return true; // Optional field
    // Reject emails or invalid characters in phone
    if (phoneStr.includes("@")) return false;
    return /^[0-9+\s()-]{7,15}$/.test(phoneStr.trim());
  };

  const handleCreate = async () => {
    if (operationRef.current) return;
    
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc (*)");
      return;
    }

    if (!validatePhone(formPhone)) {
      setError("Vui lòng nhập đúng số điện thoại.");
      return;
    }

    operationRef.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await createUser({
        name: formName.trim(),
        email: formEmail.trim(),
        username: formUsername.trim() || undefined,
        phone: formPhone.trim() || undefined,
        password: formPassword,
        role: formRole as any,
        projectIds: formProjectIds.length > 0 ? formProjectIds : undefined,
        projectRoles: formProjectRoles as any,
        note: formNote.trim() || undefined,
        supervisionScopeType: formRole === "SUPERVISION_HEAD" ? formSupervisionScope : undefined,
        supervisionProjectIds: formRole === "SUPERVISION_HEAD" && formSupervisionScope === "SELECTED_PROJECTS" ? formSupervisionProjectIds : undefined,
      });
      if (result.error) { setError(result.error); return; }
      setShowCreate(false);
      resetForm();
      toast.success("Đã tạo tài khoản mới thành công.");
      router.refresh();
    } catch {
      setError("Không thể tạo tài khoản. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      operationRef.current = false;
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName(""); 
    setFormEmail(""); 
    setFormUsername(""); 
    setFormPhone("");
    setFormPassword(""); 
    setShowPassword(false);
    setFormRole(allowedRoles.length > 0 ? allowedRoles[0].role : "STAFF");
    setFormProjectIds([]); 
    setFormProjectRoles({}); 
    setFormNote(""); 
    setError("");
    setFormSupervisionScope("SELECTED_PROJECTS"); 
    setFormSupervisionProjectIds([]);
    setModalProjectSearch("");
    setModalProjectTab("all");
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setConfirmState({
      isOpen: true,
      title: isActive ? "Khóa tài khoản?" : "Mở khóa tài khoản?",
      description: isActive 
        ? "Người dùng sẽ không thể đăng nhập sau khi bị khóa. Dữ liệu cũ vẫn được giữ nguyên để truy vết." 
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
      title: "Ngừng sử dụng tài khoản?",
      description: "Tài khoản sẽ bị khóa đăng nhập và ẩn khỏi danh sách chính. Dữ liệu lịch sử công việc vẫn được lưu trữ an toàn.",
      variant: "danger",
      confirmText: "Ngừng sử dụng",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        const res = await withOperation(() => softDeleteUser(user.id));
        if (!res) return;
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Đã chuyển tài khoản sang trạng thái Ngừng sử dụng");
        }
        router.refresh();
      }
    });
  };

  const handleRestore = async (user: UserData) => {
    setConfirmState({
      isOpen: true,
      title: "Khôi phục tài khoản?",
      description: "Tài khoản sẽ được hiển thị lại trong danh sách tài khoản hiện hành.",
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
      setError("Vui lòng điền đầy đủ thông tin bắt buộc (*)");
      return;
    }
    if (!validatePhone(formPhone)) {
      setError("Vui lòng nhập đúng số điện thoại.");
      return;
    }

    setError("");
    const result = await withOperation(() => updateUser(editUser.id, {
      name: formName.trim(),
      email: formEmail.trim(),
      username: formUsername.trim() || undefined,
      phone: formPhone.trim() || undefined,
      role: formRole as any,
      projectIds: formProjectIds,
      projectRoles: formProjectRoles as any,
      note: formNote.trim() || undefined,
      supervisionScopeType: formRole === "SUPERVISION_HEAD" ? formSupervisionScope : undefined,
      supervisionProjectIds: formRole === "SUPERVISION_HEAD" && formSupervisionScope === "SELECTED_PROJECTS" ? formSupervisionProjectIds : undefined,
    }));
    if (!result) return;
    if (result.error) { setError(result.error); return; }
    setEditUser(null);
    toast.success("Đã cập nhật thông tin tài khoản thành công.");
    router.refresh();
  };

  const openEdit = (user: UserData) => {
    if (user.deletedAt) {
      toast.error("Tài khoản đã ngừng sử dụng. Vui lòng khôi phục trước khi chỉnh sửa.");
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
    setModalProjectSearch("");
    setModalProjectTab("all");
  };

  const handleAssignProject = async () => {
    if (!assignUserId || !assignProjectId) return;
    const result = await withOperation(() => assignProjectToUser(
      assignUserId,
      assignProjectId,
      assignProjectRole as any,
    ));
    if (!result) return;
    if (result.error) { setError(result.error); setTimeout(() => setError(""), 3000); return; }
    setAssignUserId(null); setAssignProjectId(""); setAssignProjectRole("");
    toast.success("Đã gán công trình thành công");
    router.refresh();
  };

  const handleUnassign = async (userId: string, projectId: string, projectName: string) => {
    setConfirmState({
      isOpen: true,
      title: "Gỡ công trình khỏi tài khoản?",
      description: `Người dùng sẽ không còn quyền phụ trách công trình "${projectName}".`,
      variant: "danger",
      confirmText: "Gỡ công trình",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        const res = await withOperation(() => unassignProjectFromUser(userId, projectId));
        if (!res) return;
        if (res.error) {
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
      toast.error("Tài khoản đã ngừng sử dụng. Vui lòng khôi phục trước khi thao tác.");
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
      case "CHIEF_COMMANDER": return <StatusBadge variant="success" size="sm">{roleDisplay}</StatusBadge>;
      case "SUPERVISION_HEAD": return <StatusBadge variant="warning" size="sm">{roleDisplay}</StatusBadge>;
      default: return <StatusBadge variant="neutral" size="sm">{roleDisplay}</StatusBadge>;
    }
  };

  // Filter projects inside Create / Edit modal
  const filteredModalProjects = useMemo(() => {
    return projects.filter(p => {
      const title = p.displayName || p.name;
      const searchLower = modalProjectSearch.toLowerCase();
      const matchSearch = !modalProjectSearch || 
        title.toLowerCase().includes(searchLower) || 
        p.code.toLowerCase().includes(searchLower) ||
        (p.location || "").toLowerCase().includes(searchLower);

      const isSelected = formProjectIds.includes(p.id);
      let matchTab = true;
      if (modalProjectTab === "selected") matchTab = isSelected;
      if (modalProjectTab === "unselected") matchTab = !isSelected;

      return matchSearch && matchTab;
    });
  }, [modalProjectSearch, modalProjectTab, projects, formProjectIds]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Top Controls Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            id="user-search" 
            type="text" 
            placeholder="Tìm theo họ tên, email, SĐT, tên đăng nhập..." 
            aria-label="Tìm kiếm người dùng" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-400 font-medium" 
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <select 
            id="user-role-filter" 
            aria-label="Lọc theo vai trò" 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)} 
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả vai trò</option>
            {allowedRoles.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
          </select>

          <select 
            id="user-project-filter" 
            aria-label="Lọc theo công trình" 
            value={projectFilter} 
            onChange={e => setProjectFilter(e.target.value)} 
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20 max-w-[200px] truncate"
          >
            <option value="">Tất cả công trình</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.displayName || project.name} ({project.code})
              </option>
            ))}
          </select>

          <select 
            id="user-status-filter" 
            aria-label="Lọc theo trạng thái" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all_active">Tất cả hiện hành</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
            <option value="deleted">Ngừng sử dụng</option>
          </select>

          <button 
            onClick={() => { setShowCreate(true); resetForm(); }} 
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> Thêm tài khoản
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-slate-600 font-medium">
        <span>Hiển thị <strong>{sortedUsers.length}</strong> tài khoản phù hợp</span>
      </div>

      {/* Desktop Table (Full Viewport Fit - No Horizontal Scrollbar) */}
      <div className="hidden lg:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-visible">
        <table className="w-full text-left text-sm table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200 text-[12px] text-slate-600 font-bold uppercase tracking-wider">
            <tr>
              <th className="w-[23%] min-w-[200px] px-3.5 py-3.5">
                <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-blue-700">
                  NGƯỜI DÙNG <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="w-[14%] min-w-[130px] px-3.5 py-3.5">
                <button type="button" onClick={() => toggleSort("role")} className="inline-flex items-center gap-1 hover:text-blue-700">
                  VAI TRÒ HỆ THỐNG <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="w-auto px-3.5 py-3.5">CÔNG TRÌNH PHỤ TRÁCH</th>
              <th className="w-[140px] min-w-[140px] px-3.5 py-3.5 whitespace-nowrap">
                <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-blue-700">
                  TRẠNG THÁI <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="w-[185px] min-w-[185px] px-3.5 py-3.5 text-right whitespace-nowrap">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {paginatedUsers.map((user, idx) => {
              const status = getAccountStatus(user);
              const assignedCount = user.assignedProjects.length;
              const isBottomRow = idx >= paginatedUsers.length - 3;

              return (
                <tr 
                  key={user.id} 
                  onClick={() => setDetailUser(user)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetailUser(user); } }} 
                  tabIndex={0} 
                  className="group cursor-pointer hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {/* 1. NGƯỜI DÙNG */}
                  <td className="px-3.5 py-3.5 align-top">
                    <div className="font-bold text-slate-950 text-[14px] leading-tight group-hover:text-blue-700 transition-colors">
                      {user.name}
                    </div>
                    <div className="text-[12.5px] text-slate-600 font-medium mt-0.5 truncate">
                      {user.email}
                    </div>
                    <div className="text-[11.5px] font-mono text-slate-500 font-semibold mt-1">
                      {renderUserSubtext(user.phone, user.username)}
                    </div>
                  </td>

                  {/* 2. VAI TRÒ HỆ THỐNG */}
                  <td className="px-3.5 py-3.5 align-top">
                    <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[12px] font-bold text-emerald-800 border border-emerald-200">
                      {user.roleDisplay}
                    </span>
                  </td>

                  {/* 3. CÔNG TRÌNH PHỤ TRÁCH (PRIMARY: TÊN CÔNG TRÌNH) */}
                  <td className="px-3.5 py-3.5 align-top">
                    {assignedCount === 0 ? (
                      <div className="text-[12.5px] text-slate-600 italic">
                        Chưa phân công công trình
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Display up to 2 projects with full titles */}
                        {user.assignedProjects.slice(0, 2).map(p => (
                          <div key={p.id} className="flex items-start gap-1.5 text-[13px]">
                            <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 leading-snug">
                                {p.displayName || p.name}
                              </span>
                              <span className="ml-1.5 inline-block font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {p.code}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* If > 2 projects: Interactive "+N công trình khác" popover trigger */}
                        {assignedCount > 2 && (
                          <div className="relative inline-block" data-projects-popover>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = expandedProjectsUserId === user.id ? null : user.id;
                                setExpandedProjectsUserId(next);
                                setOpenActionMenuId(null);
                                if (next) {
                                  notifyOverlayOpen(`projects-popover-${user.id}`);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md transition-colors"
                            >
                              +{assignedCount - 2} công trình khác
                            </button>

                            {/* Expanded Projects Popover */}
                            {expandedProjectsUserId === user.id && (
                              <div className={`absolute left-0 ${isBottomRow ? "bottom-full mb-1.5" : "top-full mt-1.5"} z-30 w-80 rounded-xl bg-white border border-slate-200 p-3 shadow-xl space-y-2 animate-in fade-in zoom-in-95 duration-150`}>
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="text-[12px] font-bold text-slate-900">
                                    Công trình phụ trách ({assignedCount})
                                  </span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setExpandedProjectsUserId(null); }}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                  {user.assignedProjects.map(p => (
                                    <div key={p.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[12px]">
                                      <div className="font-bold text-slate-950 leading-snug">
                                        {p.displayName || p.name}
                                      </div>
                                      <div className="mt-1 flex items-center justify-between text-slate-600">
                                        <span className="font-mono text-[11px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">{p.code}</span>
                                        {p.roleDisplay && <span className="text-[11px] text-slate-700 font-medium">{p.roleDisplay}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 4. TRẠNG THÁI */}
                  <td className="w-[140px] min-w-[140px] px-3.5 py-3.5 align-top whitespace-nowrap">
                    <div className="flex items-center h-7" data-status-badge>
                      <StatusBadge variant={status.variant} size="sm">{status.label}</StatusBadge>
                    </div>
                  </td>

                  {/* 5. THAO TÁC (Clear buttons + Menu popover) */}
                  <td className="w-[185px] min-w-[185px] px-3.5 py-3.5 align-top text-right whitespace-nowrap shrink-0">
                    <div className="flex items-center justify-end gap-1.5 shrink-0" data-action-buttons>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDetailUser(user); }} 
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[12.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Xem chi tiết"
                        data-action-view
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem
                      </button>

                      {!user.deletedAt && canManageUser(user) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEdit(user); }} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[12.5px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Sửa thông tin"
                          data-action-edit
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                      )}

                      {/* Dropdown Menu for Additional Actions */}
                      <div className="relative inline-block" data-action-menu>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = openActionMenuId === user.id ? null : user.id;
                            setOpenActionMenuId(next);
                            setExpandedProjectsUserId(null);
                            if (next) {
                              notifyOverlayOpen(`action-menu-${user.id}`);
                            }
                          }} 
                          className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          aria-label="Thao tác bổ sung"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openActionMenuId === user.id && (
                          <div className={`absolute right-0 ${isBottomRow ? "bottom-full mb-1" : "top-full mt-1"} z-30 w-48 rounded-xl bg-white border border-slate-200 p-1.5 shadow-xl space-y-0.5 text-left text-[13px] animate-in fade-in zoom-in-95 duration-100`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(null);
                                setAssignUserId(user.id);
                                setAssignProjectId("");
                                setAssignProjectRole("");
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Building2 className="h-4 w-4 text-blue-600" />
                              Gán công trình
                            </button>

                            {canPerformSensitiveAction(user) && !user.deletedAt && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(null);
                                    handleResetPwClick(user);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <Key className="h-4 w-4 text-amber-600" />
                                  Đặt lại mật khẩu
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(null);
                                    handleToggleActive(user.id, user.isActive);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900"
                                >
                                  {user.isActive ? (
                                    <>
                                      <Lock className="h-4 w-4 text-amber-600" />
                                      Khóa tài khoản
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-4 w-4 text-emerald-600" />
                                      Mở khóa tài khoản
                                    </>
                                  )}
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(null);
                                    handleSoftDelete(user);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 font-semibold hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Ngừng sử dụng
                                </button>
                              </>
                            )}

                            {canPerformSensitiveAction(user) && user.deletedAt && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(null);
                                  handleRestore(user);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-emerald-700 font-semibold hover:bg-emerald-50"
                              >
                                <RefreshCcw className="h-4 w-4" />
                                Khôi phục tài khoản
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {paginatedUsers.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-sm">
            Không tìm thấy tài khoản phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {/* Mobile/Tablet View (< lg) Cards */}
      <div className="space-y-3 lg:hidden">
        {paginatedUsers.map(user => {
          const status = getAccountStatus(user);
          return (
            <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-950 text-[15px]">{user.name}</p>
                  <p className="text-[11.5px] font-mono text-slate-500 font-semibold mt-1">
                    {renderUserSubtext(user.phone, user.username)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge variant={status.variant} size="sm">{status.label}</StatusBadge>
                  {getRoleBadge(user.role, user.roleDisplay)}
                </div>
              </div>

              {/* Assigned Projects */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Công trình phụ trách:</span>
                {user.assignedProjects.length > 0 ? (
                  <div className="space-y-1">
                    {user.assignedProjects.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 border border-slate-200">
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">
                          {p.displayName || p.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {p.code}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Chưa phân công công trình</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button 
                  onClick={() => setDetailUser(user)} 
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700"
                >
                  Xem
                </button>
                {!user.deletedAt && canManageUser(user) && (
                  <button 
                    onClick={() => openEdit(user)} 
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold text-slate-800"
                  >
                    Sửa
                  </button>
                )}
                <button 
                  onClick={() => { setAssignUserId(user.id); setAssignProjectId(""); setAssignProjectRole(""); }} 
                  className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700"
                >
                  Gán CT
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {sortedUsers.length > PAGE_SIZE && (
        <nav className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4" aria-label="Phân trang tài khoản">
          <span className="text-sm text-slate-600 font-medium">Trang {currentPage}/{totalPages}</span>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} 
              disabled={currentPage === 1} 
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />Trước
            </button>
            <button 
              type="button" 
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} 
              disabled={currentPage === totalPages} 
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      {/* Create User Modal (Wide Desktop Layout 760-900px) */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCreate(false)} />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-label="Tạo tài khoản mới" 
            className="relative w-full max-w-4xl max-h-[calc(100vh-48px)] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Tạo tài khoản mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">Thêm người dùng mới vào hệ thống và phân công công trình phụ trách.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* SECTION 1: THÔNG TIN TÀI KHOẢN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">1</span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Thông tin tài khoản</h3>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="create-name" className="block text-sm font-bold text-slate-800 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="create-name" 
                    name="name"
                    type="text" 
                    autoComplete="name" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    placeholder="Nguyễn Văn A" 
                  />
                </div>

                {/* Email | Phone */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="create-email" className="block text-sm font-bold text-slate-800 mb-1">
                      Email đăng nhập <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="create-email" 
                      name="email"
                      type="email" 
                      autoComplete="email" 
                      value={formEmail} 
                      onChange={e => setFormEmail(e.target.value)} 
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                      placeholder="nguoidung@congty.com" 
                    />
                  </div>

                  <div>
                    <label htmlFor="create-phone" className="block text-sm font-bold text-slate-800 mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <input 
                      id="create-phone" 
                      name="phone"
                      type="tel" 
                      autoComplete="tel" 
                      value={formPhone} 
                      onChange={e => setFormPhone(e.target.value)} 
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                      placeholder="0912 345 678" 
                    />
                  </div>
                </div>

                {/* Username | Password */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="create-username" className="block text-sm font-bold text-slate-800 mb-1">
                      Tên đăng nhập (nếu khác email)
                    </label>
                    <input 
                      id="create-username" 
                      name="username"
                      type="text" 
                      autoComplete="username" 
                      value={formUsername} 
                      onChange={e => setFormUsername(e.target.value)} 
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                      placeholder="tendaicongty" 
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="create-password" className="block text-sm font-bold text-slate-800">
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newPass = generateSecurePassword();
                          setFormPassword(newPass);
                          setShowPassword(true);
                          toast.success("Đã sinh mật khẩu an toàn.");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Tạo mật khẩu
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        id="create-password" 
                        name="new-password"
                        type={showPassword ? "text" : "password"} 
                        autoComplete="new-password" 
                        value={formPassword} 
                        onChange={e => setFormPassword(e.target.value)} 
                        className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                        placeholder="Mật khẩu tài khoản"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: QUYỀN HỆ THỐNG */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">2</span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Quyền hệ thống</h3>
                </div>

                <div>
                  <label htmlFor="create-role" className="block text-sm font-bold text-slate-800 mb-1">
                    Vai trò hệ thống <span className="text-red-500">*</span>
                  </label>
                  <select 
                    id="create-role" 
                    value={formRole} 
                    onChange={e => setFormRole(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {allowedRoles.map(r => (
                      <option key={r.role} value={r.role}>{r.label}</option>
                    ))}
                  </select>
                  {ROLE_DESCRIPTIONS[formRole] && (
                    <p className="text-xs text-blue-700 mt-1.5 font-medium bg-blue-50 p-2 rounded-lg border border-blue-200">
                      ℹ️ {ROLE_DESCRIPTIONS[formRole]}
                    </p>
                  )}
                </div>

                {formRole === "SUPERVISION_HEAD" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-amber-900 text-sm">Cấu hình Trưởng ban giám sát</h4>
                    <div>
                      <label className="block text-xs font-bold text-amber-800 mb-1">Phạm vi giám sát</label>
                      <select 
                        aria-label="Phạm vi giám sát" 
                        value={formSupervisionScope} 
                        onChange={e => setFormSupervisionScope(e.target.value as any)} 
                        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white text-slate-900 font-semibold"
                      >
                        <option value="SELECTED_PROJECTS">Chỉ giám sát công trình được chọn</option>
                        <option value="ALL_PROJECTS">Giám sát toàn bộ công trình công ty</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: CÔNG TRÌNH ĐƯỢC PHÂN CÔNG (Searchable Assignment Panel) */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">3</span>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Công trình được phân công</h3>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    Đã chọn: {formProjectIds.length} công trình
                  </span>
                </div>

                {/* Filter and Search Bar for Projects */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Tìm công trình theo tên, mã, địa điểm..." 
                        value={modalProjectSearch}
                        onChange={e => setModalProjectSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setModalProjectTab("all")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${modalProjectTab === "all" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Tất cả ({projects.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalProjectTab("selected")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${modalProjectTab === "selected" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Đã chọn ({formProjectIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalProjectTab("unselected")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${modalProjectTab === "unselected" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Chưa chọn
                      </button>
                    </div>
                  </div>

                  {/* Project Items List */}
                  <div className="border border-slate-200 bg-white rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredModalProjects.map(p => {
                      const isChecked = formProjectIds.includes(p.id);
                      const title = p.displayName || p.name;

                      return (
                        <div key={p.id} className={`p-3 transition-colors ${isChecked ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                          <div className="flex items-start gap-3">
                            <input 
                              id={`project-chk-${p.id}`}
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={e => {
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
                              }} 
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                            />
                            <label htmlFor={`project-chk-${p.id}`} className="flex-1 cursor-pointer min-w-0">
                              <div className="font-bold text-slate-950 text-[13.5px] leading-snug">
                                {title}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">{p.code}</span>
                                {p.location && <span>· {p.location}</span>}
                              </div>
                            </label>
                          </div>

                          {/* Conditional Project Role Dropdown */}
                          {isChecked && (
                            <div className="mt-2 ml-7 pt-2 border-t border-blue-100 flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-900 shrink-0">Vai trò tại công trình:</span>
                              <select 
                                aria-label={`Vai trò tại công trình ${p.code}`} 
                                value={formProjectRoles[p.id] ?? ""} 
                                onChange={(event) => setFormProjectRoles((current) => ({ ...current, [p.id]: event.target.value }))} 
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900"
                              >
                                <option value="">Chọn vai trò tại công trình</option>
                                {projectRoleOptions.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredModalProjects.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Không tìm thấy công trình phù hợp.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowCreate(false)} 
                className="h-10 px-5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button 
                onClick={handleCreate} 
                disabled={loading} 
                className="h-10 px-6 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm active:scale-[0.98] transition-all"
              >
                {loading ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setEditUser(null)} />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-label="Sửa thông tin tài khoản" 
            className="relative w-full max-w-4xl max-h-[calc(100vh-48px)] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Sửa thông tin tài khoản</h2>
                <p className="text-xs text-slate-500 mt-0.5">Cập nhật vai trò và công trình phụ trách cho tài khoản <strong className="text-slate-900">{editUser.name}</strong>.</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* SECTION 1: THÔNG TIN TÀI KHOẢN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">1</span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Thông tin cá nhân</h3>
                </div>

                <div>
                  <label htmlFor="edit-name" className="block text-sm font-bold text-slate-800 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="edit-name" 
                    name="name"
                    type="text" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-email" className="block text-sm font-bold text-slate-800 mb-1">
                      Email đăng nhập <span className="text-red-500">*</span>
                    </label>
                    <input 
                      id="edit-email" 
                      name="email"
                      type="email" 
                      autoComplete="email" 
                      value={formEmail} 
                      onChange={e => setFormEmail(e.target.value)} 
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-phone" className="block text-sm font-bold text-slate-800 mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <input 
                      id="edit-phone" 
                      name="phone"
                      type="tel" 
                      autoComplete="tel" 
                      value={formPhone} 
                      onChange={e => setFormPhone(e.target.value)} 
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-username" className="block text-sm font-bold text-slate-800 mb-1">
                    Tên đăng nhập
                  </label>
                  <input 
                    id="edit-username" 
                    name="username"
                    type="text" 
                    value={formUsername} 
                    onChange={e => setFormUsername(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
              </div>

              {/* SECTION 2: QUYỀN HỆ THỐNG */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">2</span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Quyền hệ thống</h3>
                </div>

                <div>
                  <label htmlFor="edit-role" className="block text-sm font-bold text-slate-800 mb-1">
                    Vai trò hệ thống <span className="text-red-500">*</span>
                  </label>
                  <select 
                    id="edit-role" 
                    value={formRole} 
                    onChange={e => setFormRole(e.target.value)} 
                    disabled={editUser.id === currentUserId} 
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {allowedRoles.map(r => (
                      <option key={r.role} value={r.role}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 3: CÔNG TRÌNH ĐƯỢC PHÂN CÔNG */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">3</span>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Công trình được phân công</h3>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    Đã chọn: {formProjectIds.length} công trình
                  </span>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Tìm công trình theo tên, mã, địa điểm..." 
                        value={modalProjectSearch}
                        onChange={e => setModalProjectSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setModalProjectTab("all")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${modalProjectTab === "all" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Tất cả ({projects.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalProjectTab("selected")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${modalProjectTab === "selected" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Đã chọn ({formProjectIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalProjectTab("unselected")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${modalProjectTab === "unselected" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        Chưa chọn
                      </button>
                    </div>
                  </div>

                  {/* Project Items List */}
                  <div className="border border-slate-200 bg-white rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredModalProjects.map(p => {
                      const isChecked = formProjectIds.includes(p.id);
                      const title = p.displayName || p.name;

                      return (
                        <div key={p.id} className={`p-3 transition-colors ${isChecked ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                          <div className="flex items-start gap-3">
                            <input 
                              id={`edit-project-chk-${p.id}`}
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={e => {
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
                              }} 
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                            />
                            <label htmlFor={`edit-project-chk-${p.id}`} className="flex-1 cursor-pointer min-w-0">
                              <div className="font-bold text-slate-950 text-[13.5px] leading-snug">
                                {title}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">{p.code}</span>
                                {p.location && <span>· {p.location}</span>}
                              </div>
                            </label>
                          </div>

                          {/* Conditional Project Role Dropdown */}
                          {isChecked && (
                            <div className="mt-2 ml-7 pt-2 border-t border-blue-100 flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-900 shrink-0">Vai trò tại công trình:</span>
                              <select 
                                aria-label={`Vai trò tại công trình ${p.code}`} 
                                value={formProjectRoles[p.id] ?? ""} 
                                onChange={(event) => setFormProjectRoles((current) => ({ ...current, [p.id]: event.target.value }))} 
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900"
                              >
                                <option value="">Chọn vai trò tại công trình</option>
                                {projectRoleOptions.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              <button 
                onClick={() => setEditUser(null)} 
                className="h-10 px-5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button 
                onClick={handleEditSubmit} 
                disabled={loading} 
                className="h-10 px-6 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm active:scale-[0.98] transition-all"
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setDetailUser(null)} />
          <aside 
            role="dialog" 
            aria-modal="true" 
            aria-label="Chi tiết tài khoản" 
            className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Chi tiết tài khoản</h2>
                <p className="text-xs text-slate-500">Thông tin người dùng và phân công dự án</p>
              </div>
              <button onClick={() => setDetailUser(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Đóng chi tiết">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info Cards */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-950">{detailUser.name}</h3>
                  {getRoleBadge(detailUser.role, detailUser.roleDisplay)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 font-medium block">Email:</span>
                    <span className="font-bold text-slate-900">{detailUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Số điện thoại:</span>
                    <span className="font-bold text-slate-900">{detailUser.phone || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Tên đăng nhập:</span>
                    <span className="font-mono font-bold text-slate-900">{detailUser.username || detailUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Trạng thái:</span>
                    <StatusBadge variant={getAccountStatus(detailUser).variant} size="sm">
                      {getAccountStatus(detailUser).label}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              {/* Assigned Projects Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Công trình phụ trách ({detailUser.assignedProjects.length})
                </h4>

                {detailUser.assignedProjects.length > 0 ? (
                  <div className="space-y-2">
                    {detailUser.assignedProjects.map(p => (
                      <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                        <div className="font-bold text-slate-950 text-sm">
                          {p.displayName || p.name}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{p.code}</span>
                          {p.roleDisplay && <span className="font-semibold text-blue-700">Vai trò: {p.roleDisplay}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    Chưa được phân công công trình nào.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-200 bg-white px-6 py-4">
              <button onClick={() => setDetailUser(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">
                Đóng
              </button>
              {canManageUser(detailUser) && (
                <button 
                  onClick={() => { setDetailUser(null); openEdit(detailUser); }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Edit className="h-4 w-4" /> Chỉnh sửa
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Quick Assign Project Modal */}
      {assignUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setAssignUserId(null)} />
          <div role="dialog" aria-modal="true" aria-label="Gán công trình" className="relative w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-950">Gán công trình</h3>
            
            <div>
              <label htmlFor="assign-project" className="block text-xs font-bold text-slate-700 mb-1">Chọn công trình</label>
              <select 
                id="assign-project" 
                value={assignProjectId} 
                onChange={e => setAssignProjectId(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium bg-white text-slate-900"
              >
                <option value="">-- Chọn công trình --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.displayName || p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assign-project-role" className="block text-xs font-bold text-slate-700 mb-1">Vai trò tại công trình</label>
              <select 
                id="assign-project-role" 
                value={assignProjectRole} 
                onChange={(event) => setAssignProjectRole(event.target.value)} 
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
              >
                <option value="" disabled>Chọn vai trò tại công trình</option>
                {projectRoleOptions.map((role) => <option key={role.role} value={role.role}>{role.label}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setAssignUserId(null)} className="flex-1 h-10 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={handleAssignProject} disabled={!assignProjectId || !assignProjectRole || loading} className="flex-1 h-10 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">Gán công trình</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setResetPwUser(null)} />
          <div role="dialog" aria-modal="true" aria-label="Đặt lại mật khẩu" className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950">Đặt lại mật khẩu</h3>
              <button onClick={() => setResetPwUser(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {!tempPassword ? (
                <>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    Tạo mật khẩu ngẫu nhiên cho tài khoản <strong className="text-slate-950">{resetPwUser.name}</strong> ({resetPwUser.email}).
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs font-medium text-blue-800">
                    ℹ️ Mật khẩu tạm thời sẽ được hiển thị một lần duy nhất để bạn sao chép gửi cho người dùng.
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                    <p className="text-xs text-emerald-800 font-bold uppercase tracking-wide">Mật khẩu mới đã tạo:</p>
                    <div className="bg-white border border-emerald-300 rounded-xl py-3 px-4 font-mono text-xl font-black text-slate-950 tracking-wider flex items-center justify-between shadow-2xs">
                      <span>{tempPassword}</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success("Đã sao chép mật khẩu."); }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => { setResetPwUser(null); setTempPassword(null); }} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100">
                {tempPassword ? "Đóng" : "Hủy"}
              </button>
              {!tempPassword && (
                <button onClick={handleResetPwSubmit} disabled={loading} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Đang tạo..." : "Tạo mật khẩu tạm thời"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Confirm Dialog */}
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
