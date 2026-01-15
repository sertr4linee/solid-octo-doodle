"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  dueDate: Date | null;
  emoji?: string;
  coverColor?: string;
  list: { name: string; color?: string };
};

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.dueDate) {
      const dateKey = task.dueDate.toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isWeekend = (index: number) => index % 7 === 0 || index % 7 === 6;

  const tasksWithoutDate = tasks.filter((t) => !t.dueDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            {monthNames[month]}
          </h2>
          <span className="text-2xl font-light text-muted-foreground">{year}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="rounded-full px-4 font-medium hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <div className="flex items-center bg-muted/50 rounded-full p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              className="rounded-full h-8 w-8 hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="rounded-full h-8 w-8 hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200/50 dark:border-gray-800/50">
          {dayNames.map((day, i) => (
            <div
              key={day}
              className={cn(
                "py-3 text-center text-xs font-semibold uppercase tracking-wider",
                i === 0 || i === 6
                  ? "text-rose-500/70 dark:text-rose-400/70"
                  : "text-muted-foreground"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[140px] bg-gray-50/50 dark:bg-gray-900/30"
                />
              );
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTasks = tasksByDate[dateKey] || [];
            const today = isToday(day);
            const weekend = isWeekend(index);

            return (
              <div
                key={day}
                className={cn(
                  "min-h-[140px] p-2 border-b border-r border-gray-100 dark:border-gray-800/50 transition-colors relative group",
                  weekend && "bg-gray-50/50 dark:bg-gray-900/30",
                  today && "bg-primary/5 dark:bg-primary/10"
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-sm font-medium transition-all",
                      today
                        ? "h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : weekend
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {day}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      className={cn(
                        "w-full text-left text-xs px-2 py-1.5 rounded-lg cursor-pointer",
                        "transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
                        "flex items-center gap-1.5 truncate"
                      )}
                      style={{
                        backgroundColor: task.coverColor || task.list.color || "hsl(var(--muted))",
                        color: task.coverColor || task.list.color ? "#fff" : "inherit",
                      }}
                      onClick={() => onTaskClick?.(task.id)}
                    >
                      {task.emoji && <span className="flex-shrink-0">{task.emoji}</span>}
                      <span className="truncate font-medium">{task.title}</span>
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] font-medium text-muted-foreground px-2 py-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks without due date */}
      {tasksWithoutDate.length > 0 && (
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Unscheduled</h3>
              <p className="text-sm text-muted-foreground">
                {tasksWithoutDate.length} task{tasksWithoutDate.length !== 1 && "s"} without due date
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tasksWithoutDate.map((task) => (
              <button
                key={task.id}
                className={cn(
                  "text-left p-4 rounded-xl border border-gray-200/50 dark:border-gray-800/50",
                  "bg-white dark:bg-gray-900 hover:shadow-lg hover:scale-[1.02]",
                  "transition-all duration-200 cursor-pointer"
                )}
                onClick={() => onTaskClick?.(task.id)}
              >
                <div className="flex items-start gap-3">
                  {task.emoji && <span className="text-2xl">{task.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.title}</div>
                    <Badge
                      variant="secondary"
                      className="mt-2 text-xs"
                      style={{
                        backgroundColor: task.list.color ? `${task.list.color}20` : undefined,
                        color: task.list.color,
                        borderColor: task.list.color,
                      }}
                    >
                      {task.list.name}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
