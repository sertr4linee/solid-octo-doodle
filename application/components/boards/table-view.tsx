"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User, AlertCircle, Clock, CheckCircle2, Circle, Inbox } from "lucide-react";
import { format, isToday, isPast, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | null;
  emoji?: string;
  coverColor?: string;
  list: { name: string; color?: string; emoji?: string };
  assignee?: { name: string; image?: string | null } | null;
};

interface TableViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function TableView({ tasks, onTaskClick }: TableViewProps) {
  const getStatusConfig = (listName: string) => {
    const lower = listName.toLowerCase();
    if (lower.includes("done") || lower.includes("completed") || lower.includes("delivered")) {
      return {
        icon: CheckCircle2,
        bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
        textClass: "text-emerald-700 dark:text-emerald-400",
        borderClass: "border-emerald-200 dark:border-emerald-800",
      };
    }
    if (lower.includes("progress") || lower.includes("doing")) {
      return {
        icon: Clock,
        bgClass: "bg-blue-50 dark:bg-blue-950/30",
        textClass: "text-blue-700 dark:text-blue-400",
        borderClass: "border-blue-200 dark:border-blue-800",
      };
    }
    if (lower.includes("review") || lower.includes("testing")) {
      return {
        icon: AlertCircle,
        bgClass: "bg-violet-50 dark:bg-violet-950/30",
        textClass: "text-violet-700 dark:text-violet-400",
        borderClass: "border-violet-200 dark:border-violet-800",
      };
    }
    return {
      icon: Circle,
      bgClass: "bg-gray-50 dark:bg-gray-900/30",
      textClass: "text-gray-700 dark:text-gray-400",
      borderClass: "border-gray-200 dark:border-gray-700",
    };
  };

  const getPriorityConfig = (dueDate: Date | null) => {
    if (!dueDate) return null;

    if (isPast(dueDate) && !isToday(dueDate)) {
      return {
        label: "Overdue",
        bgClass: "bg-red-100 dark:bg-red-950/50",
        textClass: "text-red-700 dark:text-red-400",
        icon: AlertCircle,
      };
    }
    if (isToday(dueDate)) {
      return {
        label: "Today",
        bgClass: "bg-amber-100 dark:bg-amber-950/50",
        textClass: "text-amber-700 dark:text-amber-400",
        icon: Clock,
      };
    }
    const days = differenceInDays(dueDate, new Date());
    if (days <= 3) {
      return {
        label: `${days}d left`,
        bgClass: "bg-orange-100 dark:bg-orange-950/50",
        textClass: "text-orange-700 dark:text-orange-400",
        icon: Clock,
      };
    }
    return null;
  };

  return (
    <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="col-span-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Task
        </div>
        <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </div>
        <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Assignee
        </div>
        <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Due Date
        </div>
        <div className="col-span-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Priority
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
        {tasks.map((task, index) => {
          const statusConfig = getStatusConfig(task.list.name);
          const priorityConfig = getPriorityConfig(task.dueDate);
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={task.id}
              className={cn(
                "grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer transition-all duration-200",
                "hover:bg-gray-50/80 dark:hover:bg-gray-800/50",
                "group"
              )}
              onClick={() => onTaskClick?.(task.id)}
              style={{
                animationDelay: `${index * 30}ms`,
              }}
            >
              {/* Task */}
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                {task.emoji ? (
                  <span className="text-2xl flex-shrink-0">{task.emoji}</span>
                ) : (
                  <div
                    className="h-10 w-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: task.coverColor || task.list.color || "hsl(var(--muted))",
                    }}
                  >
                    <span className="text-white text-sm font-bold">
                      {task.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {task.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2 flex items-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 font-medium",
                    statusConfig.bgClass,
                    statusConfig.textClass,
                    statusConfig.borderClass
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {task.list.emoji && <span>{task.list.emoji}</span>}
                  <span className="truncate max-w-[80px]">{task.list.name}</span>
                </Badge>
              </div>

              {/* Assignee */}
              <div className="col-span-2 flex items-center">
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-800 shadow-sm">
                      <AvatarImage src={task.assignee.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-medium">
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate max-w-[100px]">
                      {task.assignee.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-sm">Unassigned</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="col-span-2 flex items-center">
                {task.dueDate ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={cn(
                      priorityConfig?.label === "Overdue" && "text-red-600 dark:text-red-400 font-medium"
                    )}>
                      {format(task.dueDate, "MMM dd, yyyy")}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No date</span>
                )}
              </div>

              {/* Priority */}
              <div className="col-span-1 flex items-center">
                {priorityConfig && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-1 text-xs font-medium",
                      priorityConfig.bgClass,
                      priorityConfig.textClass
                    )}
                  >
                    <priorityConfig.icon className="h-3 w-3" />
                    {priorityConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Inbox className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm">Create a task to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
