"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

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
};

interface GalleryViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function GalleryView({ tasks, onTaskClick }: GalleryViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className="cursor-pointer hover:shadow-lg transition-all overflow-hidden group"
          onClick={() => onTaskClick?.(task.id)}
        >
          {/* Cover Image/Color */}
          <div
            className="h-32 relative"
            style={{
              background: task.coverImage
                ? `url(${task.coverImage}) center/cover`
                : task.coverColor || task.list.color || '#e5e7eb',
            }}
          >
            {task.emoji && !task.coverImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl opacity-20">{task.emoji}</span>
              </div>
            )}
            {task.emoji && task.coverImage && (
              <div className="absolute top-2 left-2 bg-white/90 dark:bg-black/90 p-1 rounded">
                <span className="text-2xl">{task.emoji}</span>
              </div>
            )}
          </div>
          
          <CardHeader className="pb-3">
            <div className="space-y-2">
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Status Badge */}
              <Badge variant="secondary" className="text-xs">
                {task.list.emoji && <span className="mr-1">{task.list.emoji}</span>}
                {task.list.name}
              </Badge>
              
              {/* Footer Info */}
              <div className="flex items-center justify-between text-sm">
                {/* Assignee */}
                <div className="flex items-center gap-1">
                  {task.assignee ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={task.assignee.image || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate max-w-20">
                        {task.assignee.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </div>
                
                {/* Due Date */}
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(task.dueDate, 'MMM dd')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {tasks.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          No tasks to display
        </div>
      )}
    </div>
  );
}
