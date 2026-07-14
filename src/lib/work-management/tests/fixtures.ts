import type { TaskSnapshot, TaskState } from "../domain/types";

export const now = new Date("2026-07-14T08:00:00.000Z");
export const draftState = (): TaskState => ({ lifecycle: "DRAFT", acceptance: "NOT_REQUIRED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null });
export const activeState = (): TaskState => ({ lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null });
export const task = (state = activeState()): TaskSnapshot => ({ id: "task-1", state, creatorId: "creator", assignedById: "manager", projectId: "project-1", confidentiality: "NORMAL", requiresIndependentReviewer: true, primaryAssigneeId: "assignee", reviewerId: "reviewer", approverId: "approver", participants: [{ userId: "assignee", role: "PRIMARY_ASSIGNEE" }, { userId: "collaborator", role: "COLLABORATOR" }, { userId: "reviewer", role: "REVIEWER" }, { userId: "approver", role: "APPROVER" }, { userId: "watcher", role: "WATCHER" }] });
