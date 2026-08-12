export interface DailyProgressItemRef {
  id: string;
  code: string;
  workContent: string;
  unit: string | null;
}

export interface UserRef {
  id: string;
  name: string;
  role: string;
}

export interface DailyProgressEntry {
  id: string;
  entryDate: string;
  quantity: number;
  status: string;
  note: string | null;
  issueNote: string | null;
  proposalNote: string | null;
  item: DailyProgressItemRef | null;
  createdBy: UserRef | null;
  approvedBy: UserRef | null;
  createdAt: string;
}

export interface CreateDailyProgressPayload {
  templateId: string;
  itemId: string;
  entryDate: string;
  quantity: number;
  note?: string;
  issueNote?: string;
  proposalNote?: string;
}
