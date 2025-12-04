"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

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
  const getStatusColor = (listName: string) => {
    const lower = listName.toLowerCase();
    if (lower.includes('done') || lower.includes('completed') || lower.includes('delivered')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (lower.includes('progress') || lower.includes('doing')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (lower.includes('review') || lower.includes('testing')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
    if (lower.includes('todo') || lower.includes('backlog') || lower.includes('ideas')) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  const getPriorityFromDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { label: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    if (days === 0) return { label: 'Today', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
    if (days <= 3) return { label: 'Urgent', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    return null;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="w-[400px]">Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const priority = getPriorityFromDueDate(task.dueDate);
            
            return (
              <TableRow
                key={task.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onTaskClick?.(task.id)}
              >
                <TableCell>
                  {task.emoji && (
                    <span className="text-2xl">{task.emoji}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(task.list.name)}>
                    {task.list.emoji && <span className="mr-1">{task.list.emoji}</span>}
                    {task.list.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <span className="text-sm">
                      {format(task.dueDate, 'MMM dd, yyyy')}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No due date</span>
                  )}
                </TableCell>
                <TableCell>
                  {priority && (
                    <Badge className={priority.color}>
                      {priority.label}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No tasks found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
