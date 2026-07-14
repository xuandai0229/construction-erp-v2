export interface DocumentAccessPort { canAttach(actorId: string, documentId: string): Promise<boolean>; }
