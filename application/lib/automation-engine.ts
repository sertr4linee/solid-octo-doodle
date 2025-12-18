/**
 * Automation Engine
 * 
 * Handles the execution of automation rules based on triggers and conditions.
 * Supports various trigger types and actions for kanban board automation.
 */

import { prisma } from "./prisma";

// ==========================================
// TYPES & INTERFACES
// ==========================================

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
  // For due_date_approaching
  daysBeforeDue?: number;
  hoursBeforeDue?: number;
  
  // For card_moved
  fromListId?: string;
  toListId?: string;
  
  // For label triggers
  labelId?: string;
  labelName?: string;
  
  // For member triggers
  memberId?: string;
  
  // For checklist triggers
  checklistName?: string;
  requireAllItems?: boolean;
  
  // For webhook_received
  webhookId?: string;
  
  // For scheduled triggers
  cronExpression?: string;
}

export interface Condition {
  field: string; // e.g., "task.title", "task.labels", "task.assigneeId"
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "is_empty" | "is_not_empty" | "greater_than" | "less_than";
  value: any;
}

export interface ActionConfig {
  type: ActionType;
  
  // For move_card
  targetListId?: string;
  
  // For assign/unassign member
  userId?: string;
  assignCreator?: boolean; // Assign the task creator
  assignRandom?: boolean; // Assign random board member
  
  // For add/remove label
  labelId?: string;
  labelName?: string;
  createIfMissing?: boolean;
  
  // For add_comment
  commentContent?: string; // Supports variables like {{task.title}}, {{user.name}}
  
  // For send_notification
  notifyType?: "user" | "assignee" | "creator" | "board_members" | "specific";
  notifyUserIds?: string[];
  notificationTitle?: string;
  notificationMessage?: string;
  
  // For send_webhook
  webhookUrl?: string;
  webhookMethod?: "GET" | "POST" | "PUT";
  webhookHeaders?: Record<string, string>;
  webhookPayload?: string; // JSON template with variables
  
  // For set_due_date
  dueDateOffset?: number; // Days from now
  dueDateHour?: number;
  
  // For copy_card
  copyToListId?: string;
  copyTitle?: string;
  
  // For create_checklist
  checklistName?: string;
  checklistItems?: string[];
}

export interface TriggerContext {
  taskId?: string;
  task?: any;
  userId?: string;
  user?: any;
  boardId: string;
  board?: any;
  listId?: string;
  previousListId?: string;
  labelId?: string;
  commentId?: string;
  checklistId?: string;
  webhookPayload?: any;
  metadata?: Record<string, any>;
}

// ==========================================
// AUTOMATION ENGINE
// ==========================================

export class AutomationEngine {
  private boardId: string;
  
  constructor(boardId: string) {
    this.boardId = boardId;
  }
  
  /**
   * Process a trigger event and execute matching automation rules
   */
  async processTrigger(
    triggerType: TriggerType,
    context: TriggerContext
  ): Promise<{ rulesExecuted: number; results: any[] }> {
    const results: any[] = [];
    
    try {
      // Get all enabled rules for this trigger type
      const rules = await prisma.automationRule.findMany({
        where: {
          boardId: this.boardId,
          enabled: true,
          triggerType,
        },
        orderBy: { priority: "desc" },
      });
      
      for (const rule of rules) {
        // Check max executions
        if (rule.maxExecutions && rule.executionCount >= rule.maxExecutions) {
          continue;
        }
        
        // Check trigger config matches
        const triggerConfig = JSON.parse(rule.triggerConfig || "{}") as TriggerConfig;
        if (!this.matchesTriggerConfig(triggerType, triggerConfig, context)) {
          continue;
        }
        
        // Check conditions
        const conditions = JSON.parse(rule.conditions || "[]") as Condition[];
        if (conditions.length > 0 && !await this.evaluateConditions(conditions, context)) {
          continue;
        }
        
        // Execute actions
        const result = await this.executeRule(rule, context);
        results.push(result);
      }
      
      return { rulesExecuted: results.length, results };
    } catch (error) {
      console.error("Error processing trigger:", error);
      throw error;
    }
  }
  
