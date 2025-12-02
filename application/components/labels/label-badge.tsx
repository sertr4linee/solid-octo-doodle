"use client";

import { Label } from "@/lib/types/labels";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabelBadgeProps {
  label: Label;
  variant?: "default" | "compact" | "pill";
  showRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function LabelBadge({
  label,
  variant = "default",
  showRemove = false,
  onRemove,
  className,
}: LabelBadgeProps) {
  // Calculate text color based on background brightness
  const getTextColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? "#000000" : "#ffffff";
  };

  const textColor = getTextColor(label.color);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium transition-all",
        variant === "compact" && "px-1.5 py-0.5 text-xs",
        variant === "default" && "px-2 py-1 text-sm",
        variant === "pill" && "px-3 py-1.5 text-sm rounded-full",
        showRemove && "pr-1",
        className
      )}
      style={{
        backgroundColor: label.color,
        color: textColor,
      }}
      title={label.description || label.name}
    >
      <span className="truncate max-w-[120px]">{label.name}</span>
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70 transition-opacity"
          aria-label="Remove label"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
