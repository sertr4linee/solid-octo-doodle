"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, X } from "lucide-react";
import { EmojiPicker } from "@/components/customization/emoji-picker";
import { cn } from "@/lib/utils";

interface TaskTitleWithEmojiProps {
  value: string;
  emoji?: string;
  onChange: (value: string) => void;
  onEmojiChange?: (emoji: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TaskTitleWithEmoji({
  value,
  emoji,
  onChange,
  onEmojiChange,
  placeholder = "Enter task title...",
  className,
  disabled,
}: TaskTitleWithEmojiProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Emoji Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 w-9 p-0 shrink-0",
              emoji && "text-xl"
            )}
            disabled={disabled}
          >
            {emoji || <Smile className="h-4 w-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <EmojiPicker
            onSelect={(selectedEmoji) => {
              onEmojiChange?.(selectedEmoji);
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Clear Emoji Button */}
      {emoji && onEmojiChange && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          onClick={() => onEmojiChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Title Input */}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
        disabled={disabled}
      />
    </div>
  );
}
