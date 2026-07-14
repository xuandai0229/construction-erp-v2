export interface NotificationPort { enqueue(intent: { eventType: string; taskId: string; idempotencyKey?: string }): Promise<void>; }
