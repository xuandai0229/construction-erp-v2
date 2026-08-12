export interface WbsItem {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  designQuantity: number | null;
  progressPercent: number;
  status: string;
  description: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WbsTreeNode extends WbsItem {
  children: WbsTreeNode[];
  isLeaf: boolean;
}