  /**
   * Check if trigger config matches the context
   */
  private matchesTriggerConfig(
    triggerType: TriggerType,
    config: TriggerConfig,
    context: TriggerContext
  ): boolean {
    switch (triggerType) {
      case "card_moved":
        if (config.fromListId && config.fromListId !== context.previousListId) return false;
        if (config.toListId && config.toListId !== context.listId) return false;
        return true;
        
      case "label_added":
      case "label_removed":
        if (config.labelId && config.labelId !== context.labelId) return false;
        return true;
        
      case "member_assigned":
      case "member_unassigned":
        if (config.memberId && config.memberId !== context.userId) return false;
        return true;
        
      default:
        return true;
    }
  }
  
  /**
   * Evaluate all conditions against the context
   */
  private async evaluateConditions(
    conditions: Condition[],
    context: TriggerContext
  ): Promise<boolean> {
    // Get full task data if needed
    let task = context.task;
    if (!task && context.taskId) {
      task = await prisma.task.findUnique({
        where: { id: context.taskId },
        include: {
          taskLabels: { include: { label: true } },
          assignee: true,
          checklists: { include: { items: true } },
        },
      });
    }
    
    for (const condition of conditions) {
      const value = this.getFieldValue(condition.field, { ...context, task });
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get a nested field value from context
   */
  private getFieldValue(field: string, context: any): any {
    const parts = field.split(".");
    let value = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }
  
  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: Condition, value: any): boolean {
    switch (condition.operator) {
      case "equals":
        return value === condition.value;
      case "not_equals":
        return value !== condition.value;
      case "contains":
        if (Array.isArray(value)) {
          return value.some(v => 
            typeof v === "object" 
              ? JSON.stringify(v).includes(condition.value)
              : String(v).includes(condition.value)
          );
        }
        return String(value || "").toLowerCase().includes(String(condition.value).toLowerCase());
      case "not_contains":
        if (Array.isArray(value)) {
          return !value.some(v => String(v).includes(condition.value));
        }
        return !String(value || "").toLowerCase().includes(String(condition.value).toLowerCase());
      case "is_empty":
        return !value || (Array.isArray(value) && value.length === 0);
      case "is_not_empty":
        return value && (!Array.isArray(value) || value.length > 0);
      case "greater_than":
        return Number(value) > Number(condition.value);
      case "less_than":
        return Number(value) < Number(condition.value);
      default:
        return true;
    }
  }
  
  /**
   * Execute a rule's actions
   */
  private async executeRule(rule: any, context: TriggerContext): Promise<any> {
    const startTime = Date.now();
    const actionsExecuted: any[] = [];
    let error: string | null = null;
    
    // Create log entry
    const log = await prisma.automationLog.create({
      data: {
        id: `alog_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        ruleId: rule.id,
        triggerEvent: rule.triggerType,
        triggerData: JSON.stringify(context),
        status: "running",
      },
    });
    
    try {
      const actions = JSON.parse(rule.actions) as ActionConfig[];
      
      // Handle delay if configured
      if (rule.delay && rule.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, rule.delay));
      }
      
      for (const action of actions) {
        const result = await this.executeAction(action, context);
        actionsExecuted.push({ action: action.type, result });
      }
      
      // Update execution count
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { executionCount: { increment: 1 } },
      });
      
      // Update log
      await prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          actionsExecuted: JSON.stringify(actionsExecuted),
          completedAt: new Date(),
          duration: Date.now() - startTime,
        },
      });
      
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      
      await prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: "failed",
          actionsExecuted: JSON.stringify(actionsExecuted),
          error,
          completedAt: new Date(),
          duration: Date.now() - startTime,
        },
      });
    }
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      success: !error,
      actionsExecuted,
      error,
      duration: Date.now() - startTime,
    };
  }
  
  /**
   * Execute a single action
   */
  private async executeAction(
    action: ActionConfig,
    context: TriggerContext
  ): Promise<any> {
    switch (action.type) {
      case "move_card":
        return this.actionMoveCard(action, context);
      case "assign_member":
        return this.actionAssignMember(action, context);
      case "unassign_member":
        return this.actionUnassignMember(action, context);
      case "add_label":
        return this.actionAddLabel(action, context);
      case "remove_label":
        return this.actionRemoveLabel(action, context);
      case "add_comment":
        return this.actionAddComment(action, context);
      case "send_notification":
        return this.actionSendNotification(action, context);
      case "send_webhook":
        return this.actionSendWebhook(action, context);
      case "set_due_date":
        return this.actionSetDueDate(action, context);
      case "archive_card":
        return this.actionArchiveCard(action, context);
      case "copy_card":
        return this.actionCopyCard(action, context);
      case "create_checklist":
        return this.actionCreateChecklist(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  // ==========================================
  // ACTION IMPLEMENTATIONS
  // ==========================================
  
  private async actionMoveCard(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId || !action.targetListId) {
      throw new Error("taskId and targetListId required for move_card");
    }
    
    // Get the max position in target list
    const maxPosition = await prisma.task.aggregate({
      where: { listId: action.targetListId },
      _max: { position: true },
    });
    
    const task = await prisma.task.update({
      where: { id: context.taskId },
      data: {
        listId: action.targetListId,
        position: (maxPosition._max.position ?? 0) + 1,
      },
    });
    
    return { moved: true, taskId: task.id, listId: action.targetListId };
  }
  
  private async actionAssignMember(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId) throw new Error("taskId required for assign_member");
    
    let userId = action.userId;
    
    if (action.assignCreator && context.task) {
      const task = await prisma.task.findUnique({
        where: { id: context.taskId },
        include: { list: { include: { board: true } } },
      });
      userId = task?.list.board.createdById;
    }
    
    if (action.assignRandom) {
      const members = await prisma.boardMember.findMany({
        where: { boardId: this.boardId },
        select: { userId: true },
      });
      if (members.length > 0) {
        userId = members[Math.floor(Math.random() * members.length)].userId;
      }
    }
    
    if (!userId) throw new Error("No user to assign");
    
    const task = await prisma.task.update({
      where: { id: context.taskId },
      data: { assigneeId: userId },
    });
    
    return { assigned: true, taskId: task.id, userId };
  }
  
  private async actionUnassignMember(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId) throw new Error("taskId required for unassign_member");
    
    const task = await prisma.task.update({
      where: { id: context.taskId },
      data: { assigneeId: null },
    });
    
    return { unassigned: true, taskId: task.id };
  }
  
  private async actionAddLabel(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId) throw new Error("taskId required for add_label");
    
    let labelId = action.labelId;
    
    // Find by name if no ID provided
    if (!labelId && action.labelName) {
      let label = await prisma.label.findFirst({
        where: { boardId: this.boardId, name: action.labelName },
      });
      
      if (!label && action.createIfMissing) {
        label = await prisma.label.create({
          data: {
            id: `lbl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: action.labelName,
            color: "#6366f1", // Default color
            boardId: this.boardId,
          },
        });
      }
      
      labelId = label?.id;
    }
    
