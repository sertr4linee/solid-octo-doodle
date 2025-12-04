"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.dueDate) {
      const dateKey = task.dueDate.toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);
  
  // Generate calendar days
  const calendarDays = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {dayNames.map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="min-h-[120px]" />;
          }
          
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate[dateKey] || [];
          
          return (
            <Card
              key={day}
              className={`min-h-[120px] p-2 ${
                isToday(day) ? "border-2 border-primary" : ""
              }`}
            >
              <div className={`text-sm font-semibold mb-2 ${
                isToday(day) ? "text-primary" : ""
              }`}>
                {day}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: task.coverColor || task.list.color || '#e5e7eb',
                      color: task.coverColor || task.list.color ? '#fff' : '#000',
                    }}
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <div className="flex items-center gap-1 truncate">
                      {task.emoji && <span>{task.emoji}</span>}
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Tasks without due date */}
      {tasks.filter(t => !t.dueDate).length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>📌</span>
            No Due Date ({tasks.filter(t => !t.dueDate).length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {tasks.filter(t => !t.dueDate).map((task) => (
              <Card
                key={task.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onTaskClick?.(task.id)}
              >
                <div className="flex items-start gap-2">
                  {task.emoji && <span className="text-lg">{task.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.title}</div>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {task.list.name}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
