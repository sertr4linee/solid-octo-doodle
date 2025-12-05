"use client";

import { useState, useEffect } from "react";
import { Label, TaskLabel } from "@/lib/types/labels";
import { LabelBadge } from "./label-badge";
import { CreateLabelDialog } from "./create-label-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LabelPickerProps {
  boardId: string;
  taskId: string;
  selectedLabels: TaskLabel[];
  onLabelsChange?: (labels: TaskLabel[]) => void;
  trigger?: React.ReactNode;
}

export function LabelPicker({
  boardId,
  taskId,
  selectedLabels,
  onLabelsChange,
  trigger,
}: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadLabels();
    }
  }, [open, boardId]);

  const loadLabels = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/labels`);
      if (!response.ok) throw new Error("Failed to load labels");
      const data = await response.json();
      setLabels(data);
    } catch (error) {
      console.error("Error loading labels:", error);
      toast.error("Failed to load labels");
    }
  };

  const filteredLabels = labels.filter((label) =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLabelSelected = (labelId: string) => {
    return selectedLabels.some((tl) => tl.labelId === labelId);
  };

  const toggleLabel = async (label: Label) => {
    const isSelected = isLabelSelected(label.id);
    setLoading(true);

    try {
      if (isSelected) {
        // Remove label
        const response = await fetch(
          `/api/tasks/${taskId}/labels/${label.id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) throw new Error("Failed to remove label");

        const updatedLabels = selectedLabels.filter(
          (tl) => tl.labelId !== label.id
        );
        onLabelsChange?.(updatedLabels);
        toast.success(`Removed label "${label.name}"`);
      } else {
        // Add label
        const response = await fetch(`/api/tasks/${taskId}/labels`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ labelId: label.id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Failed to add label";
          console.error("❌ Failed to add label:", errorMessage, "Status:", response.status);
          throw new Error(errorMessage);
        }

        const newTaskLabel = await response.json();
        onLabelsChange?.([...selectedLabels, newTaskLabel]);
        toast.success(`Added label "${label.name}"`);
      }
    } catch (error) {
      console.error("Error toggling label:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update label"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Tag className="h-4 w-4 mr-2" />
            Labels
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex flex-col">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm mb-2">Labels</h4>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredLabels.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {searchQuery ? "No labels found" : "No labels yet"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLabels.map((label) => {
                  const selected = isLabelSelected(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label)}
                      disabled={loading}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-left",
                        selected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-4 h-4 border rounded",
                          selected
                            ? "bg-primary border-primary"
                            : "border-input"
                        )}
                      >
                        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <LabelBadge label={label} variant="compact" />
                      {label.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {label.description}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-2 border-t">
            <CreateLabelDialog
              boardId={boardId}
              onLabelCreated={loadLabels}
              trigger={
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create new label
                </Button>
              }
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
