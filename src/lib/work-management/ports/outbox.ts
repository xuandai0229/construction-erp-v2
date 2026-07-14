export type OutboxIntent = { eventId: string; eventType: string; aggregateId: string; confidentiality: "NORMAL" | "CONFIDENTIAL"; payload: Record<string, string> };
export interface OutboxPort { enqueue(intent: OutboxIntent): Promise<void>; }
export interface OutboxDispatcherPort { dispatch(eventId: string): Promise<void>; }
export interface NotificationDeduplicationPort { hasProcessed(eventId: string): Promise<boolean>; markProcessed(eventId: string): Promise<void>; }
