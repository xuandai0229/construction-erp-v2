"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: string; projectId: string; title: string; description: string | null; priority: string; lifecycle: string; acceptance: string; execution: string; review: string; deadlineAt: Date | null; progressPercent: number; version: number; primaryAssigneeId: string | null; reviewerId: string | null; approverId: string | null; currentSubmissionId: string | null; creatorId: string; updatedAt: Date; primaryAssignee: { id: string; name: string } | null; project: { code: string; name: string }; actions: Array<{ id: string; action: string; actorId: string; occurredAt: Date; version: number }>;
};
type Project = { id: string; code: string; name: string };

const key = () => crypto.randomUUID();

export function TaskWorkspace({ projects, tasks, actorId, initialProjectId, initialMine }: { projects: Project[]; tasks: Task[]; actorId: string; initialProjectId: string | null; initialMine: boolean }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? "");
  const [mine, setMine] = useState(initialMine);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) ?? null, [selectedId, tasks]);

  const refresh = (nextProjectId = projectId, nextMine = mine) => {
    const params = new URLSearchParams();
    if (nextProjectId) params.set("projectId", nextProjectId);
    if (nextMine) params.set("mine", "1");
    setSelectedId(null);
    window.location.assign(`/tasks?${params.toString()}`);
  };
  const callAction = async (task: Task, action: string, command: Record<string, unknown>) => {
    setFeedback(null);
    const response = await fetch(`/api/work-management/tasks/${task.id}/actions`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key() }, body: JSON.stringify({ action, command: { taskId: task.id, expectedVersion: task.version, ...command } }) });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Không thể thực hiện thao tác.";
      setFeedback(message);
      if (response.status === 409) router.refresh();
      return;
    }
    setFeedback("Đã lưu thay đổi nhiệm vụ.");
    refresh();
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFeedback(null);
    const response = await fetch("/api/work-management/tasks/create", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key() }, body: JSON.stringify({ projectId, title: form.get("title"), description: form.get("description") || undefined, priority: form.get("priority"), currentDueAt: form.get("deadline") || undefined }) });
    const payload: unknown = await response.json();
    if (!response.ok) {
      setFeedback(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Không thể tạo nhiệm vụ.");
      return;
    }
    event.currentTarget.reset();
    setFeedback("Đã tạo nhiệm vụ và lưu vào công trình.");
    refresh();
  };
  const run = (fn: () => Promise<void>) => startTransition(() => { void fn(); });

  return <main className="mx-auto max-w-7xl space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Điều hành công việc</h1><p className="text-sm text-muted-foreground">Nhiệm vụ được lưu theo công trình và tải lại từ dữ liệu thật.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(event) => { const value = event.target.checked; setMine(value); refresh(projectId, value); }} /> Nhiệm vụ của tôi</label></header>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
      <div className="space-y-4"><div className="rounded-lg border bg-card p-4"><label className="block text-sm font-medium">Công trình</label><select className="mt-1 w-full rounded border p-2" value={projectId} onChange={(event) => { setProjectId(event.target.value); refresh(event.target.value, mine); }}><option value="">Chọn công trình</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} — {project.name}</option>)}</select></div>
      <div className="overflow-hidden rounded-lg border bg-card"><div className="border-b p-4 font-medium">Danh sách nhiệm vụ</div>{tasks.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Chưa có nhiệm vụ trong phạm vi hiện tại.</p> : <ul>{tasks.map((task) => <li key={task.id}><button type="button" className="w-full border-b p-4 text-left hover:bg-muted" onClick={() => setSelectedId(task.id)}><div className="flex justify-between gap-3"><strong>{task.title}</strong><span className="text-xs">{task.lifecycle}</span></div><div className="mt-1 text-sm text-muted-foreground">{task.project.code} · {task.primaryAssignee?.name ?? "Chưa giao"} · {task.progressPercent}%</div></button></li>)}</ul>}</div></div>
      <aside className="space-y-4"><form onSubmit={(event) => run(() => create(event))} className="rounded-lg border bg-card p-4"><h2 className="font-medium">Tạo nhiệm vụ</h2><input required name="title" minLength={3} className="mt-3 w-full rounded border p-2" placeholder="Tên nhiệm vụ" disabled={pending || !projectId} /><textarea name="description" className="mt-2 w-full rounded border p-2" placeholder="Mô tả" disabled={pending || !projectId} /><div className="mt-2 grid grid-cols-2 gap-2"><select name="priority" className="rounded border p-2" defaultValue="NORMAL"><option value="NORMAL">Bình thường</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn</option></select><input name="deadline" type="datetime-local" className="rounded border p-2" /></div><button className="mt-3 rounded bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50" disabled={pending || !projectId}>{pending ? "Đang lưu…" : "Tạo nhiệm vụ"}</button></form>
      {selected && <section className="rounded-lg border bg-card p-4"><div className="flex justify-between gap-4"><div><h2 className="font-medium">{selected.title}</h2><p className="text-sm text-muted-foreground">v{selected.version} · {selected.lifecycle} / {selected.review}</p></div><button type="button" onClick={() => setSelectedId(null)}>Đóng</button></div><p className="mt-3 text-sm">{selected.description}</p><p className="mt-3 text-sm">Tiến độ: <strong>{selected.progressPercent}%</strong> · Người thực hiện: {selected.primaryAssignee?.name ?? "Chưa giao"}</p><div className="mt-4 flex flex-wrap gap-2">
        {selected.creatorId === actorId && !selected.primaryAssigneeId && <button disabled={pending} onClick={() => { const assigneeId = window.prompt("ID người thực hiện"); if (assigneeId) run(() => callAction(selected, "ASSIGN", { primaryAssigneeId: assigneeId })); }} className="rounded border px-2 py-1">Giao việc</button>}
        {selected.primaryAssigneeId === actorId && selected.acceptance === "PENDING" && <button disabled={pending} onClick={() => run(() => callAction(selected, "ACCEPT", {}))} className="rounded border px-2 py-1">Nhận việc</button>}
        {selected.primaryAssigneeId === actorId && selected.acceptance === "ACCEPTED" && selected.lifecycle === "ASSIGNED" && <button disabled={pending} onClick={() => run(() => callAction(selected, "START", {}))} className="rounded border px-2 py-1">Bắt đầu</button>}
        {selected.primaryAssigneeId === actorId && selected.lifecycle === "IN_PROGRESS" && <button disabled={pending} onClick={() => { const progress = window.prompt("Tiến độ 0-100", String(selected.progressPercent)); if (progress !== null) run(() => callAction(selected, "UPDATE_PROGRESS", { progressPercent: Number(progress) })); }} className="rounded border px-2 py-1">Cập nhật tiến độ</button>}
        {selected.primaryAssigneeId === actorId && selected.lifecycle === "IN_PROGRESS" && <button disabled={pending} onClick={() => { const summary = window.prompt("Tóm tắt kết quả"); if (summary) run(() => callAction(selected, "SUBMIT", { summary })); }} className="rounded border px-2 py-1">Gửi kết quả</button>}
        {selected.reviewerId === actorId && selected.lifecycle === "SUBMITTED" && selected.currentSubmissionId && <button disabled={pending} onClick={() => { const reason = window.prompt("Lý do cần sửa"); if (reason) run(() => callAction(selected, "REQUEST_CHANGES", { submissionId: selected.currentSubmissionId, reason })); }} className="rounded border px-2 py-1">Yêu cầu sửa</button>}
        {selected.approverId === actorId && selected.lifecycle === "SUBMITTED" && selected.currentSubmissionId && <button disabled={pending} onClick={() => run(() => callAction(selected, "APPROVE_RESULT", { submissionId: selected.currentSubmissionId }))} className="rounded border px-2 py-1">Duyệt kết quả</button>}
        {selected.approverId === actorId && selected.review === "RESULT_APPROVED" && <button disabled={pending} onClick={() => run(() => callAction(selected, "CONFIRM_COMPLETION", {}))} className="rounded border px-2 py-1">Xác nhận hoàn thành</button>}
      </div><h3 className="mt-5 text-sm font-medium">Timeline</h3><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{selected.actions.map((action) => <li key={action.id}>{new Date(action.occurredAt).toLocaleString("vi-VN")} · {action.action} · v{action.version}</li>)}</ul></section>}
      {feedback && <p role="status" className="rounded border p-3 text-sm">{feedback}</p>}</aside>
    </section>
  </main>;
}
