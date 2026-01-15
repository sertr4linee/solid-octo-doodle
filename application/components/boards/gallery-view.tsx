"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Paperclip, CheckSquare, Inbox } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | null;
  emoji?: string;
  coverColor?: string;
  coverImage?: string | null;
  list: { name: string; color?: string; emoji?: string };
  assignee?: { name: string; image?: string | null } | null;
  _count?: { comments?: number; attachments?: number; checklists?: number };
};

interface GalleryViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function GalleryView({ tasks, onTaskClick }: GalleryViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className={cn(
            "group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden cursor-pointer",
            "border border-gray-200/50 dark:border-gray-800/50",
            "shadow-sm hover:shadow-xl transition-all duration-300",
            "hover:-translate-y-1 hover:border-primary/30"
          )}
          onClick={() => onTaskClick?.(task.id)}
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          {/* Cover Image/Color */}
          <div
            className="h-40 relative overflow-hidden"
            style={{
              background: task.coverImage
                ? `url(${task.coverImage}) center/cover`
                : task.coverColor ||
                  task.list.color ||
                  "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.5) 100%)",
            }}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Emoji display */}
            {task.emoji && !task.coverImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-7xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-300">
                  {task.emoji}
                </span>
              </div>
            )}

            {/* Top badges */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              {task.emoji && task.coverImage && (
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                  <span className="text-xl">{task.emoji}</span>
                </div>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  "ml-auto text-[10px] font-semibold uppercase tracking-wide",
                  "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg",
                  "border-0"
                )}
                style={{
                  color: task.list.color || "inherit",
                }}
              >
                {task.list.emoji && <span className="mr-1">{task.list.emoji}</span>}
                {task.list.name}
              </Badge>
            </div>

            {/* Assignee avatar (bottom right of cover) */}
            {task.assignee && (
              <div className="absolute bottom-3 right-3">
                <Avatar className="h-10 w-10 border-3 border-white dark:border-gray-900 shadow-lg ring-2 ring-white/50">
                  <AvatarImage src={task.assignee.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold">
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {task.title}
            </h3>

            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                {task.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              {/* Stats */}
              <div className="flex items-center gap-3 text-muted-foreground">
                {task._count?.comments && task._count.comments > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{task._count.comments}</span>
                  </div>
                )}
                {task._count?.attachments && task._count.attachments > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{task._count.attachments}</span>
                  </div>
                )}
                {task._count?.checklists && task._count.checklists > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>{task._count.checklists}</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span
                    className={cn(
                      "font-medium",
                      new Date(task.dueDate) < new Date()
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {format(task.dueDate, "MMM dd")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hover accent line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
            style={{
              backgroundColor: task.coverColor || task.list.color || "hsl(var(--primary))",
            }}
          />
        </div>
      ))}

      {tasks.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="p-5 rounded-full bg-muted/30 mb-4">
            <Inbox className="h-10 w-10" />
          </div>
          <p className="text-xl font-medium">No tasks to display</p>
          <p className="text-sm mt-1">Create your first task to see it here</p>
        </div>
      )}
    </div>
  );
}
