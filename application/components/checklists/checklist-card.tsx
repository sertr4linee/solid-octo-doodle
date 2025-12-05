"use client";

import { useState } from "react";
import { ChecklistItem as ChecklistItemType } from "./types";
import { ChecklistItemComponent } from "./checklist-item";
import { ChecklistItemForm } from "./checklist-item-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, MoreHorizontal, Pencil, Copy, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Checklist {
  id: string;
  name: string;
  position: number;
  items: ChecklistItemType[];
}

interface ChecklistCardProps {
  checklist: Checklist;
  taskId: string;
  boardId: string;
  onUpdate?: () => void;
}

export function ChecklistCard({
  checklist,
  taskId,
  boardId,
  onUpdate,
}: ChecklistCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(checklist.name);
  const [showAddItem, setShowAddItem] = useState(false);

  // Calculate progress
  const totalItems = checklist.items.reduce((sum, item) => {
    return sum + 1 + (item.children?.length || 0);
  }, 0);

  const checkedItems = checklist.items.reduce((sum, item) => {
    const itemChecked = item.checked ? 1 : 0;
    const childrenChecked = item.children?.filter((c: ChecklistItemType) => c.checked).length || 0;
    return sum + itemChecked + childrenChecked;
  }, 0);

  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const handleRename = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/checklists/${checklist.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );

      if (!response.ok) throw new Error("Failed to rename checklist");

      toast.success("Checklist renamed");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error renaming checklist:", error);
      toast.error("Failed to rename checklist");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this checklist?")) return;

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/checklists/${checklist.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete checklist");

      toast.success("Checklist deleted");
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting checklist:", error);
      toast.error("Failed to delete checklist");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") {
                      setName(checklist.name);
                      setIsEditing(false);
                    }
                  }}
                  className="h-8"
                  autoFocus
                />
                <Button size="sm" onClick={handleRename}>
                  Save
                </Button>
              </div>
            ) : (
              <h3 className="font-semibold">{checklist.name}</h3>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Copy to another card
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {checkedItems}/{totalItems}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Items */}
        {checklist.items
          .sort((a, b) => a.position - b.position)
          .map((item) => (
            <ChecklistItemComponent
              key={item.id}
              item={item}
              checklistId={checklist.id}
              taskId={taskId}
              onUpdate={onUpdate}
            />
          ))}

        {/* Add Item Form */}
        {showAddItem ? (
          <ChecklistItemForm
            checklistId={checklist.id}
            taskId={taskId}
            onSuccess={() => {
              setShowAddItem(false);
              onUpdate?.();
            }}
            onCancel={() => setShowAddItem(false)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowAddItem(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add item
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