    if (!labelId) throw new Error("Label not found");
    
    // Check if already has label
    const existing = await prisma.taskLabel.findFirst({
      where: { taskId: context.taskId, labelId },
    });
    
    if (!existing) {
      await prisma.taskLabel.create({
        data: {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          taskId: context.taskId,
          labelId,
        },
      });
    }
    
    return { added: true, taskId: context.taskId, labelId };
  }
  
  private async actionRemoveLabel(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId) throw new Error("taskId required for remove_label");
    
    let labelId = action.labelId;
    
    if (!labelId && action.labelName) {
      const label = await prisma.label.findFirst({
        where: { boardId: this.boardId, name: action.labelName },
      });
      labelId = label?.id;
    }
    
    if (labelId) {
      await prisma.taskLabel.deleteMany({
        where: { taskId: context.taskId, labelId },
      });
    }
    
    return { removed: true, taskId: context.taskId, labelId };
  }
  
  private async actionAddComment(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId || !action.commentContent) {
      throw new Error("taskId and commentContent required for add_comment");
    }
    
    // Process variables in comment content
    const content = this.processTemplate(action.commentContent, context);
    
    const comment = await prisma.comment.create({
      data: {
        id: `cmt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        content,
        taskId: context.taskId,
        userId: context.userId || "system",
      },
    });
    
    return { added: true, commentId: comment.id };
  }
  
  private async actionSendNotification(action: ActionConfig, context: TriggerContext) {
    const userIds: string[] = [];
    
    switch (action.notifyType) {
      case "user":
      case "specific":
        if (action.notifyUserIds) userIds.push(...action.notifyUserIds);
        break;
      case "assignee":
        if (context.task?.assigneeId) userIds.push(context.task.assigneeId);
        break;
      case "creator":
        if (context.userId) userIds.push(context.userId);
        break;
      case "board_members":
        const members = await prisma.boardMember.findMany({
          where: { boardId: this.boardId },
          select: { userId: true },
        });
        userIds.push(...members.map(m => m.userId));
        break;
    }
    
    const title = this.processTemplate(action.notificationTitle || "Automation Alert", context);
    const message = this.processTemplate(action.notificationMessage || "", context);
    
    for (const userId of userIds) {
      await prisma.notification.create({
        data: {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId,
          type: "automation",
          title,
          message,
          data: JSON.stringify({ taskId: context.taskId, boardId: this.boardId }),
        },
      });
    }
    
    return { sent: true, userCount: userIds.length };
  }
  
  private async actionSendWebhook(action: ActionConfig, context: TriggerContext) {
    if (!action.webhookUrl) throw new Error("webhookUrl required for send_webhook");
    
    const payload = action.webhookPayload 
      ? JSON.parse(this.processTemplate(action.webhookPayload, context))
      : {
          event: "automation_triggered",
          boardId: this.boardId,
          taskId: context.taskId,
          timestamp: new Date().toISOString(),
          context,
        };
    
    const response = await fetch(action.webhookUrl, {
      method: action.webhookMethod || "POST",
      headers: {
        "Content-Type": "application/json",
        ...action.webhookHeaders,
      },
      body: JSON.stringify(payload),
    });
    
    return {
      sent: true,
      statusCode: response.status,
      ok: response.ok,
    };
  }
  
  private async actionSetDueDate(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId) throw new Error("taskId required for set_due_date");
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (action.dueDateOffset || 0));
    if (action.dueDateHour !== undefined) {
      dueDate.setHours(action.dueDateHour, 0, 0, 0);
    }
    
    const task = await prisma.task.update({
      where: { id: context.taskId },
      data: { dueDate },
    });
    
    return { set: true, taskId: task.id, dueDate };
  }
  
  private async actionArchiveCard(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId) throw new Error("taskId required for archive_card");
    
    const task = await prisma.task.update({
      where: { id: context.taskId },
      data: { archived: true },
    });
    
    return { archived: true, taskId: task.id };
  }
  
  private async actionCopyCard(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId) throw new Error("taskId required for copy_card");
    
    const original = await prisma.task.findUnique({
      where: { id: context.taskId },
      include: { taskLabels: true, checklists: { include: { items: true } } },
    });
    
    if (!original) throw new Error("Task not found");
    
    const targetListId = action.copyToListId || original.listId;
    
    // Get max position
    const maxPosition = await prisma.task.aggregate({
      where: { listId: targetListId },
      _max: { position: true },
    });
    
    const newTask = await prisma.task.create({
      data: {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: action.copyTitle || `${original.title} (Copy)`,
        description: original.description,
        listId: targetListId,
        position: (maxPosition._max.position ?? 0) + 1,
        assigneeId: original.assigneeId,
        dueDate: original.dueDate,
        coverColor: original.coverColor,
        emoji: original.emoji,
      },
    });
    
    // Copy labels
    for (const tl of original.taskLabels) {
      await prisma.taskLabel.create({
        data: {
          id: `tl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          taskId: newTask.id,
          labelId: tl.labelId,
        },
      });
    }
    
    return { copied: true, originalId: original.id, newId: newTask.id };
  }
  
  private async actionCreateChecklist(action: ActionConfig, context: TriggerContext) {
    if (!context.taskId || !action.checklistName) {
      throw new Error("taskId and checklistName required for create_checklist");
    }
    
    const checklist = await prisma.checklist.create({
      data: {
        id: `cl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        taskId: context.taskId,
        name: action.checklistName,
      },
    });
    
    if (action.checklistItems && action.checklistItems.length > 0) {
      for (let i = 0; i < action.checklistItems.length; i++) {
        await prisma.checklistItem.create({
          data: {
            id: `cli_${Date.now()}_${Math.random().toString(36).substring(7)}_${i}`,
            checklistId: checklist.id,
            content: action.checklistItems[i],
            position: i,
          },
        });
      }
    }
    
    return { created: true, checklistId: checklist.id };
  }
  
  /**
   * Process template variables like {{task.title}}, {{user.name}}
   */
  private processTemplate(template: string, context: TriggerContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getFieldValue(path.trim(), context);
      return value !== undefined ? String(value) : match;
    });
  }
}

// ==========================================
// TRIGGER HELPERS
// ==========================================

/**
 * Trigger automation rules for a board event
 */
export async function triggerAutomation(
  boardId: string,
  triggerType: TriggerType,
  context: Omit<TriggerContext, "boardId">
): Promise<{ rulesExecuted: number; results: any[] }> {
  const engine = new AutomationEngine(boardId);
  return engine.processTrigger(triggerType, { ...context, boardId });
}

/**
 * Check and trigger due date automations (run via cron)
 */
export async function checkDueDateAutomations(): Promise<void> {
  const now = new Date();
  
  // Find tasks with approaching due dates
  const upcomingTasks = await prisma.task.findMany({
    where: {
      archived: false,
      dueDate: {
        gte: now,
        lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
      },
    },
    include: {
      list: {
        include: { board: true },
      },
    },
  });
  
  for (const task of upcomingTasks) {
    const boardId = task.list.boardId;
    const hoursUntilDue = Math.floor((task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    await triggerAutomation(boardId, "due_date_approaching", {
      taskId: task.id,
      task,
      listId: task.listId,
      metadata: { hoursUntilDue, daysUntilDue: Math.floor(hoursUntilDue / 24) },
    });
  }
  
  // Find overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      archived: false,
      dueDate: { lt: now },
    },
    include: {
      list: {
        include: { board: true },
      },
    },
  });
  
  for (const task of overdueTasks) {
    const boardId = task.list.boardId;
    
    await triggerAutomation(boardId, "due_date_passed", {
      taskId: task.id,
      task,
      listId: task.listId,
    });
  }
}

/**
 * Check if all checklist items are completed
 */
export async function checkChecklistCompletion(
  checklistId: string
): Promise<boolean> {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: {
      items: true,
      task: {
        include: {
          list: { include: { board: true } },
        },
      },
    },
  });
  
  if (!checklist) return false;
  
  const allChecked = checklist.items.length > 0 && 
    checklist.items.every(item => item.checked);
  
  if (allChecked) {
    await triggerAutomation(checklist.task.list.boardId, "checklist_completed", {
      taskId: checklist.taskId,
      task: checklist.task,
      listId: checklist.task.listId,
      checklistId: checklist.id,
    });
  }
  
  return allChecked;
}
