"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search, Smile } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
}

// Popular emojis by category
const EMOJI_CATEGORIES = {
  Smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😗", "😙", "😚"],
  Gestures: ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤝", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪"],
  Hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘"],
  Activities: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "🎯", "⛳", "🏹", "🎣"],
  Objects: ["💼", "📁", "📂", "📅", "📆", "📋", "📌", "📍", "📎", "🔗", "📝", "✏️", "📏", "📐", "📕", "📗", "📘"],
  Symbols: ["✅", "❌", "⭐", "🌟", "💫", "✨", "🔥", "💥", "💯", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉"],
  Flags: ["🚩", "🏁", "🏴", "🏳️", "🏴‍☠️", "🚩"],
};

export function EmojiPicker({ onSelect, trigger }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  const filteredCategories = searchQuery
    ? Object.entries(EMOJI_CATEGORIES).reduce((acc, [category, emojis]) => {
        const filtered = emojis.filter((emoji) =>
          emoji.includes(searchQuery)
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {} as Record<string, string[]>)
    : EMOJI_CATEGORIES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Smile className="h-4 w-4 mr-2" />
            Add emoji
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3">
            {Object.entries(filteredCategories).map(([category, emojis]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">
                  {category}
                </h4>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      className="h-8 w-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded transition-colors"
                      onClick={() => handleSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {Object.keys(filteredCategories).length === 0 && (
            <p className="text-center text-gray-500 py-4 text-sm">
              No emojis found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
