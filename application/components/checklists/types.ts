export interface ChecklistItem {
  id: string;
  checklistId: string;
  content: string;
  checked: boolean;
  position: number;
  assigneeId?: string;
  dueDate?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  children?: ChecklistItem[];
}

export interface Checklist {
  id: string;
  taskId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
}

export interface ChecklistTemplate {
  id: string;
  boardId?: string;
  name: string;
  items: string; // JSON
  isGlobal: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
