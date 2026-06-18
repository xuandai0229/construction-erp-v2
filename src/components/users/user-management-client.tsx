"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Shield, ShieldCheck, UserCog, Lock, Unlock, Key, Building2, X, ChevronDown, Eye, Edit } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { createUser, toggleUserActive, assignProjectToUser, unassignProjectFromUser, resetUserPassword, updateUser } from "@/app/(dashboard)/users/actions";

interface UserData {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  role: string;
  roleDisplay: string;
  isActive: boolean;
  createdAt: string;
  assignedProjects: { id: string; code: string; name: string }[];
}

interface ProjectData {
  id: string;
  code: string;
  name: string;
  status: string;
}

export function UserManagementClient({ initialUsers, projects }: { initialUsers: UserData[]; projects: ProjectData[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailUser, setDetailUser] = useState<UserData | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("Test@123456");
  const [formRole, setFormRole] = useState("CHIEF_COMMANDER");
  const [formProjectIds, setFormProjectIds] = useState<string[]>([]);
  const [formNote, setFormNote] = useState("");

  // Assign project state
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");

  const filtered = initialUsers.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.username || "").toLowerCase().includes(search.toLowerCase()) || (u.phone || "").includes(search);
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || (statusFilter === "active" ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const handleCreate = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setLoading(true);
    setError("");
    const result = await createUser({
      name: formName,
      email: formEmail,
      username: formUsername || undefined,
      phone: formPhone || undefined,
      password: formPassword,
      role: formRole as any,
      projectIds: formProjectIds.length > 0 ? formProjectIds : undefined,
      note: formNote || undefined,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setShowCreate(false);
    resetForm();
    router.refresh();
  };

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormUsername(""); setFormPhone("");
    setFormPassword("Test@123456"); setFormRole("CHIEF_COMMANDER");
    setFormProjectIds([]); setFormNote(""); setError("");
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const actionName = isActive ? "khóa" : "mở khóa";
    if (!confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này không?\n${isActive ? "Người dùng sẽ không thể đăng nhập sau khi bị khóa. Dữ liệu cũ vẫn được giữ nguyên." : "Người dùng sẽ có thể đăng nhập lại bình thường."}`)) {
      return;
    }
    setLoading(true);
    await toggleUserActive(userId);
    setLoading(false);
    router.refresh();
  };

  const handleEditSubmit = async () => {
    if (!editUser) return;
    if (!formName.trim() || !formEmail.trim()) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setLoading(true);
    setError("");
    const result = await updateUser(editUser.id, {
      name: formName,
      email: formEmail,
      username: formUsername || undefined,
      phone: formPhone || undefined,
      role: formRole as any,
      projectIds: formProjectIds,
      note: formNote || undefined,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setEditUser(null);
    router.refresh();
  };

  const openEdit = (user: UserData) => {
    setEditUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormUsername(user.username || "");
    setFormPhone(user.phone || "");
    setFormRole(user.role);
    setFormProjectIds(user.assignedProjects.map(p => p.id));
    setFormNote(""); // We don't have the note in UserData directly, but we can leave it empty
    setError("");
  };

  const handleAssignProject = async () => {
    if (!assignUserId || !assignProjectId) return;
    setLoading(true);
    const result = await assignProjectToUser(assignUserId, assignProjectId);
    setLoading(false);
    if (result.error) { setError(result.error); setTimeout(() => setError(""), 3000); }
    setAssignUserId(null); setAssignProjectId("");
    router.refresh();
  };

  const handleUnassign = async (userId: string, projectId: string) => {
    if (!confirm("Xác nhận gỡ công trình?")) return;
    setLoading(true);
    await unassignProjectFromUser(userId, projectId);
    setLoading(false);
    router.refresh();
  };

  const handleResetPw = async (userId: string) => {
    const pw = prompt("Nhập mật khẩu mới (tối thiểu 6 ký tự):");
    if (!pw || pw.length < 6) { alert("Mật khẩu phải có ít nhất 6 ký tự"); return; }
    setLoading(true);
    const result = await resetUserPassword(userId, pw);
    setLoading(false);
    if (result.error) alert(result.error);
    else alert("Đã đổi mật khẩu thành công");
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

      {/* Filters + Create Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input id="user-search" type="text" placeholder="Tìm tên, email, SĐT..." aria-label="Tìm kiếm người dùng" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400" />
        </div>
        <select id="user-role-filter" aria-label="Lọc theo vai trò" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900">
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Quản trị</option>
          <option value="DIRECTOR">Giám đốc</option>
          <option value="DEPUTY_DIRECTOR">Phó giám đốc</option>
          <option value="CHIEF_COMMANDER">Chỉ huy trưởng</option>
        </select>
        <select id="user-status-filter" aria-label="Lọc theo trạng thái" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã khóa</option>
        </select>
        <button onClick={() => { setShowCreate(true); resetForm(); }} className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Tạo tài khoản
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900">Họ tên</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Đăng nhập / Email</th>
              <th className="px-4 py-3 font-semibold text-slate-900">SĐT</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Vai trò</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Công trình</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Trạng thái</th>
              <th className="px-4 py-3 font-semibold text-slate-900 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
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
                      <span key={p.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded font-medium">
                        {p.code}
                        <button onClick={() => handleUnassign(user.id, p.id)} className="hover:text-red-500 ml-0.5" aria-label={`Gỡ ${p.code}`}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <button onClick={() => { setAssignUserId(user.id); setAssignProjectId(""); }} className="inline-flex items-center px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50 rounded" aria-label="Gán công trình">
                      <Plus className="h-3 w-3 mr-0.5" />Gán
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.isActive
                    ? <StatusBadge variant="success" size="sm">Hoạt động</StatusBadge>
                    : <StatusBadge variant="danger" size="sm">Đã khóa</StatusBadge>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setDetailUser(user)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Xem chi tiết" aria-label={`Xem chi tiết tài khoản ${user.name}`}>
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(user)} className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600" title="Sửa thông tin" aria-label={`Sửa thông tin tài khoản ${user.name}`}>
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleToggleActive(user.id, user.isActive)} className={`p-1.5 rounded-md text-xs ${user.isActive ? "hover:bg-red-50 text-red-500" : "hover:bg-green-50 text-green-600"}`} title={user.isActive ? "Khóa" : "Mở khóa"} aria-label={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                      {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                    <button onClick={() => handleResetPw(user.id)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title="Đổi mật khẩu" aria-label="Đổi mật khẩu">
                      <Key className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Không tìm thấy tài khoản phù hợp</div>}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {filtered.map(user => (
          <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {user.isActive
                  ? <StatusBadge variant="success" size="sm">Hoạt động</StatusBadge>
                  : <StatusBadge variant="danger" size="sm">Đã khóa</StatusBadge>}
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
              <button onClick={() => { setAssignUserId(user.id); setAssignProjectId(""); }} className="text-xs text-blue-600 hover:underline" aria-label="Gán công trình">+ Gán</button>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setDetailUser(user)} className="flex-1 h-8 rounded-md text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label={`Xem chi tiết tài khoản ${user.name}`}>Xem</button>
              <button onClick={() => openEdit(user)} className="flex-1 h-8 rounded-md text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50" aria-label={`Sửa thông tin tài khoản ${user.name}`}>Sửa</button>
              <button onClick={() => handleToggleActive(user.id, user.isActive)} className={`flex-1 h-8 rounded-md text-xs font-medium border ${user.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`} aria-label={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                {user.isActive ? "Khóa" : "Mở khóa"}
              </button>
              <button onClick={() => handleResetPw(user.id)} className="flex-1 h-8 rounded-md text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Đổi mật khẩu">Đổi MK</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                <input id="create-name" type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input id="create-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="user@email.com" />
                  <p className="text-[11px] text-slate-500 mt-1">Dùng để đăng nhập. Hệ thống không gửi email thật.</p>
                </div>
                <div>
                  <label htmlFor="create-username" className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                  <input id="create-username" type="text" value={formUsername} onChange={e => setFormUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="commander01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-phone" className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input id="create-phone" type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="0901234567" />
                  <p className="text-[11px] text-slate-500 mt-1">Chưa xác minh OTP.</p>
                </div>
                <div>
                  <label htmlFor="create-password" className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu *</label>
                  <input id="create-password" type="text" value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" />
                  <p className="text-[11px] text-slate-500 mt-1">Vui lòng gửi MK thủ công cho người dùng.</p>
                </div>
              </div>
              <div>
                <label htmlFor="create-role" className="block text-sm font-medium text-slate-700 mb-1">Vai trò *</label>
                <select id="create-role" value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                  <option value="CHIEF_COMMANDER">Chỉ huy trưởng</option>
                  <option value="DEPUTY_DIRECTOR">Phó giám đốc</option>
                  <option value="DIRECTOR">Giám đốc</option>
                  <option value="ADMIN">Quản trị hệ thống</option>
                  <option value="MANAGER">Quản lý</option>
                  <option value="ENGINEER">Kỹ sư</option>
                  <option value="STAFF">Nhân viên</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Công trình được giao</label>
                <div className="border border-slate-300 rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formProjectIds.includes(p.id)} onChange={e => { if (e.target.checked) setFormProjectIds([...formProjectIds, p.id]); else setFormProjectIds(formProjectIds.filter(id => id !== p.id)); }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700"><span className="font-semibold">{p.code}</span> - {p.name}</span>
                    </label>
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

      {/* Detail User Modal */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setDetailUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">Chi tiết tài khoản</h2>
              <button onClick={() => setDetailUser(null)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Đóng chi tiết">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
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
                    {detailUser.isActive ? <StatusBadge variant="success" size="sm">Hoạt động</StatusBadge> : <StatusBadge variant="danger" size="sm">Đã khóa</StatusBadge>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Vai trò</p>
                  <div className="mt-1">{getRoleBadge(detailUser.role, detailUser.roleDisplay)}</div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Ngày tạo</p>
                  <p className="text-sm text-slate-900">{new Date(detailUser.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Công trình được giao</p>
                {detailUser.assignedProjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detailUser.assignedProjects.map(p => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700 font-medium">{p.code} - {p.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Chưa được giao công trình nào.</p>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end rounded-b-2xl">
              <button onClick={() => setDetailUser(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setEditUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                <input id="edit-name" type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input id="edit-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="user@email.com" />
                  <p className="text-[11px] text-slate-500 mt-1">Dùng để đăng nhập. Hệ thống không gửi email thật.</p>
                </div>
                <div>
                  <label htmlFor="edit-username" className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                  <input id="edit-username" type="text" value={formUsername} onChange={e => setFormUsername(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="commander01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input id="edit-phone" type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="0901234567" />
                </div>
                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-slate-700 mb-1">Vai trò *</label>
                  <select id="edit-role" value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500">
                    <option value="CHIEF_COMMANDER">Chỉ huy trưởng</option>
                    <option value="DEPUTY_DIRECTOR">Phó giám đốc</option>
                    <option value="DIRECTOR">Giám đốc</option>
                    <option value="ADMIN">Quản trị hệ thống</option>
                    <option value="MANAGER">Quản lý</option>
                    <option value="ENGINEER">Kỹ sư</option>
                    <option value="STAFF">Nhân viên</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Công trình được giao</label>
                <div className="border border-slate-300 rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formProjectIds.includes(p.id)} onChange={e => { if (e.target.checked) setFormProjectIds([...formProjectIds, p.id]); else setFormProjectIds(formProjectIds.filter(id => id !== p.id)); }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-slate-700"><span className="font-semibold">{p.code}</span> - {p.name}</span>
                    </label>
                  ))}
                </div>
                {formRole === "CHIEF_COMMANDER" && formProjectIds.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">Cảnh báo: Chỉ huy trưởng nên được giao ít nhất 1 công trình.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setAssignUserId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Gán công trình</h3>
            <label htmlFor="assign-project" className="sr-only">Chọn công trình</label>
            <select id="assign-project" value={assignProjectId} onChange={e => setAssignProjectId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900">
              <option value="">Chọn công trình</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setAssignUserId(null)} className="flex-1 h-10 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={handleAssignProject} disabled={!assignProjectId || loading} className="flex-1 h-10 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Gán</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
