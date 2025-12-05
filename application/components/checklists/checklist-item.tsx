"use client";

import { useState } from "react";
import { ChecklistItem } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  User,
  Calendar,
  Pencil,
  Trash2,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChecklistItemForm } from "./checklist-item-form";

interface ChecklistItemComponentProps {
  item: ChecklistItem;
  checklistId: string;
  taskId: string;
  onUpdate?: () => void;
  level?: number;
}

export function ChecklistItemComponent({
  item,
  checklistId,
  taskId,
  onUpdate,
  level = 0,
}: ChecklistItemComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  const [showChildren, setShowChildren] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !item.checked;

  const handleToggle = async () => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/checklists/${checklistId}/items/${item.id}/toggle`,
        {
          method: "POST",
        }
      );

      if (!response.ok) throw new Error("Failed to toggle item");

      toast.success(item.checked ? "Item unchecked" : "Item checked");
      onUpdate?.();
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("Failed to toggle item");
    }
  };

  const handleUpdate = async () => {
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/checklists/${checklistId}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) throw new Error("Failed to update item");

      toast.success("Item updated");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this item?")) return;

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/checklists/${checklistId}/items/${item.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete item");

      toast.success("Item deleted");
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleConvertToCard = async () => {
    toast.info("Converting to card...");
    // TODO: Implement conversion
  };

  return (
    <div className={cn("space-y-2", level > 0 && "ml-6")}>
      <div className="flex items-start gap-2 group hover:bg-accent/50 p-2 rounded-lg transition-colors">
        {/* Expand/Collapse for items with children */}
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowChildren(!showChildren)}
          >
            {showChildren ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Checkbox */}
        <Checkbox
          checked={item.checked}
          onCheckedChange={handleToggle}
          className={cn("mt-0.5", hasChildren && "ml-0", !hasChildren && "ml-8")}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate();
                  if (e.key === "Escape") {
                    setContent(item.content);
                    setIsEditing(false);
                  }
                }}
                className="h-8"
                autoFocus
              />
              <Button size="sm" onClick={handleUpdate}>
                Save
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div
                className={cn(
                  "text-sm break-words",
                  item.checked && "line-through text-muted-foreground"
                )}
              >
                {item.content}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                {item.assignee && (
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={item.assignee.image} />
                      <AvatarFallback className="text-xs">
                        {item.assignee.name?.charAt(0) || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {item.assignee.name}
                    </span>
                  </div>
                )}

                {item.dueDate && (
                  <Badge
                    variant={isOverdue ? "destructive" : "secondary"}
                    className="text-xs h-5"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(item.dueDate), "MMM d")}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAddChild(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add sub-item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleConvertToCard}>
              <CreditCard className="h-4 w-4 mr-2" />
              Convert to card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add Child Form */}
      {showAddChild && (
        <div className="ml-8">
          <ChecklistItemForm
            checklistId={checklistId}
            taskId={taskId}
            parentId={item.id}
            onSuccess={() => {
              setShowAddChild(false);
              setShowChildren(true);
              onUpdate?.();
            }}
            onCancel={() => setShowAddChild(false)}
          />
        </div>
      )}

      {/* Children */}
      {hasChildren && showChildren && (
        <div className="space-y-2">
          {item.children
            ?.sort((a, b) => a.position - b.position)
            .map((child) => (
              <ChecklistItemComponent
                key={child.id}
                item={child}
                checklistId={checklistId}
                taskId={taskId}
                onUpdate={onUpdate}
                level={level + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}
