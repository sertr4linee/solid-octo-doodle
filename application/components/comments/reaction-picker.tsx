"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Popular emoji reactions
const POPULAR_EMOJIS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "👎", label: "Thumbs down" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🎉", label: "Party" },
  { emoji: "😄", label: "Smile" },
  { emoji: "😕", label: "Confused" },
  { emoji: "👀", label: "Eyes" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "💯", label: "100" },
  { emoji: "✅", label: "Check" },
  { emoji: "❌", label: "Cross" },
];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionPicker({ onSelect, disabled }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title="Add reaction"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" x2="9.01" y1="9" y2="9" />
          <line x1="15" x2="15.01" y1="9" y2="9" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Picker */}
          <div className="absolute bottom-full right-0 mb-1 z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[200px]">
            <div className="grid grid-cols-6 gap-1">
              {POPULAR_EMOJIS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    setIsOpen(false);
                  }}
                  className="p-1.5 text-lg hover:bg-muted rounded transition-colors"
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: { id: string; name: string; image?: string }[];
  hasReacted: boolean;
}

interface ReactionDisplayProps {
  reactions: ReactionGroup[];
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionDisplay({ reactions, onToggle, disabled }: ReactionDisplayProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
            reaction.hasReacted
              ? "bg-primary/20 border border-primary text-primary"
              : "bg-muted hover:bg-muted/80 text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title={reaction.users.map((u) => u.name).join(", ")}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
