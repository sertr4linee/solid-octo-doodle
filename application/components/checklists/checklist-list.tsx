"use client";

import { useState } from "react";
import { ChecklistCard } from "./checklist-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateChecklistDialog } from "./create-checklist-dialog";

interface Checklist {
  id: string;
  name: string;
  position: number;
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  position: number;
  assigneeId?: string;
  dueDate?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  children?: ChecklistItem[];
}

interface ChecklistListProps {
  taskId: string;
  boardId: string;
  checklists: Checklist[];
  onUpdate?: () => void;
}

export function ChecklistList({
  taskId,
  boardId,
  checklists,
  onUpdate,
}: ChecklistListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Calculate total progress
  const totalItems = checklists.reduce((sum, checklist) => {
    const count = checklist.items.reduce((itemSum, item) => {
      return itemSum + 1 + (item.children?.length || 0);
    }, 0);
    return sum + count;
  }, 0);

  const checkedItems = checklists.reduce((sum, checklist) => {
    const count = checklist.items.reduce((itemSum, item) => {
      const itemChecked = item.checked ? 1 : 0;
      const childrenChecked = item.children?.filter(c => c.checked).length || 0;
      return itemSum + itemChecked + childrenChecked;
    }, 0);
    return sum + count;
  }, 0);

  const overallProgress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      {checklists.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {checkedItems}/{totalItems} ({overallProgress}%)
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklists */}
      <div className="space-y-3">
        {checklists
          .sort((a, b) => a.position - b.position)
          .map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              taskId={taskId}
              boardId={boardId}
              onUpdate={onUpdate}
            />
          ))}
      </div>

      {/* Add Checklist Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Checklist
      </Button>

      {/* Create Dialog */}
      <CreateChecklistDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        taskId={taskId}
        onSuccess={onUpdate}
      />
    </div>
  );
}
