"use client";

import { useState, useEffect } from "react";
import { ChecklistCard } from "./checklist-card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { CreateChecklistDialog } from "./create-checklist-dialog";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import type { Checklist, ChecklistItem } from "./types";

interface ChecklistListProps {
  taskId: string;
  boardId: string;
}

export function ChecklistList({ taskId, boardId }: ChecklistListProps) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { isConnected, on, off } = useSocket();

  const loadChecklists = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklists`);
      if (!response.ok) throw new Error("Failed to load checklists");
      
      const data = await response.json();
      setChecklists(data);
    } catch (error) {
      console.error("Error loading checklists:", error);
      toast.error("Failed to load checklists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, [taskId]);

  // Real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const handleChecklistEvent = () => {
      loadChecklists();
    };

    on("checklist:created", handleChecklistEvent);
    on("checklist:updated", handleChecklistEvent);
    on("checklist:deleted", handleChecklistEvent);
    on("checklist:item:created", handleChecklistEvent);
    on("checklist:item:updated", handleChecklistEvent);
    on("checklist:item:deleted", handleChecklistEvent);
    on("checklist:item:checked", handleChecklistEvent);

    return () => {
      off("checklist:created", handleChecklistEvent);
      off("checklist:updated", handleChecklistEvent);
      off("checklist:deleted", handleChecklistEvent);
      off("checklist:item:created", handleChecklistEvent);
      off("checklist:item:updated", handleChecklistEvent);
      off("checklist:item:deleted", handleChecklistEvent);
      off("checklist:item:checked", handleChecklistEvent);
    };
  }, [isConnected, taskId, on, off]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      const childrenChecked = item.children?.filter((c: ChecklistItem) => c.checked).length || 0;
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
              onUpdate={loadChecklists}
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
        onSuccess={() => {
          loadChecklists();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
