"use client";

import { useState } from "react";
import { LABEL_COLORS } from "@/lib/types/labels";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-sm font-medium mb-2 block">Preset Colors</Label>
        <div className="grid grid-cols-10 gap-2">
          {LABEL_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={cn(
                "w-8 h-8 rounded-md border-2 transition-all hover:scale-110",
                value === color.value
                  ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                  : "border-transparent"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {value === color.value && (
                <Check className="h-4 w-4 text-white mx-auto drop-shadow-md" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="custom-color" className="text-sm font-medium mb-2 block">
          Custom Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="custom-color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="h-10 w-16 rounded border cursor-pointer"
          />
          <Input
            type="text"
            value={customColor}
            onChange={handleCustomColorChange}
            placeholder="#000000"
            pattern="^#[0-9A-Fa-f]{6}$"
            className="font-mono"
          />
        </div>
      </div>
    </div>
  );
}
