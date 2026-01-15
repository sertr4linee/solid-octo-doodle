"use client";

import { LayoutGrid, Calendar, Table2, GanttChart, Images } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewType = "kanban" | "calendar" | "table" | "timeline" | "gallery";

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views = [
  { type: "kanban" as ViewType, label: "Board", icon: LayoutGrid, shortcut: "B" },
  { type: "calendar" as ViewType, label: "Calendar", icon: Calendar, shortcut: "C" },
  { type: "table" as ViewType, label: "Table", icon: Table2, shortcut: "T" },
  { type: "timeline" as ViewType, label: "Timeline", icon: GanttChart, shortcut: "L" },
  { type: "gallery" as ViewType, label: "Gallery", icon: Images, shortcut: "G" },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex items-center p-1 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
      {views.map((view, index) => {
        const Icon = view.icon;
        const isActive = currentView === view.type;

        return (
          <button
            key={view.type}
            onClick={() => onViewChange(view.type)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isActive
                ? "bg-white dark:bg-gray-800 text-primary shadow-md"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isActive && "scale-110"
              )}
            />
            <span className="hidden sm:inline">{view.label}</span>

            {/* Active indicator */}
            {isActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
