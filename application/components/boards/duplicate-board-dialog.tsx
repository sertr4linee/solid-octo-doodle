"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Loader2,
  LayoutList,
  CheckSquare,
  Users,
  Tag,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DuplicateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  boardName: string;
  onSuccess?: (newBoard: any) => void;
}

interface DuplicateOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultChecked: boolean;
  dependsOn?: string;
}

const duplicateOptions: DuplicateOption[] = [
  {
    id: "includeLists",
    label: "Lists",
    description: "Copy all list columns structure",
    icon: <LayoutList className="h-4 w-4" />,
    defaultChecked: true,
  },
  {
    id: "includeTasks",
    label: "Tasks",
    description: "Copy all cards with their content",
    icon: <CheckSquare className="h-4 w-4" />,
    defaultChecked: false,
    dependsOn: "includeLists",
  },
  {
    id: "includeLabels",
    label: "Labels",
    description: "Copy all labels and their assignments",
    icon: <Tag className="h-4 w-4" />,
    defaultChecked: true,
  },
  {
    id: "includeMembers",
    label: "Members",
    description: "Add same team members to new board",
    icon: <Users className="h-4 w-4" />,
    defaultChecked: false,
  },
  {
    id: "includeAutomations",
    label: "Automations",
    description: "Copy automation rules (disabled by default)",
    icon: <Zap className="h-4 w-4" />,
    defaultChecked: false,
  },
];

export function DuplicateBoardDialog({
  open,
  onOpenChange,
  boardId,
  boardName,
  onSuccess,
}: DuplicateBoardDialogProps) {
  const [newName, setNewName] = useState(`Copy of ${boardName}`);
  const [options, setOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(duplicateOptions.map((opt) => [opt.id, opt.defaultChecked]))
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleOptionChange = (optionId: string, checked: boolean) => {
    const newOptions = { ...options, [optionId]: checked };

    // If unchecking a dependency, uncheck dependent options
    if (!checked) {
      duplicateOptions.forEach((opt) => {
        if (opt.dependsOn === optionId) {
          newOptions[opt.id] = false;
        }
      });
    }

    // If checking an option with a dependency, ensure dependency is checked
    if (checked) {
      const option = duplicateOptions.find((opt) => opt.id === optionId);
      if (option?.dependsOn) {
        newOptions[option.dependsOn] = true;
      }
    }

    setOptions(newOptions);
  };

  const handleDuplicate = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a name for the new board");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...options,
          newName: newName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to duplicate board");
      }

      const data = await response.json();
      toast.success(
        `Board duplicated! Created ${data.stats.listsCreated} lists and ${data.stats.tasksCreated} tasks.`
      );
      onSuccess?.(data.board);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate board");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = Object.values(options).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b border-gray-100 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-xl bg-primary/10">
                <Copy className="h-5 w-5 text-primary" />
              </div>
              Duplicate Board
            </DialogTitle>
            <DialogDescription className="mt-2">
              Create a copy of <span className="font-medium text-foreground">{boardName}</span> with
              selected options.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* New Name Input */}
          <div className="space-y-2">
            <Label htmlFor="board-name" className="text-sm font-medium">
              New Board Name
            </Label>
            <Input
              id="board-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter board name..."
              className="h-11 rounded-xl"
              disabled={isLoading}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">What to include</Label>
              <Badge variant="secondary" className="text-xs">
                {selectedCount} selected
              </Badge>
            </div>

            <div className="space-y-2">
              {duplicateOptions.map((option) => {
                const isDisabled =
                  option.dependsOn && !options[option.dependsOn];
                const isChecked = options[option.id];

                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer",
                      isChecked
                        ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleOptionChange(option.id, checked as boolean)
                      }
                      disabled={isDisabled || isLoading}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        isChecked
                          ? "bg-primary/10 text-primary"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      )}
                    >
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                    {option.dependsOn && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Requires {duplicateOptions.find((o) => o.id === option.dependsOn)?.label}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Sparkles className="h-4 w-4" />
              Preview
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate">{boardName}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-primary truncate">{newName || "New Board"}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={isLoading || !newName.trim()}
            className="rounded-xl gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Duplicate Board
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
