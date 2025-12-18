/**
 * Automation System Types
 * 
 * Type definitions for the automation system
 */

export type TriggerType = 
  | "card_created"
  | "card_moved"
  | "card_updated"
  | "due_date_approaching"
  | "due_date_passed"
  | "checklist_completed"
  | "checklist_item_checked"
  | "comment_added"
  | "comment_mention"
  | "label_added"
  | "label_removed"
  | "member_assigned"
  | "member_unassigned"
  | "attachment_added"
  | "webhook_received"
  | "scheduled";

export type ActionType =
  | "move_card"
  | "assign_member"
  | "unassign_member"
  | "add_label"
  | "remove_label"
  | "add_comment"
  | "send_notification"
  | "send_webhook"
  | "set_due_date"
  | "archive_card"
  | "copy_card"
  | "create_checklist"
  | "mark_checklist_complete";

export interface TriggerConfig {
  daysBeforeDue?: number;
  hoursBeforeDue?: number;
  fromListId?: string;
  toListId?: string;
  labelId?: string;
  labelName?: string;
  memberId?: string;
  checklistName?: string;
  requireAllItems?: boolean;
  webhookId?: string;
  cronExpression?: string;
}

export interface Condition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "is_empty" | "is_not_empty" | "greater_than" | "less_than";
  value: any;
}

export interface ActionConfig {
  type: ActionType;
  targetListId?: string;
  userId?: string;
  assignCreator?: boolean;
  assignRandom?: boolean;
  labelId?: string;
  labelName?: string;
  createIfMissing?: boolean;
  commentContent?: string;
  notifyType?: "user" | "assignee" | "creator" | "board_members" | "specific";
  notifyUserIds?: string[];
  notificationTitle?: string;
  notificationMessage?: string;
  webhookUrl?: string;
  webhookMethod?: "GET" | "POST" | "PUT";
  webhookHeaders?: Record<string, string>;
  webhookPayload?: string;
  dueDateOffset?: number;
  dueDateHour?: number;
  copyToListId?: string;
  copyTitle?: string;
  checklistName?: string;
  checklistItems?: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  boardId: string;
  enabled: boolean;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  conditions: Condition[];
  actions: ActionConfig[];
  isTemplate: boolean;
  templateId?: string;
  priority: number;
  maxExecutions?: number;
  executionCount: number;
  delay?: number;
  schedule?: string;
  lastCheckedAt?: Date;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    image?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    logs: number;
  };
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  triggerEvent: string;
  triggerData?: any;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  actionsExecuted?: any[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  conditions: Condition[];
  actions: ActionConfig[];
  usageCount: number;
  isPredefined: boolean;
  isPublic: boolean;
}

