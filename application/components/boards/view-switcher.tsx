"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, Calendar, Table2, GanttChart, Images } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewType = "kanban" | "calendar" | "table" | "timeline" | "gallery";

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views = [
  { type: "kanban" as ViewType, label: "Board", icon: LayoutGrid },
  { type: "calendar" as ViewType, label: "Calendar", icon: Calendar },
  { type: "table" as ViewType, label: "Table", icon: Table2 },
  { type: "timeline" as ViewType, label: "Timeline", icon: GanttChart },
  { type: "gallery" as ViewType, label: "Gallery", icon: Images },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.type;
        
        return (
          <Button
            key={view.type}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange(view.type)}
            className={cn(
              "gap-2",
              !isActive && "hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
