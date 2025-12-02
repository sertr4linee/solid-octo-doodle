"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { THEME_PRESETS, type ThemePreset } from "@/lib/types/customization";

interface ThemePickerProps {
  currentTheme?: string;
  onSelect: (theme: ThemePreset) => void;
}

export function ThemePicker({ currentTheme, onSelect }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {THEME_PRESETS.map((theme) => (
        <Card
          key={theme.id}
          className={`cursor-pointer transition-all hover:scale-105 ${
            currentTheme === theme.id
              ? "ring-2 ring-blue-500"
              : "hover:shadow-lg"
          }`}
          onClick={() => onSelect(theme)}
        >
          <CardContent className="p-0">
            {/* Theme preview */}
            <div
              className="h-32 rounded-t-lg relative overflow-hidden"
              style={
                theme.background.type === "gradient"
                  ? { background: theme.background.value }
                  : { backgroundColor: theme.background.value }
              }
            >
              {theme.background.blur && (
                <div className="absolute inset-0 backdrop-blur-sm" />
              )}
              
              {currentTheme === theme.id && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}

              {/* Mini list preview */}
              <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                <div className="flex-1 bg-white/90 backdrop-blur-sm rounded p-2 shadow-sm">
                  <div className="h-2 bg-gray-300 rounded mb-1" />
                  <div className="h-2 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="flex-1 bg-white/90 backdrop-blur-sm rounded p-2 shadow-sm">
                  <div className="h-2 bg-gray-300 rounded mb-1" />
                  <div className="h-2 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            </div>

            {/* Theme info */}
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{theme.name}</h3>
                {theme.darkMode && (
                  <Badge variant="secondary" className="text-xs">
                    Dark
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600">{theme.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