export interface AutomationWebhook {
  id: string;
  boardId: string;
  name: string;
  description?: string;
  secret: string;
  endpoint: string;
  enabled: boolean;
  allowedIps?: string[];
  requireSignature: boolean;
  callCount: number;
  lastCalledAt?: Date;
  actions: ActionConfig[];
  webhookUrl: string;
  createdBy?: {
    id: string;
    name: string;
    image?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Trigger metadata for UI
export const TRIGGER_METADATA: Record<TriggerType, {
  label: string;
  description: string;
  icon: string;
  category: string;
  configFields?: string[];
}> = {
  card_created: {
    label: "Carte créée",
    description: "Se déclenche quand une nouvelle carte est créée",
    icon: "➕",
    category: "cards",
  },
  card_moved: {
    label: "Carte déplacée",
    description: "Se déclenche quand une carte est déplacée dans une autre liste",
    icon: "↔️",
    category: "cards",
    configFields: ["fromListId", "toListId"],
  },
  card_updated: {
    label: "Carte modifiée",
    description: "Se déclenche quand une carte est modifiée",
    icon: "✏️",
    category: "cards",
  },
  due_date_approaching: {
    label: "Date d'échéance approche",
    description: "Se déclenche quand la date d'échéance approche",
    icon: "⏰",
    category: "dates",
    configFields: ["daysBeforeDue", "hoursBeforeDue"],
  },
  due_date_passed: {
    label: "Date d'échéance dépassée",
    description: "Se déclenche quand la date d'échéance est dépassée",
    icon: "⚠️",
    category: "dates",
  },
  checklist_completed: {
    label: "Checklist complétée",
    description: "Se déclenche quand tous les éléments d'une checklist sont cochés",
    icon: "✅",
    category: "checklists",
    configFields: ["checklistName"],
  },
  checklist_item_checked: {
    label: "Élément de checklist coché",
    description: "Se déclenche quand un élément de checklist est coché",
    icon: "☑️",
    category: "checklists",
  },
  comment_added: {
    label: "Commentaire ajouté",
    description: "Se déclenche quand un commentaire est ajouté",
    icon: "💬",
    category: "comments",
  },
  comment_mention: {
    label: "Mention dans un commentaire",
    description: "Se déclenche quand quelqu'un est mentionné dans un commentaire",
    icon: "@",
    category: "comments",
  },
  label_added: {
    label: "Label ajouté",
    description: "Se déclenche quand un label est ajouté à une carte",
    icon: "🏷️",
    category: "labels",
    configFields: ["labelId", "labelName"],
  },
  label_removed: {
    label: "Label retiré",
    description: "Se déclenche quand un label est retiré d'une carte",
    icon: "🏷️",
    category: "labels",
    configFields: ["labelId", "labelName"],
  },
  member_assigned: {
    label: "Membre assigné",
    description: "Se déclenche quand un membre est assigné à une carte",
    icon: "👤",
    category: "members",
    configFields: ["memberId"],
  },
  member_unassigned: {
    label: "Membre retiré",
    description: "Se déclenche quand un membre est retiré d'une carte",
    icon: "👤",
    category: "members",
  },
  attachment_added: {
    label: "Pièce jointe ajoutée",
    description: "Se déclenche quand une pièce jointe est ajoutée",
    icon: "📎",
    category: "attachments",
  },
  webhook_received: {
    label: "Webhook reçu",
    description: "Se déclenche quand un webhook externe est reçu",
    icon: "🔗",
    category: "integrations",
    configFields: ["webhookId"],
  },
  scheduled: {
    label: "Planifié",
    description: "Se déclenche selon un horaire défini (cron)",
    icon: "📅",
    category: "scheduling",
    configFields: ["cronExpression"],
  },
};

// Action metadata for UI
export const ACTION_METADATA: Record<ActionType, {
  label: string;
  description: string;
  icon: string;
  category: string;
  configFields: string[];
}> = {
  move_card: {
    label: "Déplacer la carte",
    description: "Déplace la carte vers une autre liste",
    icon: "↗️",
    category: "cards",
    configFields: ["targetListId"],
  },
  assign_member: {
    label: "Assigner un membre",
    description: "Assigne un membre à la carte",
    icon: "👤",
    category: "members",
    configFields: ["userId", "assignCreator", "assignRandom"],
  },
  unassign_member: {
    label: "Retirer l'assignation",
    description: "Retire l'assignation de la carte",
    icon: "👤",
    category: "members",
    configFields: [],
  },
  add_label: {
    label: "Ajouter un label",
    description: "Ajoute un label à la carte",
    icon: "🏷️",
    category: "labels",
    configFields: ["labelId", "labelName", "createIfMissing"],
  },
  remove_label: {
    label: "Retirer un label",
    description: "Retire un label de la carte",
    icon: "🏷️",
    category: "labels",
    configFields: ["labelId", "labelName"],
  },
  add_comment: {
    label: "Ajouter un commentaire",
    description: "Ajoute un commentaire automatique à la carte",
    icon: "💬",
    category: "comments",
    configFields: ["commentContent"],
  },
  send_notification: {
    label: "Envoyer une notification",
    description: "Envoie une notification aux utilisateurs",
    icon: "🔔",
    category: "notifications",
    configFields: ["notifyType", "notifyUserIds", "notificationTitle", "notificationMessage"],
  },
  send_webhook: {
    label: "Envoyer un webhook",
    description: "Envoie une requête HTTP à une URL externe",
    icon: "🔗",
    category: "integrations",
    configFields: ["webhookUrl", "webhookMethod", "webhookHeaders", "webhookPayload"],
  },
  set_due_date: {
    label: "Définir la date d'échéance",
    description: "Définit ou modifie la date d'échéance de la carte",
    icon: "📅",
    category: "dates",
    configFields: ["dueDateOffset", "dueDateHour"],
  },
  archive_card: {
    label: "Archiver la carte",
    description: "Archive la carte",
    icon: "📦",
    category: "cards",
    configFields: [],
  },
  copy_card: {
    label: "Copier la carte",
    description: "Crée une copie de la carte",
    icon: "📋",
    category: "cards",
    configFields: ["copyToListId", "copyTitle"],
  },
  create_checklist: {
    label: "Créer une checklist",
    description: "Ajoute une nouvelle checklist à la carte",
    icon: "☑️",
    category: "checklists",
    configFields: ["checklistName", "checklistItems"],
  },
  mark_checklist_complete: {
    label: "Compléter la checklist",
    description: "Marque tous les éléments d'une checklist comme complétés",
    icon: "✅",
    category: "checklists",
    configFields: ["checklistName"],
  },
};

// Condition operators for UI
export const CONDITION_OPERATORS = [
  { value: "equals", label: "est égal à" },
  { value: "not_equals", label: "n'est pas égal à" },
  { value: "contains", label: "contient" },
  { value: "not_contains", label: "ne contient pas" },
  { value: "is_empty", label: "est vide" },
  { value: "is_not_empty", label: "n'est pas vide" },
  { value: "greater_than", label: "est supérieur à" },
  { value: "less_than", label: "est inférieur à" },
];

// Condition fields for UI
export const CONDITION_FIELDS = [
  { value: "task.title", label: "Titre de la carte" },
  { value: "task.description", label: "Description de la carte" },
  { value: "task.assigneeId", label: "Assigné" },
  { value: "task.dueDate", label: "Date d'échéance" },
  { value: "task.taskLabels", label: "Labels" },
  { value: "task.archived", label: "Est archivée" },
  { value: "list.name", label: "Nom de la liste" },
];

// Template categories
export const TEMPLATE_CATEGORIES = [
  { value: "productivity", label: "Productivité", icon: "⚡" },
  { value: "notifications", label: "Notifications", icon: "🔔" },
  { value: "organization", label: "Organisation", icon: "📁" },
  { value: "integrations", label: "Intégrations", icon: "🔗" },
];
