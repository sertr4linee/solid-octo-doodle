// Types for Labels System

export interface Label {
  id: string;
  name: string;
  description: string | null;
  color: string;
  boardId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskLabel {
  id: string;
  taskId: string;
  labelId: string;
  createdAt: Date;
  label?: Label;
}

export interface LabelWithStats extends Label {
  _count: {
    taskLabels: number;
  };
}

export interface LabelExport {
  boardId: string;
  exportedAt: string;
  labels: Array<{
    name: string;
    description: string | null;
    color: string;
    position: number;
  }>;
}

export interface LabelImportRequest {
  labels: Array<{
    name: string;
    description?: string;
    color: string;
  }>;
  mode?: "merge" | "replace";
}

// Predefined label colors
export const LABEL_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Gray", value: "#6b7280" },
  { name: "Slate", value: "#64748b" },
  { name: "Zinc", value: "#71717a" },
];

// Predefined label templates
export const LABEL_TEMPLATES = {
  priority: [
    { name: "Critical", color: "#dc2626", description: "Needs immediate attention" },
    { name: "High", color: "#ea580c", description: "Important and urgent" },
    { name: "Medium", color: "#f59e0b", description: "Normal priority" },
    { name: "Low", color: "#84cc16", description: "Can be done later" },
  ],
  status: [
    { name: "Not Started", color: "#6b7280", description: "Not yet begun" },
    { name: "In Progress", color: "#3b82f6", description: "Currently working on" },
    { name: "Review", color: "#f59e0b", description: "Needs review" },
    { name: "Done", color: "#22c55e", description: "Completed" },
    { name: "Blocked", color: "#dc2626", description: "Cannot proceed" },
  ],
  type: [
    { name: "Bug", color: "#dc2626", description: "Something isn't working" },
    { name: "Feature", color: "#3b82f6", description: "New functionality" },
    { name: "Enhancement", color: "#8b5cf6", description: "Improvement" },
    { name: "Documentation", color: "#06b6d4", description: "Documentation changes" },
    { name: "Refactor", color: "#f59e0b", description: "Code refactoring" },
  ],
  effort: [
    { name: "XS", color: "#84cc16", description: "Extra small effort" },
    { name: "S", color: "#22c55e", description: "Small effort" },
    { name: "M", color: "#f59e0b", description: "Medium effort" },
    { name: "L", color: "#ea580c", description: "Large effort" },
    { name: "XL", color: "#dc2626", description: "Extra large effort" },
  ],
};
