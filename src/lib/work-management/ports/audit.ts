export interface AuditPort { record(intent: { action: string; taskId: string; actorId: string; occurredAt: Date }): Promise<void>; }
