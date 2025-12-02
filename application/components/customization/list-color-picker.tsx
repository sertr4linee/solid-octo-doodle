"use client";

import { Check } from "lucide-react";
import { LIST_COLORS } from "@/lib/types/customization";

interface ListColorPickerProps {
  currentColor?: string | null;
  onSelect: (color: string | null) => void;
}

export function ListColorPicker({ currentColor, onSelect }: ListColorPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LIST_COLORS.map((colorOption) => (
        <button
          key={colorOption.name}
          className={`h-12 rounded-lg border-2 hover:scale-105 transition-transform relative flex items-center justify-center ${
            currentColor === colorOption.value
              ? "ring-2 ring-blue-500 ring-offset-2"
              : ""
          }`}
          style={{
            backgroundColor: colorOption.value || "#ffffff",
            borderColor: colorOption.value ? "transparent" : "#e5e7eb",
          }}
          onClick={() => onSelect(colorOption.value)}
          title={colorOption.name}
        >
          {currentColor === colorOption.value && (
            <Check className="h-5 w-5 text-gray-700" />
          )}
          {!colorOption.value && (
            <span className="text-xs text-gray-600">Default</span>
          )}
        </button>
      ))}
    </div>
  );
}
