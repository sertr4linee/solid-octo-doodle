"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListColorPickerProps {
  currentColor?: string | null;
  onColorChange: (color: string | null) => void;
  children?: React.ReactNode;
}

const colorPresets = {
  trafficLight: {
    label: "Traffic Light",
    colors: [
      { value: "#ef4444", label: "Red - Urgent/Blocked" },
      { value: "#f97316", label: "Orange - In Progress" },
      { value: "#22c55e", label: "Green - Completed" },
    ],
  },
  rainbow: {
    label: "Rainbow",
    colors: [
      { value: "#ef4444", label: "Red" },
      { value: "#f97316", label: "Orange" },
      { value: "#eab308", label: "Yellow" },
      { value: "#22c55e", label: "Green" },
      { value: "#3b82f6", label: "Blue" },
      { value: "#8b5cf6", label: "Purple" },
      { value: "#ec4899", label: "Pink" },
    ],
  },
  monochrome: {
    label: "Monochrome",
    colors: [
      { value: "#1f2937", label: "Dark Grey" },
      { value: "#4b5563", label: "Grey" },
      { value: "#6b7280", label: "Medium Grey" },
      { value: "#9ca3af", label: "Light Grey" },
    ],
  },
  extended: {
    label: "Extended",
    colors: [
      { value: "#0ea5e9", label: "Sky Blue" },
      { value: "#06b6d4", label: "Cyan" },
      { value: "#14b8a6", label: "Teal" },
      { value: "#84cc16", label: "Lime" },
      { value: "#a855f7", label: "Violet" },
      { value: "#d946ef", label: "Fuchsia" },
      { value: "#f43f5e", label: "Rose" },
      { value: "#64748b", label: "Slate" },
    ],
  },
};

export function ListColorPicker({
  currentColor,
  onColorChange,
  children,
}: ListColorPickerProps) {
  const [open, setOpen] = useState(false);

  const handleColorSelect = (color: string | null) => {
    onColorChange(color);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger
        asChild
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Palette className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 z-[100]"
        align="start"
        side="right"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-4" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">List Color</Label>
            {currentColor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorSelect(null);
                }}
                className="h-auto py-1 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Traffic Light Palette */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {colorPresets.trafficLight.label}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {colorPresets.trafficLight.colors.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color.value);
                  }}
                  className={cn(
                    "relative h-10 rounded-lg border-2 transition-all hover:scale-105",
                    currentColor === color.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {currentColor === color.value && (
                    <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Rainbow Palette */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {colorPresets.rainbow.label}
            </Label>
            <div className="grid grid-cols-7 gap-1.5">
              {colorPresets.rainbow.colors.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color.value);
                  }}
                  className={cn(
                    "relative h-8 rounded-md border-2 transition-all hover:scale-110",
                    currentColor === color.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {currentColor === color.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Monochrome Palette */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {colorPresets.monochrome.label}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {colorPresets.monochrome.colors.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color.value);
                  }}
                  className={cn(
                    "relative h-8 rounded-md border-2 transition-all hover:scale-105",
                    currentColor === color.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {currentColor === color.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Extended Palette */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {colorPresets.extended.label}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {colorPresets.extended.colors.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorSelect(color.value);
                  }}
                  className={cn(
                    "relative h-8 rounded-md border-2 transition-all hover:scale-105",
                    currentColor === color.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                >
                  {currentColor === color.value && (
                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-lg" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Input */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Custom Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentColor || "#0079bf"}
                onChange={(e) => {
                  e.stopPropagation();
                  handleColorSelect(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-10 w-full rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
