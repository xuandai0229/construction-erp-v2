export const WORK_MANAGEMENT_DOMAIN_EVENTS = [
  "TaskCreated",
  "TaskAssigned",
  "TaskAccepted",
  "TaskClarificationRequested",
  "TaskStarted",
  "TaskProgressUpdated",
  "TaskExtensionRequested",
  "TaskDeadlineChanged",
  "TaskPaused",
  "TaskResumed",
  "TaskBlocked",
  "TaskUnblocked",
  "TaskSubmitted",
  "TaskChangesRequested",
  "TaskResultApproved",
  "TaskCompleted",
  "TaskReopened",
  "TaskCancelled",
  "TaskArchived",
  "TaskRestored",
  "TaskHandoverRequested",
  "TaskHandoverAccepted",
  "TaskHandoverRejected",
  "TaskHandoverApproved",
  "TaskHandoverEffective",
  "ResponsibilityAssigned",
  "DelegationCreated",
  "DelegationRevoked",
] as const;

export type WorkManagementDomainEvent =
  (typeof WORK_MANAGEMENT_DOMAIN_EVENTS)[number];

export type DomainEventEnvelope = { type: WorkManagementDomainEvent; taskId: string; occurredAt: Date; actorId: string };
